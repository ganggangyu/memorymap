import { useState, useEffect, useRef } from 'react';
import { Achievement, AchievementStatus } from '../types';
import { INITIAL_ACHIEVEMENTS, checkAllAchievements } from '../achievements';
import { MemoryEvent } from '../types';

export const useAchievements = (events: MemoryEvent[]) => {
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [achievementStatuses, setAchievementStatuses] = useState<Record<string, AchievementStatus>>({});
  const [latestAchievement, setLatestAchievement] = useState<Achievement | null>(null);
  const [manualAchievementStatus, setManualAchievementStatus] = useState<Record<string, boolean>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const savedAch = localStorage.getItem('achievements_config');
    if (savedAch) setAchievements(JSON.parse(savedAch));
    const savedManual = localStorage.getItem('achievements_manual');
    if (savedManual) setManualAchievementStatus(JSON.parse(savedManual));
  }, []);

  useEffect(() => {
    if (!events.length) return;
    const newStatuses = checkAllAchievements(events, achievements, manualAchievementStatus);

    Object.entries(newStatuses).forEach(([id, status]) => {
      const typedStatus = status as AchievementStatus;
      const oldStatus = achievementStatuses[id] as AchievementStatus | undefined;
      if (typedStatus.isUnlocked && (!oldStatus || !oldStatus.isUnlocked)) {
        const ach = achievements.find(a => a.id === id);
        if (ach) {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setLatestAchievement(ach);
          toastTimerRef.current = setTimeout(() => setLatestAchievement(null), 5000);
        }
      }
    });
    setAchievementStatuses(newStatuses);
  }, [events, achievements, manualAchievementStatus]);

  const addAchievement = (ach: Achievement) => {
    const newAch = [...achievements, ach];
    setAchievements(newAch);
    localStorage.setItem('achievements_config', JSON.stringify(newAch));
  };

  const editAchievement = (ach: Achievement) => {
    const newAch = achievements.map(a => a.id === ach.id ? ach : a);
    setAchievements(newAch);
    localStorage.setItem('achievements_config', JSON.stringify(newAch));
  };

  const deleteAchievement = (id: string) => {
    const newAch = achievements.filter(a => a.id !== id);
    setAchievements(newAch);
    localStorage.setItem('achievements_config', JSON.stringify(newAch));
  };

  const toggleManualStatus = (id: string, done: boolean) => {
    setManualAchievementStatus(prev => {
      const next = { ...prev, [id]: done };
      localStorage.setItem('achievements_manual', JSON.stringify(next));
      return next;
    });
  };

  return {
    achievements,
    achievementStatuses,
    latestAchievement,
    addAchievement,
    editAchievement,
    deleteAchievement,
    toggleManualStatus,
  };
};
