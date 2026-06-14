import React, { useMemo, useRef, useState } from 'react';
import { MemoryEvent } from '../types';
import { sortEventsAscending, parseDateRobustly } from '../utils';
import { MapPinIcon, HeartIcon, LivePhotoIcon, SearchIcon, XIcon } from './icons';
import { getTagConfig } from '../utils/tagConfig';

interface CardListViewProps {
  events: MemoryEvent[];
  onSelectEvent: (id: string) => void;
}

const normalizeDate = (d: string): Date | null => {
  const parsed = parseDateRobustly(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (d: string) => {
  const n = normalizeDate(d);
  return n ? `${n.getMonth() + 1}月${n.getDate()}日` : d;
};

const formatDateWithTime = (d: string, time?: string) => {
  const datePart = formatDate(d);
  return time ? `${datePart} ${time}` : datePart;
};

const getMonthKey = (d: string) => {
  const n = normalizeDate(d);
  return n ? `${n.getFullYear()}年${n.getMonth() + 1}月` : d;
};

const matchQuery = (e: MemoryEvent, q: string): boolean => {
  const lower = q.toLowerCase();
  return (
    e.title.toLowerCase().includes(lower) ||
    (e.shortDescription || '').toLowerCase().includes(lower) ||
    e.location.name.toLowerCase().includes(lower)
  );
};

const CardListView: React.FC<CardListViewProps> = ({ events, onSelectEvent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => events.filter(e => !e.isSystemEvent).sort(sortEventsAscending), [events]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    return q ? sorted.filter(e => matchQuery(e, q)) : sorted;
  }, [sorted, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // 那年今日（只在非搜索状态下显示）
  const todayMD = useMemo(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const onThisDay = useMemo(() => {
    if (isSearching) return [];
    const thisYear = new Date().getFullYear();
    return sorted.filter(e => {
      const n = normalizeDate(e.date);
      if (!n) return false;
      const md = `${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      return md === todayMD && n.getFullYear() < thisYear;
    });
  }, [sorted, todayMD, isSearching]);

  const grouped = useMemo(() => {
    const groups: { key: string; items: MemoryEvent[] }[] = [];
    filtered.forEach(e => {
      const key = getMonthKey(e.date);
      if (!groups.length || groups[groups.length - 1].key !== key) {
        groups.push({ key, items: [] });
      }
      groups[groups.length - 1].items.push(e);
    });
    return groups;
  }, [filtered]);

  if (sorted.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center" style={{ background: 'var(--paper-bg)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-glow" style={{ background: 'linear-gradient(135deg, var(--primary-200), var(--primary-100))' }}>
          <MapPinIcon className="w-10 h-10" style={{ color: 'var(--primary-500)' }} />
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-1">开始你们的旅程</h3>
        <p className="text-sm text-gray-400 mb-6 max-w-[240px] leading-relaxed">在地图上标记每一个<br/>值得纪念的地方</p>
      </div>
    );
  }

  // 搜索栏（只渲染一次，避免输入时被销毁重建导致键盘关闭）
  const searchBar = (
    <div className="sticky top-0 z-20 pb-3" style={{ background: 'var(--paper-bg)' }}>
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-seal-400/30 focus-within:border-seal-300 transition-all">
        <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索标题、描述、地点..."
          className="flex-1 outline-none text-sm bg-transparent text-gray-700"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
            className="shrink-0 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isSearching && (
        <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
          找到 {filtered.length} 条回忆
        </p>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-32 pt-12 px-4 safe-area-top" style={{ background: 'var(--paper-bg)' }}>
      <div className="max-w-lg mx-auto">
        {searchBar}

        {/* 搜索无结果 */}
        {isSearching && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">没有找到匹配的回忆</p>
            <p className="text-gray-300 text-xs mt-1">换个关键词试试</p>
          </div>
        ) : (
          <>
            {/* 那年今日 — 横向小卡片 */}
            {onThisDay.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-2 pl-1">💫 那年今日</h3>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {onThisDay.map(e => {
                    const firstTag = (e.tags || [])[0];
                    const cfg = firstTag ? getTagConfig(firstTag) : getTagConfig('日常');
                    return (
                      <button key={e.id} onClick={() => onSelectEvent(e.id)}
                        className="shrink-0 bg-paper-surface rounded-xl p-2 shadow-soft active:scale-95 transition-transform cursor-pointer"
                        style={{ minWidth: '120px', maxWidth: '140px' }}
                      >
                        {e.imageUrls?.[0] ? (
                          <img src={e.imageUrls[0]} alt="" className="w-full aspect-square object-cover rounded-lg mb-1.5" loading="lazy" />
                        ) : (
                          <div className="w-full aspect-square rounded-lg mb-1.5 flex items-center justify-center text-2xl" style={{ background: 'var(--paper-bg)' }}>{cfg.emoji}</div>
                        )}
                        <p className="text-[10px] font-bold text-gray-700 truncate">{e.title}</p>
                        <p className="text-[9px] text-ink-400">{e.date.slice(0, 4)}年</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 回忆列表 */}
            {grouped.map(group => (
              <div key={group.key} className="mb-4">
                <h3 className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-3 pl-1 sticky top-12 py-2 z-10" style={{ background: 'var(--paper-bg)' }}>
                  {group.key}
                </h3>
                <div className="space-y-3">
                  {group.items.map(event => {
                    const tags = event.tags || [];
                    const firstTag = tags[0];
                    const cfg = firstTag ? getTagConfig(firstTag) : getTagConfig('日常');
                    const hasPhoto = event.imageUrls?.[0];
                    return (
                      <div key={event.id} onClick={() => onSelectEvent(event.id)}
                        className="card-hover bg-paper-surface rounded-card overflow-hidden shadow-soft cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        {hasPhoto ? (
                          <div className="relative w-full bg-paper-cream overflow-hidden">
                            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
                              {event.imageUrls.map((url, i) => (
                                <div key={i} className="shrink-0 w-full snap-center relative aspect-[3/2]">
                                  <img src={url} alt={`${event.title} ${i + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                            {event.imageUrls.length > 1 && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {event.imageUrls.map((_, i) => (
                                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-sm" />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 p-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--paper-bg)' }}>{cfg.emoji}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="text-base font-bold text-gray-800">{event.title}</h3>
                                {tags.includes('里程碑') && <HeartIcon className="w-4 h-4 text-ink-400 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <span className="font-medium text-gray-500">{formatDateWithTime(event.date, event.time)}</span>
                                <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                <span className="flex items-center gap-1 truncate"><MapPinIcon className="w-3 h-3 shrink-0" />{event.location.name}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {hasPhoto && (
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="text-base font-bold text-gray-800">{event.title}</h3>
                              {tags.includes('里程碑') && <HeartIcon className="w-4 h-4 text-ink-400 shrink-0" />}
                            </div>
                            <div className="flex items-center flex-wrap gap-2 text-[11px] text-gray-400 mb-2">
                              <span className="font-medium text-gray-500">{formatDateWithTime(event.date, event.time)}</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                              <span className="flex items-center gap-1 truncate"><MapPinIcon className="w-3 h-3 shrink-0" />{event.location.name}</span>
                            </div>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {tags.map(tag => {
                                  const tc = getTagConfig(tag);
                                  return (
                                    <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: tc.color }}>
                                      {tc.emoji} {tc.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {event.shortDescription && (
                              <p className="text-sm text-gray-500 leading-relaxed line-clamp-1 mb-2">{event.shortDescription}</p>
                            )}
                          </div>
                        )}
                        {!hasPhoto && (
                          <div className="px-4 pb-3">
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {tags.map(tag => {
                                  const tc = getTagConfig(tag);
                                  return (
                                    <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: tc.color }}>
                                      {tc.emoji} {tc.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {event.shortDescription && (
                              <p className="text-sm text-gray-500 leading-relaxed line-clamp-1">{event.shortDescription}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CardListView;
