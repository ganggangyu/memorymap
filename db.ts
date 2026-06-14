import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { MemoryEvent, migrateEventToTags } from './types';
import { isValidCoords, sortEventsAscending } from './utils';
import { getR2Config, getR2Client } from './r2';

const CACHE_KEY = 'romantic_journey_local_events';
const R2_DATA_KEY = 'backup/data.json';
const DEBOUNCE_MS = 1500;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrite = false;

const validateEvent = (event: MemoryEvent): string | null => {
  if (!event.id) return '缺少 ID';
  if (!event.title || event.title.trim() === '') return '缺少标题';
  if (!event.date) return '缺少日期';
  if (!event.location || !event.location.name) return '缺少位置名称';
  if (!isValidCoords(event.location.coords)) return '坐标无效';
  return null;
};

const readCache = (): MemoryEvent[] => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return [];
    const raw = JSON.parse(data);
    return autoMigrate(raw);
  } catch {
    return [];
  }
};

const writeCache = (events: MemoryEvent[]): void => {
  try {
    events.sort(sortEventsAscending);
    localStorage.setItem(CACHE_KEY, JSON.stringify(events));
  } catch (e: any) {
    console.error('写入本地缓存失败:', e);
  }
};

const autoMigrate = (events: MemoryEvent[]): MemoryEvent[] => {
  const needsMigration = events.some(e =>
    e.type && (!e.tags || e.tags.length === 0)
  );
  if (!needsMigration) return events;
  console.log(`🔄 检测到 ${events.length} 条旧格式数据，正在迁移到标签系统...`);
  const migrated = events.map(migrateEventToTags);
  localStorage.setItem(CACHE_KEY, JSON.stringify(migrated));
  console.log('✅ 标签迁移完成');
  return migrated;
};

const readFromR2 = async (): Promise<MemoryEvent[] | null> => {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config) return null;
  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: R2_DATA_KEY,
    }));
    if (!res.Body) return [];
    const body = await res.Body.transformToString();
    if (!body) return [];
    const raw = JSON.parse(body);
    return Array.isArray(raw) ? raw : [];
  } catch (e: any) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
      return [];
    }
    console.error('R2 读取失败:', e);
    return null;
  }
};

const writeToR2 = async (events: MemoryEvent[]): Promise<boolean> => {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config) return false;
  try {
    const json = JSON.stringify(events);
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: R2_DATA_KEY,
      Body: json,
      ContentType: 'application/json',
    }));
    return true;
  } catch (e) {
    console.error('R2 写入失败:', e);
    return false;
  }
};

const scheduleR2Write = (events: MemoryEvent[]): void => {
  pendingWrite = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    if (!pendingWrite) return;
    pendingWrite = false;
    const snapshot = readCache();
    await writeToR2(snapshot);
  }, DEBOUNCE_MS);
};

export const initDB = async (): Promise<void> => {
  console.log('初始化数据库: R2 主存储 + 本地缓存');
  const r2Events = await readFromR2();
  if (r2Events !== null && r2Events.length > 0) {
    const migrated = autoMigrate(r2Events);
    writeCache(migrated);
    console.log(`✅ 从 R2 同步 ${migrated.length} 条数据到本地缓存`);
  } else if (r2Events !== null && r2Events.length === 0) {
    console.log('⚠️ R2 上暂无数据，使用本地缓存');
    // Don't overwrite local cache with empty R2 data
    // But DO sync local to R2 so next time R2 has the data
    const local = readCache();
    if (local.length > 0) {
      await writeToR2(local);
      console.log('✅ 已将本地缓存同步到 R2');
    }
  } else {
    console.log('⚠️ R2 不可用，使用本地缓存');
  }
};

export const getEventSummaries = async (): Promise<MemoryEvent[]> => {
  let events = readCache();
  if (events.length === 0) {
    const r2Events = await readFromR2();
    if (r2Events !== null && r2Events.length > 0) {
      events = autoMigrate(r2Events);
      writeCache(events);
    }
  }
  return events.sort(sortEventsAscending);
};

export const getEventDetails = async (id: string): Promise<MemoryEvent | null> => {
  const events = readCache();
  return events.find(e => e.id === id) || null;
};

export const saveEventToDB = async (event: MemoryEvent): Promise<void> => {
  const err = validateEvent(event);
  if (err) throw new Error(err);
  const events = readCache();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event; else events.push(event);
  writeCache(events);
  scheduleR2Write(events);
};

export const deleteEventFromDB = async (id: string): Promise<void> => {
  const events = readCache().filter(e => e.id !== id);
  writeCache(events);
  scheduleR2Write(events);
};

export const saveAllEventsToDB = async (events: MemoryEvent[]): Promise<{total: number; success: number; failed: number}> => {
  const valid = events.filter(e => validateEvent(e) === null);
  writeCache(valid);
  scheduleR2Write(valid);
  return { total: valid.length, success: valid.length, failed: events.length - valid.length };
};
