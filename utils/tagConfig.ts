// 标签统一配置：图标、颜色、emoji
// 替代旧的 TYPE_CFG 散落在各组件中的硬编码

export interface TagDisplayConfig {
  label: string;
  color: string;
  emoji: string;
  iconSvgName: string; // 用于地图 marker SVG 类型选择
}

export const TAG_CONFIG: Record<string, TagDisplayConfig> = {
  '旅行': {
    label: '旅行',
    color: '#0284c7',
    emoji: '✈️',
    iconSvgName: 'travel',
  },
  '日常': {
    label: '日常',
    color: '#059669',
    emoji: '📝',
    iconSvgName: 'daily',
  },
  '美食': {
    label: '美食',
    color: '#d97706',
    emoji: '🍜',
    iconSvgName: 'food',
  },
  '纪念日': {
    label: '纪念日',
    color: '#b45309',
    emoji: '💕',
    iconSvgName: 'anniversary',
  },
  '娱乐': {
    label: '娱乐',
    color: '#7c3aed',
    emoji: '🎮',
    iconSvgName: 'entertainment',
  },
  '自然': {
    label: '自然',
    color: '#16a34a',
    emoji: '🌿',
    iconSvgName: 'nature',
  },
  '愿望': {
    label: '愿望',
    color: '#9333ea',
    emoji: '💫',
    iconSvgName: 'dream',
  },
  '里程碑': {
    label: '里程碑',
    color: '#dc2626',
    emoji: '⭐',
    iconSvgName: 'milestone',
  },
};

/** 默认标签配置（用于未预设的自定义标签） */
export const DEFAULT_TAG_CONFIG: TagDisplayConfig = {
  label: '其他',
  color: '#6b7280',
  emoji: '📌',
  iconSvgName: 'default',
};

/** 获取标签的显示配置 */
export function getTagConfig(tag: string): TagDisplayConfig {
  return TAG_CONFIG[tag] || { ...DEFAULT_TAG_CONFIG, label: tag, emoji: '🏷️' };
}

/** 获取用于地图 SVG marker 的图标类型名 */
export function getTagIconSvgName(tags: string[]): string {
  if (!tags || tags.length === 0) return 'default';
  // 里程碑优先显示
  if (tags.includes('里程碑')) {
    const otherTag = tags.find(t => t !== '里程碑');
    return otherTag ? getTagConfig(otherTag).iconSvgName : 'milestone';
  }
  return getTagConfig(tags[0]).iconSvgName;
}
