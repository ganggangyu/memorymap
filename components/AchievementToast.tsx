import React, { useState, useEffect, useRef } from 'react';
import { Achievement } from '../types';
import { TrophyIcon } from './icons';

interface AchievementToastProps {
  achievement: Achievement | null;
}

const SEEN_KEY = 'achievements_seen';

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (!achievement || achievement.id === lastId.current) return;
    // Check if already seen
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
      if (seen.includes(achievement.id)) return;
      seen.push(achievement.id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-50))); // keep last 50
    } catch {}

    lastId.current = achievement.id;
    setIsVisible(true);
    setExiting(false);
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setIsVisible(false), 500);
    }, 4000);
    return () => clearTimeout(timer);
  }, [achievement]);

  if (!isVisible || !achievement) return null;

  return (
    <div className={`fixed inset-x-0 bottom-24 flex justify-center z-[3000] pointer-events-none px-4 transition-all duration-500 ${exiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className="pointer-events-auto bg-paper-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-yellow-200/60 px-5 py-4 flex items-center gap-4 max-w-sm w-full animate-fadeIn">
        <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-seal-400 to-seal-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-200">
          <TrophyIcon className="w-7 h-7 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">成就解锁</p>
          <h3 className="font-bold text-gray-800 text-sm truncate">{achievement.title}</h3>
          <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
        </div>
      </div>
    </div>
  );
};

export default AchievementToast;
