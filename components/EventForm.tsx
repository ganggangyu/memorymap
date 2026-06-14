
import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { MemoryEvent, PRESET_TAGS } from '../types';
import { MapPinIcon, CalendarIcon, TrashIcon, XIcon, PlusIcon, VideoIcon, LivePhotoIcon, SparklesIcon, CloudIcon, SpeakerWaveIcon, MusicNoteIcon, PhotoIcon, CheckIcon } from './icons';
import DatePicker from './DatePicker';
import { isValidCoords } from '../utils';
import { uploadBase64ToR2, uploadFileToR2, isR2Configured, listR2Files } from '../r2';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { getTagConfig } from '../utils/tagConfig';

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Omit<MemoryEvent, 'id'>, id?: string) => void;
  eventToEdit: MemoryEvent | null;
  initialCoords: [number, number] | null;
  initialLocationName?: string;
  initialDate?: string;
  onLocationUpdate: (coords: [number, number]) => void;
  onPickLocation: (currentData: Partial<MemoryEvent>) => void;
  defaultIsMilestone?: boolean;
  initialData?: Partial<MemoryEvent> | null;
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return reject(new Error("FileReader failed"));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round(width * (maxWidth / height));
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context error'));
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const extractVideoFromMotionPhoto = async (file: File): Promise<string | null> => {
    try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const ftyp = [0x66, 0x74, 0x79, 0x70];
        for (let i = bytes.length - 4; i > 0; i--) {
            if (bytes[i] === ftyp[0] && bytes[i+1] === ftyp[1] && bytes[i+2] === ftyp[2] && bytes[i+3] === ftyp[3]) {
                const videoStart = i - 4;
                if (videoStart < 0) continue;
                const videoData = bytes.subarray(videoStart);
                const blob = new Blob([videoData], { type: 'video/mp4' });
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }
        }
    } catch (e) {}
    return null;
};

const videoToGif = async (videoDataUrl: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = videoDataUrl;
      // Wait for enough data to decode the first frame
      video.oncanplay = async () => {
        try {
          const duration = Math.min(video.duration || 3, 3);
          // Use 80% of original for high quality, 24fps for smooth motion
          const canvasW = Math.round(video.videoWidth * 0.8);
          const canvasH = Math.round(video.videoHeight * 0.8);
          const fps = 24;
          const frameCount = Math.max(2, Math.floor(duration * fps));
          const delay = Math.round((duration / frameCount) * 100);

          const canvas = document.createElement('canvas');
          canvas.width = canvasW;
          canvas.height = canvasH;
          const ctx = canvas.getContext('2d')!;

          // Seek to first frame and wait for it to actually render
          video.currentTime = 0;
          // On some browsers seeked fires before the frame is painted — poll until we get non-black pixels
          let firstData: ImageData | null = null;
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise<void>(r => { video.onseeked = () => { setTimeout(r, 50); }; });
            ctx.drawImage(video, 0, 0, canvasW, canvasH);
            const d = ctx.getImageData(0, 0, canvasW, canvasH);
            // Check if frame has any non-black content
            const pixels = d.data;
            let hasColor = false;
            for (let p = 0; p < Math.min(pixels.length, 400); p += 4) {
              if (pixels[p] > 16 || pixels[p+1] > 16 || pixels[p+2] > 16) { hasColor = true; break; }
            }
            if (hasColor) { firstData = d; break; }
            video.currentTime = 0; // re-seek on failure
          }
          if (!firstData) {
            // Fallback: just use whatever we have
            await new Promise<void>(r => { video.onseeked = () => r(); });
            ctx.drawImage(video, 0, 0, canvasW, canvasH);
            firstData = ctx.getImageData(0, 0, canvasW, canvasH);
          }

          const palette = quantize(firstData.data, 256);

          const gif = GIFEncoder();
          for (let i = 0; i < frameCount; i++) {
            video.currentTime = i * (duration / frameCount);
            await new Promise<void>(r => { video.onseeked = () => { setTimeout(r, 50); }; });
            ctx.drawImage(video, 0, 0, canvasW, canvasH);
            const frameData = ctx.getImageData(0, 0, canvasW, canvasH);
            const index = applyPalette(new Uint8ClampedArray(frameData.data), palette);
            gif.writeFrame(index, canvasW, canvasH, { palette, delay });
          }
          gif.finish();

          const blob = new Blob([gif.bytes()], { type: 'image/gif' });
          URL.revokeObjectURL(video.src);
          resolve(blob);
        } catch {
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      };
      video.onerror = () => { URL.revokeObjectURL(video.src); resolve(null); };
      // Also handle the case where video loads instantly (already cached)
      if (video.readyState >= 2) {
        video.oncanplay = null;
        const handler = video.oncanplay as any;
        if (handler) handler();
      }
    });
  };



// --- Tag Input Component · 小红书风格 ---
const TagInput: React.FC<{
  tags: string[];
  onChange: (tags: string[]) => void;
}> = ({ tags, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 未被选中的预设 + 所有历史用过的标签（去重）
  const quickTags = PRESET_TAGS.filter(t => !tags.includes(t));

  // 搜索过滤：支持拼音首字母模糊
  const searchLower = inputValue.trim().toLowerCase();
  const filteredSuggestions = searchLower
    ? quickTags.filter(t => t.toLowerCase().includes(searchLower))
    : quickTags;

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showCreateBtn = inputValue.trim() && !quickTags.includes(inputValue.trim() as any) && !tags.includes(inputValue.trim());

  return (
    <div ref={containerRef} className="space-y-2">
      {/* 输入行 — # 前缀 */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-seal-400/50 focus-within:border-seal-400 transition-all">
        {/* 已选标签芯片 */}
        {tags.map(tag => {
          const cfg = getTagConfig(tag);
          return (
            <span key={tag}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm animate-fadeIn"
              style={{ backgroundColor: cfg.color }}
            >
              {cfg.emoji} {cfg.label}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors">
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        {/* 输入框 — # 前缀 + 移动端添加按钮 */}
        <span className="text-seal-400 font-bold text-sm ml-0.5 select-none">#</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? '输入任意标签' : ''}
          className="flex-1 min-w-[60px] outline-none text-sm bg-transparent"
        />
        {/* 移动端确认按钮：有输入内容时显示 */}
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => addTag(inputValue.trim())}
            className="shrink-0 w-7 h-7 rounded-full bg-seal-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 快捷标签 — 小红书式小圆角按钮 */}
      <div className="flex flex-wrap gap-1.5">
        {quickTags.slice(0, 6).map(tag => {
          const cfg = getTagConfig(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:border-seal-300 hover:bg-seal-50 hover:text-seal-600 active:scale-95 transition-all"
            >
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* 搜索建议下拉 */}
      {showSuggestions && filteredSuggestions.length > 0 && searchLower && (
        <div className="absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-44 overflow-y-auto animate-fadeIn">
          {filteredSuggestions.map(tag => {
            const cfg = getTagConfig(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full text-left px-3 py-2.5 hover:bg-seal-50 flex items-center gap-2 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <span className="text-base">{cfg.emoji}</span>
                <span className="font-medium text-gray-700"># {cfg.label}</span>
              </button>
            );
          })}
          {showCreateBtn && (
            <button
              type="button"
              onClick={() => addTag(inputValue.trim())}
              className="w-full text-left px-3 py-2.5 hover:bg-seal-50 flex items-center gap-2 text-sm border-t border-gray-100 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-seal-100 flex items-center justify-center text-xs">+</span>
              <span className="font-medium text-seal-600">创建标签 "{inputValue.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const EventForm: React.FC<EventFormProps> = ({
    isOpen, onClose, onSave, eventToEdit, initialCoords, initialLocationName,
    initialDate, onLocationUpdate, onPickLocation, defaultIsMilestone, initialData
}) => {
  const [formData, setFormData] = useState({
    title: '', date: '', time: '', tags: [] as string[], locationName: '',
    shortDescription: '', longDescription: '', imageUrls: [] as string[], audioUrl: '', videoUrl: '', livePhotoUrl: '',
    isMilestone: false,
  });
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isUnlockDatePickerOpen, setIsUnlockDatePickerOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadLabel, setMediaUploadLabel] = useState<string>('');
  const useCloud = isR2Configured();

  // R2 photo picker state
  const [showR2Picker, setShowR2Picker] = useState(false);
  const [r2Photos, setR2Photos] = useState<{key:string; url:string; size:number; lastModified:string}[]>([]);
  const [r2PhotoLoading, setR2PhotoLoading] = useState(false);
  const [r2PreviewUrl, setR2PreviewUrl] = useState<string | null>(null);
  const r2PageRef = useRef(0);
  const allR2PhotosRef = useRef<{key:string; url:string; size:number; lastModified:string}[]>([]);
  const R2_PAGE_SIZE = 100;
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [touchDragIdx, setTouchDragIdx] = useState<number | null>(null);
  const touchDragRef = useRef<{ fromIdx: number; targetIdx: number } | null>(null);
  const [selectedR2Urls, setSelectedR2Urls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const defaultDate = today.toISOString().split('T')[0];

      let baseData = {
          title: '',
          date: initialDate || defaultDate,
          time: '',
          tags: [] as string[],
          locationName: initialLocationName || '',
          shortDescription: '',
          longDescription: '',
          imageUrls: [] as string[],
          audioUrl: '',
          videoUrl: '',
          livePhotoUrl: '',
          isMilestone: defaultIsMilestone ?? false,
      };

      if (initialData) {
          const initTags = initialData.tags || [];
          if (initialData.isMilestone && !initTags.includes('里程碑')) {
            initTags.push('里程碑');
          }
          baseData = { ...baseData, ...initialData, tags: initTags };
          if (initialData.location?.name) baseData.locationName = initialData.location.name;
      } else if (eventToEdit) {
          const editTags = [...(eventToEdit.tags || [])];
          baseData = {
              title: eventToEdit.title,
              date: eventToEdit.date,
              time: eventToEdit.time || '',
              tags: editTags,
              locationName: eventToEdit.location.name,
              shortDescription: eventToEdit.shortDescription,
              longDescription: eventToEdit.longDescription || '',
              imageUrls: eventToEdit.imageUrls || [],
              audioUrl: eventToEdit.audioUrl || '',
              videoUrl: eventToEdit.videoUrl || '',
              livePhotoUrl: eventToEdit.livePhotoUrl || '',
              isMilestone: editTags.includes('里程碑'),
          };
      }

      // 默认里程碑选中时自动加标签
      if (baseData.isMilestone && !baseData.tags.includes('里程碑')) {
        baseData.tags.push('里程碑');
      }

      setFormData(baseData);
      setCoords(initialCoords || eventToEdit?.location.coords || null);
      setShowR2Picker(false);
      setSelectedR2Urls(new Set());
      allR2PhotosRef.current = [];
      r2PageRef.current = 0;
    }
  }, [isOpen, eventToEdit, initialData, initialCoords]);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsCompressing(true);
      setUploadedPreviews([]);
      const files = Array.from(e.target.files);
      const totalSteps = files.length + (useCloud ? files.length : 0); // compress + upload
      let step = 0;
      const updatePct = (label: string) => {
        step++;
        setUploadPercent(Math.round((step / totalSteps) * 100));
        setUploadProgress(label);
      };
      try {
        const batchSize = 3;
        const pendingGifs: { video: string; compressed: string }[] = [];
        let firstLiveVideo: string | null = null;
        const allPreviews: string[] = [];

        for (let batchStart = 0; batchStart < files.length; batchStart += batchSize) {
          const batch = files.slice(batchStart, batchStart + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (file) => {
              let liveVideo: string | null = null;
              if (file.type === 'image/jpeg' || file.type === 'image/heic' ||
                  file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
                liveVideo = await extractVideoFromMotionPhoto(file);
              }
              if (file.type === 'image/gif') {
                const d = await readFileAsDataURL(file);
                return { data: d, liveVideo: null };
              }
              if (liveVideo && useCloud) {
                const compressed = await compressImage(file, 800, 0.6);
                pendingGifs.push({ video: liveVideo, compressed });
                if (!firstLiveVideo) firstLiveVideo = liveVideo;
                return { data: null, liveVideo };
              }
              const data = await compressImage(file, 800, 0.6);
              return { data, liveVideo };
            })
          );

          for (const result of batchResults) {
            if (result.data !== null) {
              allPreviews.push(result.data);
              setUploadedPreviews([...allPreviews]);
            }
            updatePct(`压缩 ${step}/${files.length}`);
          }
        }

        // Convert Live Photos to GIF
        for (const g of pendingGifs) {
          updatePct('Live Photo → GIF');
          const gifBlob = await videoToGif(g.video);
          if (gifBlob) {
            const gifUrl = await uploadFileToR2(gifBlob, 'gif');
            if (gifUrl) {
              allPreviews.push(gifUrl);
              setUploadedPreviews([...allPreviews]);
            } else {
              allPreviews.push(g.compressed);
              setUploadedPreviews([...allPreviews]);
            }
          } else {
            allPreviews.push(g.compressed);
            setUploadedPreviews([...allPreviews]);
          }
        }

        if (firstLiveVideo) {
          setFormData(prev => prev.livePhotoUrl ? prev : { ...prev, livePhotoUrl: firstLiveVideo });
        }

        if (useCloud) {
          const finalUrls: string[] = [];
          for (let i = 0; i < allPreviews.length; i++) {
            const url = allPreviews[i];
            if (url.startsWith('http')) {
              // Already R2 URL (gif)
              finalUrls.push(url);
            } else {
              const r2Url = await uploadBase64ToR2(url);
              if (r2Url) {
                finalUrls.push(r2Url);
              } else {
                finalUrls.push(url);
              }
            }
            updatePct(`上传 ${i + 1}/${allPreviews.length}`);
          }
          setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...finalUrls] }));
        } else {
          setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...allPreviews] }));
        }
        setUploadProgress('');
        setUploadPercent(0);
      } catch (error) {
        alert("图片处理失败");
        setUploadPercent(0);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleVideoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    setMediaUploadLabel('正在处理视频...');
    try {
      if (useCloud) {
        setMediaUploadLabel('正在上传视频到 R2...');
        const url = await uploadFileToR2(file);
        if (url) {
          setFormData(prev => ({ ...prev, videoUrl: url }));
        }
      } else {
        if (file.size > 50 * 1024 * 1024) {
          alert('视频文件超过 50MB，建议配置云存储后上传。本地模式仅适合小视频。');
        }
        const dataUrl = await readFileAsDataURL(file);
        setFormData(prev => ({ ...prev, videoUrl: dataUrl }));
      }
    } catch {
      alert('视频处理失败');
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadLabel('');
    }
  };

  const handleAudioChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    setMediaUploadLabel('正在处理音频...');
    try {
      if (useCloud) {
        setMediaUploadLabel('正在上传音频到 R2...');
        const url = await uploadFileToR2(file);
        if (url) {
          setFormData(prev => ({ ...prev, audioUrl: url }));
        }
      } else {
        const dataUrl = await readFileAsDataURL(file);
        setFormData(prev => ({ ...prev, audioUrl: dataUrl }));
      }
    } catch {
      alert('音频处理失败');
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadLabel('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidCoords(coords)) return alert("请选择地点");

    // 同步 isMilestone ↔ 标签
    const finalTags = [...formData.tags];
    if (formData.isMilestone && !finalTags.includes('里程碑')) {
      finalTags.push('里程碑');
    }
    if (!formData.isMilestone) {
      // 不自动删除里程碑标签：用户可能手动加过
    }

    onSave({
      title: formData.title,
      date: formData.date,
      time: formData.time || undefined,
      tags: finalTags,
      shortDescription: formData.shortDescription,
      longDescription: formData.longDescription,
      location: { name: formData.locationName, coords: coords! },
      imageUrls: formData.imageUrls,
      audioUrl: formData.audioUrl || undefined,
      videoUrl: formData.videoUrl || undefined,
      livePhotoUrl: formData.livePhotoUrl || undefined,
    }, eventToEdit?.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[4000] flex justify-center items-end md:items-center p-0 md:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-paper-surface w-full max-w-3xl flex flex-col h-[100dvh] md:h-auto md:max-h-[90vh] md:rounded-lg shadow-2xl overflow-hidden rounded-t-2xl" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <div className="p-4 md:p-6 border-b shrink-0 flex justify-between items-center bg-paper-cream/50 pt-12 safe-area-top">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">{eventToEdit ? '编辑回忆' : '添加新回忆'}</h2>
              <button type="button" onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full md:hidden"><XIcon className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  <div className="md:col-span-2 flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 mb-2">
                      {useCloud ? (
                          <>
                            <CloudIcon className="w-4 h-4 text-orange-500" />
                            <p className="text-[10px] md:text-xs text-orange-700 font-medium">🌩️ R2 存储：照片上传 Cloudflare R2，免流出流量费。</p>
                          </>
                      ) : (
                          <>
                            <SparklesIcon className="w-4 h-4 text-blue-500" />
                            <p className="text-[10px] md:text-xs text-blue-700 font-medium">💾 本地存储：照片存手机本地。可在「数据管理」配置云存储。</p>
                          </>
                      )}
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">标题</label>
                    <input type="text" name="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">标签</label>
                    <TagInput tags={formData.tags} onChange={(tags) => setFormData({...formData, tags})} />
                    <p className="text-[10px] text-gray-400 mt-1">可多选或输入自定义标签，按 Enter 添加</p>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">日期</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">时间 <span className="text-gray-400 font-normal text-xs">(可选)</span></label>
                    <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">地点</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.locationName} onChange={(e) => setFormData({...formData, locationName: e.target.value})} placeholder={coords ? `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}` : '输入地名或在地图上选择'} className="mt-1 block flex-1 border-gray-300 rounded-md shadow-sm p-2" />
                      <button type="button" onClick={() => onPickLocation(formData)} className="mt-1 shrink-0 px-4 py-2.5 bg-seal-500 text-white text-sm rounded-xl font-bold active:scale-95 transition-transform shadow-md flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4" /> 地图选点
                      </button>
                    </div>
                    {coords && <p className="text-xs text-green-600 mt-1">✅ 已定位: {coords[0].toFixed(4)}, {coords[1].toFixed(4)}</p>}
                    {!coords && !eventToEdit && <p className="text-xs text-amber-600 mt-1">⚠️ 请在地图上选择回忆的地点</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">心情/描述</label>
                    <textarea name="shortDescription" value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 h-20" required placeholder="写下那一刻的心情..." />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">照片墙 <span className="text-[10px] text-gray-300 font-normal ml-1">长按拖动排序</span></label>
                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {formData.imageUrls.map((url, index) => (
                          <div key={index}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', String(index));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(index); }}
                            onDragLeave={() => setDragOverIdx(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverIdx(null);
                              const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                              if (isNaN(fromIdx) || fromIdx === index) return;
                              const newUrls = [...formData.imageUrls];
                              const [moved] = newUrls.splice(fromIdx, 1);
                              newUrls.splice(index, 0, moved);
                              setFormData({ ...formData, imageUrls: newUrls });
                            }}
                            onTouchStart={() => {
                              touchDragRef.current = { fromIdx: index, targetIdx: index };
                              setTouchDragIdx(index);
                            }}
                            onTouchMove={(e) => {
                              if (touchDragRef.current === null) return;
                              const touch = e.touches[0];
                              const el = document.elementFromPoint(touch.clientX, touch.clientY);
                              const gridItem = el?.closest('[data-photo-index]');
                              if (gridItem) {
                                const targetIdx = parseInt(gridItem.getAttribute('data-photo-index') || '-1');
                                if (targetIdx >= 0 && targetIdx !== touchDragRef.current.targetIdx) {
                                  touchDragRef.current.targetIdx = targetIdx;
                                  setTouchDragIdx(targetIdx);
                                }
                              }
                            }}
                            onTouchEnd={() => {
                              if (touchDragRef.current === null) { setTouchDragIdx(null); return; }
                              const { fromIdx, targetIdx } = touchDragRef.current;
                              touchDragRef.current = null;
                              setTouchDragIdx(null);
                              if (fromIdx === targetIdx) return;
                              const newUrls = [...formData.imageUrls];
                              const [moved] = newUrls.splice(fromIdx, 1);
                              newUrls.splice(targetIdx, 0, moved);
                              setFormData({ ...formData, imageUrls: newUrls });
                            }}
                            data-photo-index={index}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing touch-manipulation select-none ${touchDragIdx === index ? 'border-seal-400 scale-105 shadow-lg z-10' : dragOverIdx === index ? 'border-seal-400 scale-105 shadow-lg z-10' : 'border-gray-200'}`}>
                            <img src={url} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                            <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow">{index + 1}</span>
                            <button type="button" onClick={() => setFormData({...formData, imageUrls: formData.imageUrls.filter((_, i) => i !== index)})} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 shadow"><XIcon className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => document.getElementById('file-upload')?.click()} className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-seal-400 hover:text-ink-400 transition-colors">
                            <PlusIcon className="w-6 h-6" />
                        </button>
                        <button type="button" onClick={() => {
                            setShowR2Picker(true);
                            setSelectedR2Urls(new Set());
                            r2PageRef.current = 0;
                            if (allR2PhotosRef.current.length > 0) {
                              setR2Photos(allR2PhotosRef.current.slice(0, R2_PAGE_SIZE));
                            } else {
                              setR2PhotoLoading(true);
                              listR2Files()
                                .then(photos => {
                                  allR2PhotosRef.current = photos;
                                  setR2Photos(photos.slice(0, R2_PAGE_SIZE));
                                  setR2PhotoLoading(false);
                                })
                                .catch(() => setR2PhotoLoading(false));
                            }
                        }} className="aspect-square border-2 border-dashed border-orange-300 rounded-lg flex flex-col items-center justify-center text-orange-400 hover:border-orange-500 hover:text-orange-500 transition-colors">
                            <PhotoIcon className="w-5 h-5 mb-0.5" />
                            <span className="text-[9px] font-medium">R2</span>
                        </button>
                    </div>
                    <input id="file-upload" type="file" accept="image/*,.jpg,.jpeg,.heic,.heif" multiple onChange={handleImageChange} className="hidden" />
                    {isCompressing && <p className="mt-2 text-xs text-seal-500 animate-pulse font-bold">✨ 正在处理照片中...</p>}
                    {uploadProgress && (
                      <div className="mt-2 space-y-2">
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${uploadPercent || 10}%` }} />
                        </div>
                        <p className="text-xs text-blue-600 font-bold text-center">☁️ {uploadProgress} ({uploadPercent}%)</p>
                        {/* Thumbnail previews */}
                        {uploadedPreviews.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {uploadedPreviews.map((url, i) => (
                              <div key={i} className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                <img src={url} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* R2 Photo Picker Panel */}
                    {showR2Picker && (
                      <div className="mt-3 p-3 border border-orange-200 rounded-xl bg-orange-50/50 animate-fadeIn space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-700">🖼️ 从 R2 挑选照片</span>
                          <button type="button" onClick={() => setShowR2Picker(false)} className="text-orange-400 hover:text-orange-600"><XIcon className="w-4 h-4" /></button>
                        </div>
                        {r2PhotoLoading ? (
                          <div className="flex flex-col items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-3 border-orange-500 border-t-transparent mb-2" />
                            <span className="text-[10px] text-orange-400">加载中...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-[10px] text-orange-600">
                              <button type="button" onClick={() => setSelectedR2Urls(new Set(r2Photos.map(p => p.url)))} className="font-medium underline">全选</button>
                              <span>|</span>
                              <button type="button" onClick={() => setSelectedR2Urls(new Set())} className="text-orange-400 underline">取消全选</button>
                              <span className="ml-auto">{selectedR2Urls.size} 已选</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar"
                              onScroll={(e) => {
                                const el = e.currentTarget;
                                if (el.scrollHeight - el.scrollTop - el.clientHeight < 40 && !r2PhotoLoading) {
                                  const nextPage = r2PageRef.current + 1;
                                  const start = nextPage * R2_PAGE_SIZE;
                                  if (start >= allR2PhotosRef.current.length) return;
                                  setR2PhotoLoading(true);
                                  r2PageRef.current = nextPage;
                                  setR2Photos(allR2PhotosRef.current.slice(0, (nextPage + 1) * R2_PAGE_SIZE));
                                  setR2PhotoLoading(false);
                                }
                              }}>
                              {r2Photos.map(photo => (
                                <div key={photo.key}
                                  onClick={(e) => {
                                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                      // Hold modifier to select
                                      setSelectedR2Urls(prev => { const n = new Set(prev); if (n.has(photo.url)) n.delete(photo.url); else n.add(photo.url); return n; });
                                    } else {
                                      // Tap to preview, long press to select
                                      setR2PreviewUrl(photo.url);
                                    }
                                  }}
                                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedR2Urls.has(photo.url) ? 'border-orange-500 shadow-md scale-[0.95]' : 'border-gray-200 hover:border-orange-300'}`}>
                                  <img src={photo.url} className="w-full h-full object-cover" loading="lazy" />
                                  {selectedR2Urls.has(photo.url) && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                      <CheckIcon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setSelectedR2Urls(prev => { const n = new Set(prev); if (n.has(photo.url)) n.delete(photo.url); else n.add(photo.url); return n; }); }}
                                    className={`absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow transition-colors ${selectedR2Urls.has(photo.url) ? 'bg-orange-500' : 'bg-black/40'}`}>
                                    {selectedR2Urls.has(photo.url) ? '✓' : '+'}
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button type="button"
                              disabled={selectedR2Urls.size === 0}
                              onClick={() => {
                                const existing = new Set(formData.imageUrls);
                                selectedR2Urls.forEach(u => existing.add(u));
                                setFormData({ ...formData, imageUrls: Array.from(existing) });
                                setShowR2Picker(false);
                                setSelectedR2Urls(new Set());
                              }}
                              className="w-full py-2 bg-orange-500 text-white text-xs font-bold rounded-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              添加选中照片 ({selectedR2Urls.size})
                            </button>
                          </>
                        )}

                        {/* R2 Photo Fullscreen Preview */}
                        {r2PreviewUrl && (
                          <div className="fixed inset-0 z-[8000] bg-black/95 flex items-center justify-center animate-fadeIn"
                            onClick={() => setR2PreviewUrl(null)}>
                            <button type="button" onClick={() => setR2PreviewUrl(null)}
                              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white"><XIcon className="w-6 h-6" /></button>
                            <img src={r2PreviewUrl} className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
                              onClick={e => e.stopPropagation()} />
                            <div className="absolute bottom-8 flex gap-3">
                              <button type="button"
                                onClick={(e) => { e.stopPropagation(); if (r2PreviewUrl) { setSelectedR2Urls(prev => { const n = new Set(prev); if (n.has(r2PreviewUrl)) n.delete(r2PreviewUrl); else n.add(r2PreviewUrl); return n; }); } }}
                                className={`px-5 py-2.5 rounded-full text-sm font-bold ${selectedR2Urls.has(r2PreviewUrl) ? 'bg-orange-500 text-white' : 'bg-white/20 text-white'}`}>
                                {selectedR2Urls.has(r2PreviewUrl) ? '✓ 已选中' : '选择这张'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 视频上传 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">🎬 视频</label>
                    <div className="mt-2">
                      {formData.videoUrl ? (
                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                          <video src={formData.videoUrl} controls className="w-full max-h-48 object-contain bg-black" />
                          <button type="button" onClick={() => setFormData({...formData, videoUrl: ''})} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
                            <XIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => document.getElementById('video-upload')?.click()} className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-seal-400 hover:text-ink-400 transition-colors w-full justify-center">
                          <VideoIcon className="w-5 h-5" />
                          <span className="text-sm">点击上传视频</span>
                        </button>
                      )}
                    </div>
                    <input id="video-upload" type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                  </div>

                  {/* 语音/音频上传 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">🎵 语音/音频</label>
                    <div className="mt-2">
                      {formData.audioUrl ? (
                        <div className="relative flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <SpeakerWaveIcon className="w-6 h-6 text-seal-500" />
                          <audio src={formData.audioUrl} controls className="flex-1 h-8" />
                          <button type="button" onClick={() => setFormData({...formData, audioUrl: ''})} className="shrink-0 bg-gray-200 hover:bg-gray-300 text-gray-500 rounded-full p-1">
                            <XIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => document.getElementById('audio-upload')?.click()} className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-seal-400 hover:text-ink-400 transition-colors w-full justify-center">
                          <MusicNoteIcon className="w-5 h-5" />
                          <span className="text-sm">点击上传语音/音频</span>
                        </button>
                      )}
                    </div>
                    <input id="audio-upload" type="file" accept="audio/*" onChange={handleAudioChange} className="hidden" />
                    {isUploadingMedia && <p className="mt-2 text-xs text-blue-500 animate-pulse font-bold">☁️ {mediaUploadLabel}</p>}
                  </div>
                </div>
            </div>

            <div className="p-4 bg-paper-cream border-t flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">取消</button>
                <button type="submit" className="px-6 py-2 bg-seal-500 text-white rounded-lg font-bold shadow-lg shadow-seal-100 active:scale-95 transition-all">保存回忆</button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
