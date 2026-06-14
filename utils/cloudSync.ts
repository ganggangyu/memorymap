// 云端数据同步 — 文字数据备份到 R2，两人共享
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Config, getR2Client } from '../r2';

const CLOUD_KEY = 'backup/data.json';

function collectAllData(): string {
  const events = localStorage.getItem('romantic_journey_local_events') || '[]';
  const achievements = localStorage.getItem('achievements_config') || '[]';
  const achievementStatuses = localStorage.getItem('achievements_manual') || '{}';
  const seen = localStorage.getItem('achievements_seen') || '[]';
  const notes = localStorage.getItem('love_note_collection') || '[]';
  const whisper = localStorage.getItem('daily_whisper_candidate') || '{}';

  return JSON.stringify({
    version: 2,
    updatedAt: Date.now(),
    events: JSON.parse(events),
    achievements: JSON.parse(achievements),
    achievementStatuses: JSON.parse(achievementStatuses),
    achievementsSeen: JSON.parse(seen),
    notes: JSON.parse(notes),
    whisper: JSON.parse(whisper),
  });
}

function restoreAllData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (!data.version) return false;

    if (data.events) localStorage.setItem('romantic_journey_local_events', JSON.stringify(data.events));
    if (data.achievements) localStorage.setItem('achievements_config', JSON.stringify(data.achievements));
    if (data.achievementStatuses) localStorage.setItem('achievements_manual', JSON.stringify(data.achievementStatuses));
    if (data.achievementsSeen) localStorage.setItem('achievements_seen', JSON.stringify(data.achievementsSeen));
    if (data.notes) localStorage.setItem('love_note_collection', JSON.stringify(data.notes));
    if (data.whisper) localStorage.setItem('daily_whisper_candidate', JSON.stringify(data.whisper));

    console.log('✅ 云端数据已恢复到本地');
    return true;
  } catch (e) {
    console.error('云同步恢复失败:', e);
    return false;
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncHash = '';

/** 保存到 R2（防抖保护）。返回 true/false */
export async function syncToCloud(): Promise<boolean> {
  const config = getR2Config();
  if (!config) return false;
  return new Promise(resolve => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try {
        const client = getR2Client();
        if (!client) { resolve(false); return; }

        const json = collectAllData();
        lastSyncHash = '';

        const encoder = new TextEncoder();
        await client.send(new PutObjectCommand({
          Bucket: config.bucket,
          Key: CLOUD_KEY,
          Body: encoder.encode(json),
          ContentType: 'application/json',
        }));
        console.log('✅ 数据已同步到 R2');
        resolve(true);
      } catch (e: any) {
        console.error('R2 同步失败:', e?.message || e);
        resolve(false);
      }
    }, 500);
  });
}

/** 从 R2 恢复数据（打开 app 时调用） */
export async function restoreFromCloud(): Promise<boolean> {
  try {
    const config = getR2Config();
    if (!config) return false;

    const url = `${config.publicUrl}/${CLOUD_KEY}`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) {
      console.log('R2 暂无备份数据');
      return false;
    }
    const json = await res.text();
    return restoreAllData(json);
  } catch (e) {
    console.warn('R2 恢复失败:', e);
    return false;
  }
}
