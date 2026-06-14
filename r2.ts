// Cloudflare R2 存储 — 免流出流量费
// S3 兼容 API，用 @aws-sdk/client-s3

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

interface R2Config {
  endpoint: string;       // https://<accountid>.r2.cloudflarestorage.com
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;      // 公开访问域名，如 https://pub-xxx.r2.dev
}

let r2Config: R2Config | null = null;
let r2Client: S3Client | null = null;

export const isR2Configured = (): boolean => {
  const c = getR2Config();
  return !!c && !!c.accessKeyId && !!c.secretAccessKey && !!c.bucket;
};

let r2WarningLogged = false;

export const getR2Config = (): R2Config | null => {
  if (r2Config) return r2Config;

  // 优先从 localStorage 读取用户配置
  const local = localStorage.getItem('r2_config');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.accessKeyId && parsed.secretAccessKey && parsed.bucket) {
        r2Config = parsed;
        return r2Config;
      }
    } catch {}
  }

  // 其次使用环境变量（VITE_R2_*）
  const envAccessKey = import.meta.env.VITE_R2_ACCESS_KEY_ID;
  const envSecretKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
  const envBucket = import.meta.env.VITE_R2_BUCKET;
  if (envAccessKey && envSecretKey && envBucket) {
    r2Config = {
      endpoint: import.meta.env.VITE_R2_ENDPOINT || `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      accessKeyId: envAccessKey,
      secretAccessKey: envSecretKey,
      bucket: envBucket,
      publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || '',
    };
    return r2Config;
  }

  // 兜底：硬编码默认配置
  r2Config = {
    endpoint: 'https://d53219d607cd61b4f5d4a2eb2280070f.r2.cloudflarestorage.com',
    accessKeyId: '096b67bb04e7f70212dd76936ea00c44',
    secretAccessKey: '566b834630e8bbf84f99a42c2185d91c9b7ca632cd5fc9939bcbb63888d5b4af',
    bucket: 'memorymap',
    publicUrl: 'https://pub-aac66c3b8eff4a96b972352fa9cd50a1.r2.dev',
  };
  return r2Config;
};

export const getR2Client = (): S3Client | null => {
  if (r2Client) return r2Client;
  const config = getR2Config();
  if (!config) return null;

  r2Client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return r2Client;
};

/** 保存 R2 配置 */
export const saveR2Config = (config: R2Config): void => {
  localStorage.setItem('r2_config', JSON.stringify(config));
  r2Config = config;
  r2Client = null;
};

/** 上传 base64 图片，extOverride 可选指定扩展名 */
export const uploadBase64ToR2 = async (data: string, extOverride?: string): Promise<string | null> => {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config) return null;

  const arr = data.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);

  const ext = extOverride || (mime === 'image/png' ? 'png' : mime === 'image/gif' ? 'gif' : 'jpg');
  const key = `memories/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: u8,
      ContentType: mime,
    }));
    return `${config.publicUrl}/${key}`;
  } catch (e) {
    console.error('R2 upload error:', e);
    return null;
  }
};

/** 上传文件，接受 Blob（包括 File），ext 可选指定扩展名 */
export const uploadFileToR2 = async (file: Blob, ext?: string): Promise<string | null> => {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config) return null;

  const keyExt = ext || (file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg');
  const key = `memories/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${keyExt}`;

  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file instanceof File ? (file.type || 'application/octet-stream') : 'application/octet-stream',
    }));
    return `${config.publicUrl}/${key}`;
  } catch (e) {
    console.error('R2 upload error:', e);
    return null;
  }
};

/** 列出所有图片 */
export const listR2Files = async (): Promise<{ key: string; url: string; size: number; lastModified: string }[]> => {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config) return [];

  const allFiles: { key: string; url: string; size: number; lastModified: string }[] = [];
  let continuationToken: string | undefined;

  try {
    while (true) {
      const res = await client.send(new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: 'memories/',
        MaxKeys: 1000,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      }));

      const files = (res.Contents || []).map(obj => ({
        key: obj.Key || '',
        url: `${config.publicUrl}/${obj.Key}`,
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString() || '',
      }));
      allFiles.push(...files);

      if (res.IsTruncated && res.NextContinuationToken) {
        continuationToken = res.NextContinuationToken;
      } else {
        break;
      }
    }
  } catch (e) {
    console.error('R2 list error:', e);
  }

  return allFiles.sort((a, b) => (b.lastModified > a.lastModified ? 1 : -1));
};

/** 删除文件 */
export const deleteFileFromR2 = async (url: string): Promise<boolean> => {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config) return false;

  const key = url.split(`${config.publicUrl}/`)[1] || url.split('/').slice(-2).join('/');
  if (!key) return false;

  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};
