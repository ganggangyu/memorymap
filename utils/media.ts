import JSZip from 'jszip';
import { isR2Configured, uploadFileToR2, uploadBase64ToR2 } from '../r2';
import { MemoryEvent } from '../types';
import { sortEventsAscending } from '../utils';

export interface MediaUploadCount {
  images: number;
  audio: number;
  video: number;
}

const newEventId = () => `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const processImageUrls = async (
  imageUrls: string[],
  zip: JSZip | null,
  useR2: boolean,
): Promise<{ urls: string[]; count: number }> => {
  let count = 0;
  const out: string[] = [];

  for (const url of imageUrls) {
    if (zip && url.startsWith('media/')) {
      const f = zip.file(url);
      if (f) {
        try {
          const blob = await f.async('blob');
          if (useR2) {
            const ext = url.split('.').pop() || 'jpg';
            const r2Url = await uploadFileToR2(blob, ext);
            if (r2Url) { out.push(r2Url); count++; }
            else { out.push(await blobToBase64(blob)); }
          } else {
            out.push(await blobToBase64(blob));
          }
        } catch (e) { console.warn('img restore fail:', url, e); }
      }
    } else if (url.startsWith('data:')) {
      if (useR2) {
        const ext = url.includes('image/png') ? 'png' : 'jpg';
        const r2Url = await uploadBase64ToR2(url, ext);
        if (r2Url) { out.push(r2Url); count++; }
        else { out.push(url); }
      } else {
        out.push(url);
      }
    } else if (url.startsWith('media/') && !zip) {
      continue; // 死路径，跳过
    } else {
      out.push(url); // http URL 或其它
    }
  }
  return { urls: out, count };
};

const processMediaField = async (
  url: string | undefined,
  field: 'audio' | 'video',
  zip: JSZip | null,
  useR2: boolean,
): Promise<{ url: string | undefined; count: number }> => {
  if (!url || typeof url !== 'string') return { url, count: 0 };
  let count = 0;
  let out = url;

  if (zip && url.startsWith('media/')) {
    const f = zip.file(url);
    if (f) {
      try {
        const blob = await f.async('blob');
        if (useR2) {
          const ext = url.split('.').pop() || (field === 'audio' ? 'mp3' : 'mp4');
          const r2Url = await uploadFileToR2(blob, ext);
          if (r2Url) { out = r2Url; count++; }
          else { out = await blobToBase64(blob); }
        } else {
          out = await blobToBase64(blob);
        }
      } catch (e) { console.warn(`${field} restore fail:`, url, e); out = undefined; }
    }
  } else if (url.startsWith('data:')) {
    if (useR2) {
      const ext = field === 'audio' ? 'mp3' : 'mp4';
      const r2Url = await uploadBase64ToR2(url, ext);
      if (r2Url) { out = r2Url; count++; }
    }
  } else if (url.startsWith('media/') && !zip) {
    return { url: undefined, count: 0 };
  }
  return { url: out, count };
};

const sanitizeEvent = (event: any): MemoryEvent => ({
  id: event.id || newEventId(),
  tags: event.tags || [],
  title: event.title || '未命名回忆',
  date: event.date || new Date().toISOString().split('T')[0],
  shortDescription: event.shortDescription || '',
  longDescription: event.longDescription || '',
  location: event.location || { name: '未知地点', coords: [0, 0] },
  imageUrls: event.imageUrls || [],
  audioUrl: event.audioUrl,
  videoUrl: event.videoUrl,
  isSystemEvent: event.isSystemEvent || false,
});

export const exportEventsToZip = async (events: MemoryEvent[]): Promise<void> => {
  const zip = new JSZip();
  const mf = zip.folder('media');
  const list = JSON.parse(JSON.stringify(events)) as MemoryEvent[];
  let n = 0;

  for (const ev of list) {
    if (ev.imageUrls?.length) {
      const paths: string[] = [];
      for (const url of ev.imageUrls) {
        if (url.startsWith('data:')) {
          const fn = `img_${ev.id}_${n++}.jpg`;
          mf?.file(fn, url.split(',')[1], { base64: true });
          paths.push(`media/${fn}`);
        } else { paths.push(url); }
      }
      ev.imageUrls = paths;
    }
    if (ev.audioUrl?.startsWith('data:')) {
      const fn = `audio_${ev.id}.mp3`;
      mf?.file(fn, ev.audioUrl.split(',')[1], { base64: true });
      ev.audioUrl = `media/${fn}`;
    }
    if (ev.videoUrl?.startsWith('data:')) {
      const fn = `video_${ev.id}.mp4`;
      mf?.file(fn, ev.videoUrl.split(',')[1], { base64: true });
      ev.videoUrl = `media/${fn}`;
    }
  }

  zip.file('data.json', JSON.stringify(list));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `romantic-journey-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importEventsFromFile = async (
  file: Blob | File,
): Promise<{ events: MemoryEvent[]; mediaCount: MediaUploadCount }> => {
  const useR2 = isR2Configured();

  const mc: MediaUploadCount = { images: 0, audio: 0, video: 0 };
  let raw: any;
  const name = file instanceof File ? file.name : 'unknown';
  const isZip = name.endsWith('.zip') || file.type === 'application/zip';

  if (isZip) {
    try {
      const zip = await JSZip.loadAsync(file);
      const jf = zip.file('data.json');
      if (!jf) throw new Error('ZIP 中找不到 data.json');
      const json = await jf.async('string');
      raw = JSON.parse(json);
      if (Array.isArray(raw)) {
        for (const ev of raw) {
          if (ev.imageUrls?.length) {
            const r = await processImageUrls(ev.imageUrls, zip, useR2);
            ev.imageUrls = r.urls; mc.images += r.count;
          }
          if (ev.audioUrl) {
            const r = await processMediaField(ev.audioUrl, 'audio', zip, useR2);
            ev.audioUrl = r.url; mc.audio += r.count;
          }
          if (ev.videoUrl) {
            const r = await processMediaField(ev.videoUrl, 'video', zip, useR2);
            ev.videoUrl = r.url; mc.video += r.count;
          }
        }
      }
    } catch {
      console.log('不是 ZIP，尝试 JSON...');
      const text = await (file as Blob).text();
      raw = JSON.parse(text);
    }
  } else {
    const text = await (file as Blob).text();
    raw = JSON.parse(text);
  }

  if (!Array.isArray(raw)) throw new Error('导入数据格式错误：需要数组格式');

  // JSON 导入时也处理 base64 → R2 上传
  if (useR2) {
    for (const ev of raw) {
      if (ev.imageUrls?.length) {
        const r = await processImageUrls(ev.imageUrls, null, true);
        ev.imageUrls = r.urls; mc.images += r.count;
      }
      if (ev.audioUrl) {
        const r = await processMediaField(ev.audioUrl, 'audio', null, true);
        ev.audioUrl = r.url; mc.audio += r.count;
      }
      if (ev.videoUrl) {
        const r = await processMediaField(ev.videoUrl, 'video', null, true);
        ev.videoUrl = r.url; mc.video += r.count;
      }
    }
  }

  return { events: raw.map(sanitizeEvent), mediaCount: mc };
};

export const buildImportSuccessMessage = (
  result: { total: number; success: number; failed: number },
  mediaCount: MediaUploadCount,
): string => {
  let msg = `数据导入成功！\n共 ${result.total} 条数据`;
  const m = mediaCount;
  const parts: string[] = [];
  if (m.images) parts.push(`图片: ${m.images} 张`);
  if (m.audio) parts.push(`音频: ${m.audio} 个`);
  if (m.video) parts.push(`视频: ${m.video} 个`);
  if (parts.length) msg += `\n上传到 R2: ${parts.join(', ')}`;
  return msg;
};
