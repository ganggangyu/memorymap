
import { MemoryEvent, Achievement, AchievementId, AchievementStatus } from './types';

// Initial System Achievements
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
    { id: 'FIRST_STEP', title: '迈出第一步', description: '创建你的第一个美好回忆。', goal: 1, iconName: 'PlusIcon' },
    { id: 'STORYTELLER', title: '故事讲述者', description: '记录 5 个回忆。', goal: 5, iconName: 'BookOpenIcon' },
    { id: 'HISTORIAN', title: '历史学家', description: '记录 15 个回忆。', goal: 15, iconName: 'BookOpenIcon' },
    { id: 'PHOTOGRAPHER', title: '摄影师', description: '添加一个包含至少 3 张照片的回忆。', goal: 1, iconName: 'CameraIcon' },
    { id: 'SOUND_OF_LOVE', title: '爱的声音', description: '添加一个包含语音或音频的回忆。', goal: 1, iconName: 'MusicIcon' },
    { id: 'WELL_ROUNDED', title: '面面俱到', description: '使用 3 种不同的标签。', goal: 3, iconName: 'HeartIcon' },
    { id: 'GLOBETROTTER', title: '环球旅行家', description: '创建 3 个带"旅行"标签的回忆。', goal: 3, iconName: 'PlaneIcon' },
];

type AchievementCheckResult = Record<AchievementId, AchievementStatus>;

// A master function to check the status of all achievements
export const checkAllAchievements = (
    events: MemoryEvent[],
    currentAchievements: Achievement[], // Now takes the dynamic list
    manualStatus: Record<string, boolean> // Tracks manual completions
): AchievementCheckResult => {

    // --- Pre-calculate System Metrics ---
    const totalEvents = events.length;
    const hasMemoryWith3Photos = events.some(e => (e.imageUrls?.length || 0) >= 3);
    const hasMemoryWithAudio = events.some(e => e.audioUrl);
    // 标签系统：统计使用的不同标签数
    const uniqueTags = new Set<string>();
    events.forEach(e => (e.tags || []).forEach(t => uniqueTags.add(t)));
    const uniqueTagsUsed = uniqueTags.size;
    const travelMemoriesCount = events.filter(e => (e.tags || []).includes('旅行')).length;

    const statuses: AchievementCheckResult = {};

    currentAchievements.forEach(ach => {
        // If it's a manual/custom achievement, use the manual status
        if (ach.isManual || ach.isCustom) {
            const isDone = !!manualStatus[ach.id];
            statuses[ach.id] = {
                progress: isDone ? ach.goal : 0,
                isUnlocked: isDone
            };
            return;
        }

        // System achievement logic check by ID
        // Even if user renamed title/desc, we check ID to apply logic
        switch (ach.id) {
            case 'FIRST_STEP':
                statuses[ach.id] = { progress: Math.min(totalEvents, 1), isUnlocked: totalEvents >= 1 };
                break;
            case 'STORYTELLER':
                statuses[ach.id] = { progress: Math.min(totalEvents, 5), isUnlocked: totalEvents >= 5 };
                break;
            case 'HISTORIAN':
                statuses[ach.id] = { progress: Math.min(totalEvents, 15), isUnlocked: totalEvents >= 15 };
                break;
            case 'PHOTOGRAPHER':
                statuses[ach.id] = { progress: hasMemoryWith3Photos ? 1 : 0, isUnlocked: hasMemoryWith3Photos };
                break;
            case 'SOUND_OF_LOVE':
                statuses[ach.id] = { progress: hasMemoryWithAudio ? 1 : 0, isUnlocked: hasMemoryWithAudio };
                break;
            case 'WELL_ROUNDED':
                statuses[ach.id] = { progress: Math.min(uniqueTagsUsed, 3), isUnlocked: uniqueTagsUsed >= 3 };
                break;
            case 'GLOBETROTTER':
                statuses[ach.id] = { progress: Math.min(travelMemoriesCount, 3), isUnlocked: travelMemoriesCount >= 3 };
                break;
            default:
                // Fallback for unknown IDs
                statuses[ach.id] = { progress: 0, isUnlocked: false };
        }
    });

    return statuses;
};
