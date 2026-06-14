// types.ts

/** @deprecated 旧的单一分类系统，已迁移到 tags。保留用于向后兼容旧数据。 */
export enum EventType {
  Travel = 'TRAVEL',
  Daily = 'DAILY',
  Food = 'FOOD',
  Anniversary = 'ANNIVERSARY',
  Entertainment = 'ENTERTAINMENT',
  Nature = 'NATURE',
  Dream = 'DREAM',
}

/** 预设标签配置 */
export const PRESET_TAGS = ['旅行', '日常', '美食', '纪念日', '娱乐', '自然', '愿望', '里程碑'] as const;
export type PresetTag = typeof PRESET_TAGS[number];

/** 标签 → 旧 EventType 的迁移映射（用于向后兼容存量数据） */
export const TAG_TO_EVENT_TYPE: Record<string, EventType> = {
  '旅行': EventType.Travel,
  '日常': EventType.Daily,
  '美食': EventType.Food,
  '纪念日': EventType.Anniversary,
  '娱乐': EventType.Entertainment,
  '自然': EventType.Nature,
  '愿望': EventType.Dream,
};

/** 旧 EventType → 标签的反向映射 */
export const EVENT_TYPE_TO_TAG: Record<EventType, string> = {
  [EventType.Travel]: '旅行',
  [EventType.Daily]: '日常',
  [EventType.Food]: '美食',
  [EventType.Anniversary]: '纪念日',
  [EventType.Entertainment]: '娱乐',
  [EventType.Nature]: '自然',
  [EventType.Dream]: '愿望',
};

export interface MemoryEvent {
  id: string;
  /** @deprecated 旧字段，新数据使用 tags。读取时兼容，保存时转为 tags。 */
  type?: EventType;
  /** 新标签系统：一个卡片可以有多个标签，如 ["旅行", "美食", "纪念日"] */
  tags: string[];
  /** @deprecated 旧字段，里程碑现在是一个标签。读取时兼容。 */
  isMilestone?: boolean;
  isSystemEvent?: boolean;
  title: string;
  date: string;
  /** 可选时间，如 "14:30"。同一天多个回忆按此排序 */
  time?: string;
  shortDescription: string;
  longDescription: string;
  location: {
    name: string;
    coords: [number, number]; // [latitude, longitude]
  };
  imageUrls: string[];
  audioUrl?: string;
  videoUrl?: string;
  livePhotoUrl?: string;
  milestoneOrder?: number;
}

/** 将旧数据迁移到标签系统：确保 tags 字段存在 */
export function migrateEventToTags(event: MemoryEvent): MemoryEvent {
  const tags = event.tags && event.tags.length > 0
    ? event.tags
    : [];

  // 从旧 type 字段迁移
  if (event.type && event.type !== ('' as any)) {
    const tagFromType = EVENT_TYPE_TO_TAG[event.type];
    if (tagFromType && !tags.includes(tagFromType)) {
      tags.push(tagFromType);
    }
  }

  // 从旧 isMilestone 字段迁移
  if (event.isMilestone && !tags.includes('里程碑')) {
    tags.push('里程碑');
  }

  return { ...event, tags };
}

// Types for the Achievement System
export type AchievementId = string;

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  goal: number;
  iconName: string;
  isCustom?: boolean;
  isManual?: boolean;
  unlockedAt?: string;
}

export interface AchievementStatus {
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: string;
}

// Types for AI Quiz
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

// New: Love Coupons
export interface LoveCoupon {
    id: string;
    title: string;
    description: string;
    cost: number;
    icon: string; // Emoji char
    isRedeemed: boolean;
}


