
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MemoryEvent } from '../types';
import { sortEventsDescending, parseDateRobustly } from '../utils';
import ThreeDCarousel from './ThreeDCarousel';
import { getTagConfig } from '../utils/tagConfig';

import { SparklesIcon, LivePhotoIcon } from './icons';

interface GalleryViewProps {
  events: MemoryEvent[];
  onImageClick: (images: { url: string; type: 'image' | 'video'; event: MemoryEvent }[], index: number) => void;
}

type GalleryMode = 'grid' | 'carousel';
type SortMode = 'newest' | 'oldest' | 'random';

const GalleryView: React.FC<GalleryViewProps> = ({ events, onImageClick }) => {
  const [mode, setMode] = useState<GalleryMode>('grid');
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const [activeTag, setActiveTag] = useState<string>('ALL');
  const [activeYear, setActiveYear] = useState<string>('ALL');

  const scrollRef = useRef<HTMLDivElement>(null);

  const { years, availableTags } = useMemo(() => {
      const uniqueYears = new Set<string>();
      const tagCounts = new Map<string, number>();

      events.forEach(e => {
          // 统计所有事件的标签（不只是有照片的）
          (e.tags || []).forEach(t => {
            tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
          });
          // 年份只统计有照片的事件
          if ((e.imageUrls && e.imageUrls.length > 0) || e.livePhotoUrl) {
              const d = parseDateRobustly(e.date);
              if (!isNaN(d.getTime()) && d.getFullYear() !== 9999) {
                  uniqueYears.add(d.getFullYear().toString());
              }
          }
      });

      // 按出现次数降序排列标签
      const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

      return {
          years: Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a)),
          availableTags: sortedTags
      };
  }, [events]);

  const filteredEvents = useMemo(() => {
      let filtered = [...events];

      if (activeTag !== 'ALL') {
          filtered = filtered.filter(e => (e.tags || []).includes(activeTag));
      }

      if (activeYear !== 'ALL') {
          filtered = filtered.filter(e => {
              const d = parseDateRobustly(e.date);
              return !isNaN(d.getTime()) && d.getFullYear().toString() === activeYear;
          });
      }

      switch (sortMode) {
          case 'newest':
              filtered.sort(sortEventsDescending);
              break;
          case 'oldest':
              filtered.sort((a, b) => {
                  const da = parseDateRobustly(a.date).getTime();
                  const db = parseDateRobustly(b.date).getTime();
                  return da - db;
              });
              break;
          case 'random':
              for (let i = filtered.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
              }
              break;
      }

      return filtered;
  }, [events, activeTag, activeYear, sortMode]);

  const allMedia = useMemo(() => {
    const media: { url: string; type: 'image' | 'video'; event: MemoryEvent }[] = [];

    filteredEvents.forEach(event => {
        if (event.livePhotoUrl) {
            media.push({ url: event.livePhotoUrl, type: 'video', event });
        }

        if (event.imageUrls && event.imageUrls.length > 0) {
            event.imageUrls.forEach(url => {
                media.push({ url, type: 'image', event });
            });
        }
    });
    return media;
  }, [filteredEvents]);

  const visibleMedia = useMemo(() => allMedia.slice(0, visibleCount), [allMedia, visibleCount]);

  const handleScroll = useCallback(() => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight - scrollTop - clientHeight < 300) {
          setVisibleCount(prev => Math.min(prev + 30, allMedia.length));
      }
  }, [allMedia.length]);

  useEffect(() => {
      const el = scrollRef.current;
      if (el) el.addEventListener('scroll', handleScroll);
      return () => { if (el) el.removeEventListener('scroll', handleScroll); }
  }, [handleScroll]);

  useEffect(() => {
      setVisibleCount(12);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTag, activeYear]);

  const handleCarouselClick = (images: { url: string; event: MemoryEvent }[], index: number) => {
      const mappedImages = images.map(img => ({ ...img, type: 'image' as const }));
      onImageClick(mappedImages, index);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--paper-bg)' }}>

        {/* 筛选栏 + 网格/3D 切换 */}
        <div className="shrink-0 w-full px-4 pt-12 safe-area-top pb-2">
            <div className="flex flex-col gap-2">
                {years.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mr-4 pr-4 items-center">
                        <button
                            onClick={() => setActiveYear('ALL')}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm border btn-bounce ${activeYear === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-paper-surface text-slate-500 border-gray-200 hover:bg-paper-cream'}`}
                        >
                            全部年份
                        </button>
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setActiveYear(year)}
                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm border btn-bounce ${activeYear === year ? 'bg-slate-800 text-white border-slate-800' : 'bg-paper-surface text-slate-500 border-gray-200 hover:bg-paper-cream'}`}
                            >
                                {year}
                            </button>
                        ))}
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => setSortMode('newest')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${sortMode === 'newest' ? 'bg-ink-700 text-white' : 'text-gray-400'}`}>最新</button>
                        <button onClick={() => setSortMode('oldest')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${sortMode === 'oldest' ? 'bg-ink-700 text-white' : 'text-gray-400'}`}>最早</button>
                        <button onClick={() => setSortMode('random')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${sortMode === 'random' ? 'bg-ink-700 text-white' : 'text-gray-400'}`}>随机</button>
                        <div className="w-px h-5 bg-gray-200 mx-0.5" />
                        <button onClick={() => setMode('grid')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${mode === 'grid' ? 'bg-seal-500 text-white' : 'text-gray-400'}`}>网格</button>
                        <button onClick={() => setMode('carousel')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${mode === 'carousel' ? 'bg-seal-500 text-white' : 'text-gray-400'}`}>3D</button>

                    </div>
                )}

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setActiveTag('ALL')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm border flex items-center gap-1 btn-bounce ${activeTag === 'ALL' ? 'bg-seal-500 text-white border-seal-500' : 'bg-paper-surface text-slate-500 border-gray-200 hover:bg-paper-cream'}`}
                    >
                        <SparklesIcon className="w-3 h-3" />
                        所有回忆
                    </button>
                    {availableTags.map(tag => {
                        const cfg = getTagConfig(tag);
                        return (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm border btn-bounce ${activeTag === tag ? 'bg-seal-500 text-white border-seal-500' : 'bg-paper-surface text-slate-500 border-gray-200 hover:bg-paper-cream'}`}
                            >
                                {cfg.emoji} {cfg.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {mode === 'carousel' ? (
            <ThreeDCarousel events={filteredEvents} onImageClick={handleCarouselClick} />
        ) : (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24" ref={scrollRef}>
                {allMedia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <p>该分类下暂无照片或视频。</p>
                    </div>
                ) : (
                    <>
                        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                            {visibleMedia.map((item, index) => {
                                const isVideo = item.type === 'video';
                                const tags = item.event.tags || [];
                                return (
                                    <div
                                        key={`${item.event.id}-${index}-${item.type}`}
                                        className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm hover:shadow-xl cursor-pointer bg-paper-surface border border-gray-100 transition-all duration-300 hover:-translate-y-1 active:scale-95"
                                        onClick={() => onImageClick(allMedia, index)}
                                    >
                                        {isVideo ? (
                                            <video
                                                src={item.url}
                                                className="w-full h-auto object-cover"
                                                muted
                                                loop
                                                playsInline
                                                autoPlay
                                            />
                                        ) : (
                                            <img
                                                src={item.url}
                                                alt={item.event.title}
                                                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        )}

                                        {isVideo && (
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/20 z-10">
                                                <LivePhotoIcon className="w-3 h-3 text-yellow-400" />
                                                LIVE
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                                            <h4 className="text-white font-bold text-sm truncate">{item.event.title}</h4>
                                            <div className="flex justify-between items-end mt-1">
                                                <p className="text-white/80 text-[10px] uppercase tracking-wider font-mono">{item.event.date}</p>
                                                {tags.length > 0 && (
                                                    <span className="text-[8px] bg-paper-surface/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-white">
                                                        {getTagConfig(tags[0]).emoji} {getTagConfig(tags[0]).label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {visibleCount < allMedia.length && (
                            <div className="text-center py-8 text-gray-400 text-xs tracking-widest uppercase">
                                Loading more memories...
                            </div>
                        )}
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default GalleryView;
