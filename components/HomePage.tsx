import React, { useMemo } from 'react';
import { MemoryEvent, Achievement, AchievementStatus } from '../types';
import { parseDateRobustly, sortEventsDescending } from '../utils';
import { ANNIVERSARY } from '../src/constants';
import { MapPinIcon, HeartIcon, TrophyIcon, CakeIcon, MapNavIcon, TimelineNavIcon, GalleryNavIcon, RitualNavIcon, FlameIcon, CameraIcon } from './icons';

interface HomePageProps {
  events: MemoryEvent[];
  achievements: Achievement[];
  achievementStatuses: Record<string, AchievementStatus>;
  onSelectEvent: (id: string) => void;
  onNavigate: (view: string) => void;
  onOpenRituals: () => void;
  onOpenAchievements: () => void;
  onOpenBirthday: () => void;
  onOpenYearInReview: () => void;
  onOpenDataMgmt: () => void;
  onOpenDice: () => void;
  onOpenBook: () => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '夜已深，祝你好梦';
  if (h < 9) return '早安，又是新的一天';
  if (h < 12) return '上午好，元气满满';
  if (h < 14) return '午安，好好吃饭';
  if (h < 18) return '下午好，正在想你';
  if (h < 21) return '傍晚好，暮色温柔';
  return '晚安，做个好梦';
};

const isAnniversaryToday = () => {
  const t = new Date();
  return t.getMonth() === ANNIVERSARY.getMonth() && t.getDate() === ANNIVERSARY.getDate();
};

// Vintage stamp wax seal component
const WaxSeal: React.FC<{ emoji: string; label: string }> = ({ emoji, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
      style={{ background: 'radial-gradient(circle at 35% 35%, var(--seal-400), var(--seal-600))', boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.15), 0 2px 6px rgba(139, 37, 0, 0.2)' }}>
      {emoji}
    </div>
    <span className="text-[9px] text-ink-400 font-handwriting">{label}</span>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({
  events, achievements, achievementStatuses,
  onSelectEvent, onNavigate, onOpenRituals,
  onOpenAchievements, onOpenBirthday, onOpenYearInReview, onOpenDataMgmt,
  onOpenDice, onOpenBook,
}) => {
  const stats = useMemo(() => {
    const realEvents = events.filter(e => !e.isSystemEvent);
    const today = new Date();
    const days = Math.max(1, Math.floor((today.getTime() - ANNIVERSARY.getTime()) / 86400000));
    const cities = new Set(realEvents.map(e => e.location.name.trim()));
    const milestones = realEvents.filter(e => (e.tags || []).includes('里程碑')).length;
    return {
      memories: realEvents.length,
      cities: cities.size,
      days,
      milestones,
      photos: realEvents.reduce((s, e) => s + (e.imageUrls?.length || 0), 0),
    };
  }, [events]);

  const achTotal = achievements.length;
  const achUnlocked = useMemo(() => {
    return Object.values(achievementStatuses).filter(s => s.isUnlocked).length;
  }, [achievementStatuses]);

  const onThisDay = useMemo(() => {
    const today = new Date();
    const md = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const thisYear = today.getFullYear();
    return events.filter(e => {
      if (e.isSystemEvent) return false;
      const n = parseDateRobustly(e.date);
      if (isNaN(n.getTime())) return false;
      const emd = `${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      return emd === md && n.getFullYear() < thisYear;
    }).slice(0, 4);
  }, [events]);

  const recent = useMemo(() => {
    return events.filter(e => !e.isSystemEvent).sort(sortEventsDescending).slice(0, 6);
  }, [events]);

  const anniInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysTogether = Math.floor((today.getTime() - ANNIVERSARY.getTime()) / 86400000);
    const thisYear = new Date(today.getFullYear(), ANNIVERSARY.getMonth(), ANNIVERSARY.getDate());
    if (thisYear <= today) thisYear.setFullYear(today.getFullYear() + 1);
    const daysUntil = Math.ceil((thisYear.getTime() - today.getTime()) / 86400000);
    const years = thisYear.getFullYear() - ANNIVERSARY.getFullYear();
    return { daysTogether: Math.max(1, daysTogether), daysUntil, years };
  }, []);

  const greeting = useMemo(() => getGreeting(), []);
  const anniToday = isAnniversaryToday();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-32 px-4 paper-texture">
      <div className="max-w-lg mx-auto pt-12 space-y-5">

        {/* ===== 信笺抬头：问候 + 标题 ===== */}
        <div className="text-center">
          <p className="text-[10px] text-gold-400 italic font-handwriting tracking-wider mb-1">
            —— {greeting} ——
          </p>
          <h1 className="text-2xl font-title tracking-wide" style={{ color: 'var(--ink-800)' }}>
            我们的旅程
          </h1>
          <div className="ink-line mt-2" />
        </div>

        {/* ===== 纪念日横幅 ===== */}
        {anniToday ? (
          <div className="relative rounded-card p-6 text-center shadow-glow animate-scale-in"
            style={{ background: 'linear-gradient(135deg, var(--seal-600), var(--seal-500))', color: '#fff' }}>
            <p className="text-2xl mb-1">🎉</p>
            <h2 className="text-lg font-bold font-title">今天是我们的纪念日！</h2>
            <p className="text-xs opacity-90 mt-1">在一起 {anniInfo.years} 周年快乐 ❤️</p>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
              style={{ background: 'radial-gradient(circle at 35% 35%, var(--seal-400), var(--seal-600))', boxShadow: '0 2px 6px rgba(139, 37, 0, 0.3)' }} />
          </div>
        ) : (
          /* ===== 纪念日倒计时 — 手账风格 ===== */
          <div className="rounded-card p-4 shadow-soft relative"
            style={{ background: 'linear-gradient(135deg, var(--paper-surface), var(--paper-cream))', borderLeft: '3px solid var(--seal-500)' }}>
            <div className="flex items-center gap-4">
              <div className="shrink-0 text-center">
                <div className="text-3xl font-title font-bold" style={{ color: 'var(--seal-600)' }}>
                  {anniInfo.daysUntil}
                </div>
                <div className="text-[9px] text-ink-400 mt-0.5">天后</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-800">
                  {anniInfo.years} 周年纪念日
                </p>
                <p className="text-[10px] text-ink-400 mt-0.5">
                  已并肩走过 {anniInfo.daysTogether.toLocaleString()} 天
                </p>
              </div>
              <span className="text-2xl">💌</span>
            </div>
          </div>
        )}

        {/* ===== 旅程概览 — 手账数字 ===== */}
        <div className="rounded-card p-4 shadow-soft paper-texture-heavy"
          style={{ border: '1px solid rgba(180, 160, 130, 0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📖</span>
            <h3 className="text-[11px] font-bold text-ink-600 uppercase tracking-widest">旅程概要</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { n: stats.days.toLocaleString(), label: '相伴天数', icon: '💝' },
              { n: stats.memories, label: '回忆', icon: '📜' },
              { n: stats.cities, label: '地点', icon: '📍' },
              { n: stats.photos, label: '照片', icon: '📷' },
            ].map(s => (
              <div key={s.label} className="text-center py-2 rounded-lg"
                style={{ background: 'rgba(240, 232, 213, 0.3)' }}>
                <p className="text-sm mb-0.5">{s.icon}</p>
                <p className="text-base font-bold font-title" style={{ color: 'var(--seal-600)' }}>{s.n}</p>
                <p className="text-[9px] text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 那年今日 — 邮票风格明信片 ===== */}
        {onThisDay.length > 0 && (
          <div className="relative stamp-frame">
            <h3 className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2">
              ✦ 那年今日 ✦
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {onThisDay.map((e, i) => (
                <button key={e.id} onClick={() => onSelectEvent(e.id)}
                  className="shrink-0 rounded-lg p-1.5 active:scale-95 transition-transform w-[88px]"
                  style={{ background: 'var(--paper-cream)' }}>
                  {e.imageUrls?.[0] ? (
                    <img src={e.imageUrls[0]} alt="" className="w-full aspect-square object-cover rounded mb-1" />
                  ) : (
                    <div className="w-full aspect-square rounded mb-1 flex items-center justify-center text-lg"
                      style={{ background: 'rgba(196, 169, 125, 0.15)' }}>📮</div>
                  )}
                  <p className="text-[9px] font-bold text-ink-700 truncate font-handwriting">{e.title}</p>
                  <p className="text-[8px] text-ink-400">{e.date.slice(0, 4)}年</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== 最近回忆 — 泛黄照片墙 ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">🖼️</span>
              <h3 className="text-[11px] font-bold text-ink-600 uppercase tracking-widest">最近回忆</h3>
            </div>
            <button onClick={() => onNavigate('list')} className="text-[10px] text-ink-400 font-bold font-handwriting">
              全部 →
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-card p-8 text-center shadow-soft"
              style={{ background: 'var(--paper-surface)' }}>
              <div className="text-3xl mb-2">🕊️</div>
              <p className="text-xs text-ink-400 mb-3 font-handwriting">还没有回忆，去地图添加第一个吧</p>
              <button onClick={() => onNavigate('map')}
                className="px-5 py-2 rounded-full text-xs font-bold active:scale-95 text-white"
                style={{ background: 'var(--seal-500)' }}>去地图</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recent.map(e => (
                <div key={e.id} onClick={() => onSelectEvent(e.id)}
                  className="rounded-lg overflow-hidden shadow-soft cursor-pointer active:scale-[0.97] transition-transform"
                  style={{ background: 'var(--paper-surface)' }}>
                  <div className="aspect-square overflow-hidden relative"
                    style={{ background: 'var(--paper-cream)' }}>
                    {e.imageUrls?.[0] ? (
                      <img src={e.imageUrls[0]} alt="" className="w-full h-full object-cover" loading="lazy"
                        style={{ filter: 'sepia(0.15) brightness(0.95)' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl"
                        style={{ background: 'rgba(196, 169, 125, 0.1)' }}>📝</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-ink-700 truncate">{e.title}</p>
                    <p className="text-[8px] text-ink-400 mt-0.5 truncate">{e.location.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== 成就进度 ===== */}
        <div className="rounded-card p-4 shadow-soft flex items-center gap-3"
          style={{ background: 'var(--paper-surface)', border: '1px solid rgba(180, 160, 130, 0.15)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(196, 169, 125, 0.1)' }}>
            <TrophyIcon className="w-5 h-5" style={{ color: 'var(--seal-500)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-bold text-ink-700 mb-1">成就系统</h3>
            <div className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(180, 160, 130, 0.15)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${achTotal > 0 ? (achUnlocked / achTotal) * 100 : 0}%`,
                  background: 'linear-gradient(to right, var(--seal-400), var(--seal-600))'
                }} />
            </div>
            <p className="text-[9px] text-ink-400 mt-1">{achUnlocked}/{achTotal} 已解锁</p>
          </div>
          <button onClick={onOpenAchievements} className="text-[10px] text-ink-400 font-bold font-handwriting shrink-0">
            查看 →
          </button>
        </div>

        {/* ===== 快捷入口 — 信封蜡封 ===== */}
        <div className="rounded-card p-4 shadow-soft paper-texture-heavy"
          style={{ border: '1px solid rgba(180, 160, 130, 0.2)' }}>
          <h3 className="text-[11px] font-bold text-ink-600 uppercase tracking-widest mb-3">✉️ 快捷入口</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '祈福', icon: FlameIcon, onClick: onOpenRituals, color: 'var(--seal-500)' },
              { label: '生日', icon: CakeIcon, onClick: onOpenBirthday, color: 'var(--seal-500)' },
              { label: '年度回顾', icon: TimelineNavIcon, onClick: onOpenYearInReview, color: 'var(--sage-500)' },
              { label: '成就', icon: TrophyIcon, onClick: onOpenAchievements, color: 'var(--seal-500)' },
              { label: '爱心拼图', icon: CameraIcon, onClick: () => {}, color: 'var(--seal-500)' },
            ].map(item => (
              <button key={item.label} onClick={item.onClick}
                className="flex flex-col items-center gap-1.5 py-3 rounded-lg active:scale-95 transition-transform"
                style={{ background: 'rgba(240, 232, 213, 0.25)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(196, 169, 125, 0.15)' }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-[9px] font-bold font-handwriting" style={{ color: 'var(--ink-600)' }}>
                  {item.label}
                </span>
              </button>
            ))}
            {/* 数据管理 */}
            <button onClick={onOpenDataMgmt}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg active:scale-95 transition-transform"
              style={{ background: 'rgba(240, 232, 213, 0.25)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(196, 169, 125, 0.15)' }}>
                <span className="text-sm">📦</span>
              </div>
              <span className="text-[9px] font-bold font-handwriting" style={{ color: 'var(--ink-600)' }}>
                数据管理
              </span>
            </button>
            {/* 恋爱骰子 */}
            <button onClick={onOpenDice}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg active:scale-95 transition-transform"
              style={{ background: 'rgba(245, 158, 11, 0.06)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
                <span className="text-sm">🎲</span>
              </div>
              <span className="text-[9px] font-bold font-handwriting" style={{ color: 'var(--ink-600)' }}>
                恋爱骰子
              </span>
            </button>
            {/* 我们的书 */}
            <button onClick={onOpenBook}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg active:scale-95 transition-transform"
              style={{ background: 'rgba(124, 58, 237, 0.06)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(124, 58, 237, 0.12)' }}>
                <span className="text-sm">📖</span>
              </div>
              <span className="text-[9px] font-bold font-handwriting" style={{ color: 'var(--ink-600)' }}>
                我们的书
              </span>
            </button>
          </div>
        </div>

        {/* ===== 底部装饰线 ===== */}
        <div className="flex items-center justify-center gap-2 pb-4">
          <span className="text-gold-300 text-xs">✦</span>
          <div className="ink-line flex-1" />
          <span className="text-gold-300 text-xs">✦</span>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
