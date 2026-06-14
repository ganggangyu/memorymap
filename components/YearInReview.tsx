
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MemoryEvent } from '../types';
import { calculateJourneyStats, parseDateRobustly, playGameSound, isValidCoords, sortEventsAscending } from '../utils';
import { getTagConfig } from '../utils/tagConfig';
import {
    XIcon, MapPinIcon, HeartIcon, PlaneIcon, SparklesIcon, ChevronRightIcon, ChevronLeftIcon,
    CalendarIcon, PaletteIcon, UtensilsIcon, TrophyIcon, ReceiptIcon, CameraIcon, MusicIcon,
    LockIcon, TicketIcon, BellIcon, CheckIcon, StampIcon, EditIcon
} from './icons';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

interface YearInReviewProps {
  isOpen: boolean;
  onClose: () => void;
  events: MemoryEvent[];
}

// --- Helper Functions ---

const calculateAwards = (events: MemoryEvent[]) => {
    let longestNote = { val: 0, event: null as MemoryEvent | null };
    let foodCount = 0;
    let lateNight = { count: 0, event: null as MemoryEvent | null };
    let photoKing = { count: 0, event: null as MemoryEvent | null };

    events.forEach(e => {
        if (e.longDescription.length > longestNote.val) {
            longestNote = { val: e.longDescription.length, event: e };
        }
        if ((e.tags || []).includes('美食') || e.title.includes('吃') || e.shortDescription.includes('美味')) {
            foodCount++;
        }
        if (e.title.includes('晚') || e.title.includes('夜') || e.shortDescription.includes('星')) {
            lateNight.count++;
            lateNight.event = e;
        }
        if (e.imageUrls && e.imageUrls.length > photoKing.count) {
            photoKing = { count: e.imageUrls.length, event: e };
        }
    });

    const awards = [
        { 
            title: "深情笔触奖", 
            subtitle: "写下了最长的故事", 
            icon: HeartIcon, 
            color: "text-seal-500", 
            bg: "bg-seal-100",
            value: `${longestNote.val} 字`,
            event: longestNote.event 
        },
        { 
            title: "光影捕手奖", 
            subtitle: "单次拍摄最多照片", 
            icon: CameraIcon, 
            color: "text-blue-500", 
            bg: "bg-blue-100",
            value: `${photoKing.count} 张`,
            event: photoKing.event 
        },
    ];

    if (foodCount > 0) {
        awards.push({ 
            title: "最佳饭友奖", 
            subtitle: "打卡美食次数", 
            icon: UtensilsIcon, 
            color: "text-orange-500", 
            bg: "bg-orange-100",
            value: `${foodCount} 次`,
            event: null 
        });
    }

    return awards;
};

const calculatePalette = (events: MemoryEvent[]) => {
    const tagColors: Record<string, string> = {
        '旅行': '#60a5fa',
        '美食': '#fbbf24',
        '日常': '#a78bfa',
        '纪念日': 'var(--seal-500)',
        '自然': '#34d399',
        '娱乐': '#c084fc',
        '愿望': '#f472b6',
        '里程碑': '#fb923c',
        'default': '#94a3b8'
    };

    const counts: Record<string, number> = {};
    events.forEach(e => {
        const tags = e.tags || [];
        const firstTag = tags[0];
        const color = tagColors[firstTag] || tagColors['default'];
        counts[color] = (counts[color] || 0) + 1;
    });

    const palette = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([color, count]) => ({ color, count }))
        .slice(0, 5);

    const topColor = palette[0]?.color;
    let mood = "五彩斑斓";
    if (topColor === tagColors['旅行']) mood = "自由蔚蓝";
    else if (topColor === tagColors['纪念日']) mood = "热烈赤红";
    else if (topColor === tagColors['自然']) mood = "清新森绿";
    else if (topColor === tagColors['美食']) mood = "温暖金黄";
    else if (topColor === tagColors['日常']) mood = "温柔紫罗兰";
    else if (topColor === tagColors['娱乐']) mood = "霓虹幻紫";
    else if (topColor === tagColors['愿望']) mood = "梦幻粉彩";
    else if (topColor === tagColors['里程碑']) mood = "璀璨橙光";

    return { palette, mood };
};

const getSeasonInfo = (month: number) => {
    if (month >= 2 && month <= 4) return { name: 'Spring', label: '春日序曲', color: 'text-green-300' };
    if (month >= 5 && month <= 7) return { name: 'Summer', label: '盛夏光年', color: 'text-ink-300' };
    if (month >= 8 && month <= 10) return { name: 'Autumn', label: '金秋拾光', color: 'text-amber-300' };
    return { name: 'Winter', label: '冬日恋歌', color: 'text-blue-300' };
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const CHINESE_MONTHS = [
    "一月", "二月", "三月", "四月", "五月", "六月", 
    "七月", "八月", "九月", "十月", "十一月", "十二月"
];

// --- Sub-Components ---

const MapInteractionController = () => {
    const map = useMap();
    useEffect(() => {
        if (map) {
            map.dragging.enable();
            map.scrollWheelZoom.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            if ((map as any).tap) (map as any).tap.enable();
        }
    }, [map]);
    return null;
}

const MapFitter = ({ bounds }: { bounds: L.LatLngBounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds.isValid()) {
            try {
                setTimeout(() => {
                    map.invalidateSize();
                    map.fitBounds(bounds, { padding: [40, 40] });
                }, 100);
            } catch(e) { console.error(e); }
        }
    }, [map, bounds]);
    return null;
}

// --- RESERVATION VIEW ---
const ReservationView: React.FC<{ year: number, events: MemoryEvent[], onClose: () => void }> = ({ year, events, onClose }) => {
    const [isReserved, setIsReserved] = useState(false);
    const [message, setMessage] = useState('');
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    
    const cardRef = useRef<HTMLDivElement>(null);
    const holdInterval = useRef<number | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(`yir_reserved_${year}`);
        const savedMsg = localStorage.getItem(`yir_message_${year}`);
        if (stored) setIsReserved(true);
        if (savedMsg) setMessage(savedMsg);
    }, [year]);

    const backgroundImages = useMemo(() => {
        const images: string[] = [];
        events.forEach(e => {
            if(e.imageUrls && e.imageUrls.length > 0) images.push(e.imageUrls[0]);
        });
        return images.sort(() => 0.5 - Math.random()).slice(0, 6);
    }, [events]);

    const startHolding = () => {
        if (isReserved) return;
        setIsHolding(true);
        playGameSound('click');
    };

    const stopHolding = () => {
        if (isReserved) return;
        setIsHolding(false);
        setProgress(0);
        if (holdInterval.current) {
            clearInterval(holdInterval.current);
            holdInterval.current = null;
        }
    };

    useEffect(() => {
        if (isHolding && !isReserved) {
            holdInterval.current = window.setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        handleSeal();
                        return 100;
                    }
                    return prev + 2;
                });
            }, 20);
        } else {
            if (holdInterval.current) clearInterval(holdInterval.current);
        }
        return () => { if (holdInterval.current) clearInterval(holdInterval.current); };
    }, [isHolding, isReserved]);

    const handleSeal = () => {
        setIsReserved(true);
        setIsHolding(false);
        if (holdInterval.current) clearInterval(holdInterval.current);
        
        localStorage.setItem(`yir_reserved_${year}`, 'true');
        localStorage.setItem(`yir_message_${year}`, message);
        
        playGameSound('victory');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    const nextNewYear = new Date(year + 1, 0, 1);
    const diff = Math.max(0, nextNewYear.getTime() - new Date().getTime());
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 overflow-hidden animate-fadeIn">
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-black/60 z-10"></div>
                {backgroundImages.length > 0 ? (
                    <div className="grid grid-cols-3 grid-rows-2 h-full w-full">
                        {backgroundImages.map((img, i) => (
                            <img key={i} src={img} className="w-full h-full object-cover blur-md scale-110 opacity-70 animate-pulse" style={{ animationDuration: `${3 + i}s` }} />
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-black"></div>
                )}
            </div>

            <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-4 perspective-container" style={{ perspective: '1000px' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <div ref={cardRef} className="relative w-full max-w-md bg-[#fdfbf7] rounded-xl shadow-2xl transition-transform duration-100 ease-out transform-style-3d border-8 border-white/90" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div className="absolute inset-0 z-20 rounded-lg pointer-events-none opacity-30 bg-gradient-to-tr from-transparent via-white to-transparent" style={{ background: `linear-gradient(${115 + tilt.y * 2}deg, transparent 30%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.0) 60%)` }}></div>
                    <div className="p-8 flex flex-col items-center text-center relative z-10">
                        <div className="w-24 h-24 mb-6 relative">
                            {isReserved ? (
                                <div className="absolute inset-0 animate-scaleIn">
                                    <div className="w-full h-full bg-seal-600 rounded-full flex items-center justify-center shadow-inner border-4 border-ink-700"><StampIcon className="w-12 h-12 text-gold-300 opacity-90" /></div>
                                </div>
                            ) : (
                                <div className="w-full h-full rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center"><LockIcon className="w-10 h-10 text-slate-300" /></div>
                            )}
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2 tracking-wide">{year} 年度回忆录</h2>
                        
                        {!isReserved ? (
                            <div className="w-full mb-8 relative group">
                                <label className="block text-left text-xs font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within:text-seal-500 transition-colors">寄语未来 (Message to Future)</label>
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="写给开启这一刻的我们..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-seal-400 focus:bg-paper-surface transition-all resize-none h-24 font-handwriting leading-relaxed" maxLength={100} />
                            </div>
                        ) : (
                            <div className="w-full mb-8 bg-seal-50 p-4 rounded-xl border border-seal-100">
                                <p className="text-ink-800 font-handwriting text-lg">"{message || "静待花开..."}"</p>
                                <p className="text-[10px] text-ink-400 mt-2 uppercase tracking-wider">已封存 • 将于 1月1日 开启</p>
                            </div>
                        )}

                        {!isReserved ? (
                            <div className="relative w-full group">
                                <div className="absolute inset-0 bg-seal-500 rounded-xl opacity-10 transition-all duration-75" style={{ width: `${progress}%` }}></div>
                                <button onMouseDown={startHolding} onMouseUp={stopHolding} onMouseLeave={stopHolding} onTouchStart={startHolding} onTouchEnd={stopHolding} className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all relative overflow-hidden ${isHolding ? 'scale-[0.98] bg-seal-100 text-seal-600' : 'bg-slate-800 text-white hover:bg-slate-700 shadow-lg hover:shadow-slate-500/30'}`}>
                                    <span className="relative z-10 flex items-center justify-center gap-2">{isHolding ? <><SparklesIcon className="w-4 h-4 animate-spin" /> 正在封存... {Math.floor(progress)}%</> : <><LockIcon className="w-4 h-4" /> 长按封存记忆 (Hold to Seal)</>}</span>
                                    <div className="absolute left-0 top-0 bottom-0 bg-seal-500 transition-all ease-linear duration-75" style={{ width: `${progress}%`, opacity: 0.2 }}></div>
                                </button>
                            </div>
                        ) : (
                            <button disabled className="w-full py-4 bg-green-50 text-green-600 border border-green-200 rounded-xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 cursor-default"><CheckIcon className="w-5 h-5" /> 预约成功 (Reserved)</button>
                        )}
                        <div className="mt-6 text-[10px] text-slate-400 font-mono">UNLOCKS IN: <span className="text-slate-600 font-bold">{daysLeft} DAYS</span></div>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="absolute top-6 left-6 z-50 text-white/50 hover:text-white transition-colors flex items-center gap-2 group">
                <div className="p-2 bg-paper-surface/10 rounded-full group-hover:bg-paper-surface/20"><ChevronLeftIcon className="w-5 h-5" /></div>
                <span className="text-sm font-bold">返回</span>
            </button>
            <style>{`@keyframes scaleIn { from { transform: scale(0) rotate(-45deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } } .animate-scaleIn { animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }`}</style>
        </div>
    );
};

// --- MAIN COMPONENT ---

type SlideType = 'title' | 'month' | 'map' | 'palette' | 'awards' | 'receipt' | 'outro';

interface SlideConfig {
    type: SlideType;
    data?: any;
    monthIndex?: number;
}

const YearInReview: React.FC<YearInReviewProps> = ({ isOpen, onClose, events }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // 1. Available Years
  const availableYears = useMemo(() => {
      const years = new Set<number>();
      events.forEach(e => {
          if (e.date === 'Future') return;
          const d = parseDateRobustly(e.date);
          if (!isNaN(d.getTime()) && d.getFullYear() !== 9999) {
              years.add(d.getFullYear());
          }
      });
      years.add(new Date().getFullYear());
      return Array.from(years).sort((a, b) => b - a); 
  }, [events]);

  const isLocked = useMemo(() => {
      if (!selectedYear) return false;
      const now = new Date();
      const unlockDate = new Date(selectedYear + 1, 0, 1, 0, 0, 0);
      return now < unlockDate;
  }, [selectedYear]);

  // 2. Events for Selected Year
  const yearEvents = useMemo(() => {
      if (!selectedYear) return [];
      return events.filter(e => {
          if (e.date === 'Future') return false;
          const d = parseDateRobustly(e.date);
          return d.getFullYear() === selectedYear;
      });
  }, [events, selectedYear]);

  // 3. Stats & Analysis
  const stats = useMemo(() => calculateJourneyStats(yearEvents), [yearEvents]);
  const awards = useMemo(() => calculateAwards(yearEvents), [yearEvents]);
  const { palette, mood } = useMemo(() => calculatePalette(yearEvents), [yearEvents]);
  
  const mapData = useMemo(() => {
      const validEvents = yearEvents.filter(e => e.location && isValidCoords(e.location.coords));
      if (validEvents.length === 0) return null;
      const coords = validEvents.sort(sortEventsAscending).map(e => e.location.coords as [number, number]);
      const bounds = L.latLngBounds(coords);
      return { coords, bounds, validEvents };
  }, [yearEvents]);

  // 4. Group by Month for Slides
  const monthlySlides = useMemo(() => {
      if (!selectedYear) return [];
      const months = Array(12).fill(null).map((_, i) => ({ index: i, events: [] as MemoryEvent[] }));
      yearEvents.forEach(e => {
          const d = parseDateRobustly(e.date);
          if (d.getFullYear() === selectedYear) {
              months[d.getMonth()].events.push(e);
          }
      });
      return months.filter(m => m.events.length > 0).sort((a, b) => a.index - b.index);
  }, [yearEvents, selectedYear]);

  // 5. Construct Slides Sequence
  const slides = useMemo<SlideConfig[]>(() => {
      if (!selectedYear) return [];
      const config: SlideConfig[] = [
          { type: 'title' }
      ];
      // Add monthly slides
      monthlySlides.forEach(m => {
          config.push({ type: 'month', monthIndex: m.index, data: m.events });
      });
      // Add summaries
      config.push({ type: 'map' });
      config.push({ type: 'palette' });
      config.push({ type: 'awards' });
      config.push({ type: 'receipt' });
      config.push({ type: 'outro' });
      
      return config;
  }, [selectedYear, monthlySlides]);

  useEffect(() => {
      if (isOpen) {
          setSlideIndex(0);
          setShowIntro(true);
          if (availableYears.length === 1) {
             const year = availableYears[0];
             const unlockDate = new Date(year + 1, 0, 1);
             if (new Date() >= unlockDate) setSelectedYear(year);
             else setSelectedYear(null);
          } else {
              setSelectedYear(null);
          }
      } else {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
      }
  }, [isOpen, availableYears]);

  useEffect(() => {
      if (isOpen && selectedYear && !showIntro && !isLocked && audioRef.current) {
          audioRef.current.volume = 0.3;
          audioRef.current.play().catch(e => console.log("Audio play failed", e));
      }
  }, [isOpen, selectedYear, showIntro, isLocked]);

  const nextSlide = () => {
      if (slideIndex < slides.length - 1) setSlideIndex(prev => prev + 1);
      else onClose();
  };

  const prevSlide = () => {
      if (slideIndex > 0) setSlideIndex(prev => prev - 1);
  };

  const handleYearSelect = (year: number) => {
      setSelectedYear(year);
      setSlideIndex(0);
      setShowIntro(true);
  };

  // --- Touch Logic ---
  const isMapTouch = (e: React.TouchEvent | React.MouseEvent) => {
      const target = e.target as HTMLElement;
      return target.closest('.leaflet-container');
  };

  const onTouchStart = (e: React.TouchEvent) => {
      if (isMapTouch(e)) { touchStart.current = null; return; }
      touchEnd.current = null;
      touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
      if (touchStart.current === null) return;
      touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return;
      const distance = touchStart.current - touchEnd.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;
      
      if (isLeftSwipe) nextSlide();
      else if (isRightSwipe) prevSlide();
      
      touchStart.current = null;
      touchEnd.current = null;
  };

  if (!isOpen) return null;
  const audioEl = <audio ref={audioRef} src="https://aistudiocdn.com/samples/music.mp3" loop />;

  // --- VIEW 1: NO DATA ---
  if (availableYears.length === 0) {
      return (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fadeIn text-white">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-paper-surface/10 rounded-full hover:bg-paper-surface/20"><XIcon className="w-6 h-6" /></button>
            <SparklesIcon className="w-16 h-16 text-white/20 mb-6" />
            <h2 className="text-2xl font-bold mb-2">暂无年度数据</h2>
            <p className="text-white/50 text-center max-w-xs">添加一些带有日期的美好回忆，即可生成年度回顾。</p>
        </div>
      );
  }

  // --- VIEW 2: YEAR SELECTOR ---
  if (selectedYear === null) {
      return (
        <div className="fixed inset-0 z-[6000] bg-[#1a0505] text-white flex flex-col items-center justify-center animate-fadeIn p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-ink-900/20 to-black pointer-events-none"></div>
            <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 bg-paper-surface/10 rounded-full hover:bg-paper-surface/20"><XIcon className="w-6 h-6" /></button>
            <div className="relative z-10 w-full max-w-md text-center">
                <h1 className="text-4xl font-title font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-seal-100">时光放映机</h1>
                <p className="text-white/50 text-sm mb-10 uppercase tracking-widest">选择要重温的年份</p>
                <div className="grid gap-4 w-full px-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {availableYears.map(year => {
                        const count = events.filter(e => { const d = parseDateRobustly(e.date); return d.getFullYear() === year; }).length;
                        const locked = new Date() < new Date(year + 1, 0, 1);
                        return (
                            <button key={year} onClick={() => handleYearSelect(year)} className="group relative w-full bg-paper-surface/5 hover:bg-paper-surface/10 border border-white/10 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 flex items-center justify-between overflow-hidden">
                                <div className="flex flex-col items-start relative z-10">
                                    <span className="text-3xl font-mono font-bold text-white group-hover:text-amber-200 transition-colors">{year}</span>
                                    <span className="text-xs text-white/40 uppercase tracking-wider mt-1 group-hover:text-white/60">{locked ? '待解锁' : 'Review'}</span>
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="text-right">
                                        {locked ? <span className="block text-seal-500 font-bold text-xs bg-gold-500/20 px-2 py-1 rounded border border-amber-500/30">LOCKED</span> : <><span className="block text-xl font-bold text-white/90">{count}</span><span className="text-[10px] text-white/40 uppercase">Memories</span></>}
                                    </div>
                                    {locked ? <LockIcon className="w-5 h-5 text-white/30" /> : <ChevronRightIcon className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      );
  }

  // --- SPECIAL VIEW: LOCKED RESERVATION ---
  if (isLocked && selectedYear) {
      return (
          <div className="fixed inset-0 z-[6000] bg-[#1a0505]">
              <ReservationView year={selectedYear} events={yearEvents} onClose={() => setSelectedYear(null)} />
          </div>
      );
  }

  // --- VIEW 3: INTRO ---
  if (showIntro) {
      return (
          <div className="fixed inset-0 z-[6000] bg-[#2c0e0f] flex flex-col items-center justify-center text-white overflow-hidden cursor-pointer" onClick={() => setShowIntro(false)}>
              {audioEl}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"></div>
              <div className="relative z-10 animate-fadeIn flex flex-col items-center">
                  <div className="w-40 h-40 relative mb-8">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-amber-200/30 rounded-full animate-spin-slow" style={{ animationDuration: '10s' }}></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-amber-200/50 rounded-full animate-spin-slow" style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>
                      <div className="absolute inset-0 flex items-center justify-center"><MusicIcon className="w-12 h-12 text-amber-200 animate-pulse" /></div>
                  </div>
                  <h2 className="text-2xl font-title text-amber-100 mb-4 animate-bounce">打开时光八音盒...</h2>
                  <p className="text-white/50 text-sm tracking-widest uppercase">Tap to start journey</p>
              </div>
          </div>
      )
  }

  // --- MAIN SLIDESHOW ---
  const currentSlide = slides[slideIndex];

  return (
    <div className="fixed inset-0 z-[6000] bg-[#1a0505] text-white flex flex-col items-center justify-center animate-fadeIn overflow-hidden"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {audioEl}
        
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2c0e0f] via-[#4a191c] to-[#1a0505] pointer-events-none transition-colors duration-1000"></div>
        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
                <div key={i} className="absolute rounded-full bg-gold-500/10 blur-xl animate-floatUp"
                     style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 100 + 50}px`, height: `${Math.random() * 100 + 50}px`, animationDuration: `${Math.random() * 10 + 10}s` }}></div>
            ))}
        </div>

        {/* Controls */}
        <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 bg-paper-surface/10 rounded-full hover:bg-paper-surface/20"><XIcon className="w-6 h-6" /></button>
        {availableYears.length > 1 && (
            <button onClick={() => setSelectedYear(null)} className="absolute top-6 left-6 z-50 px-4 py-2 bg-paper-surface/10 rounded-full hover:bg-paper-surface/20 text-xs font-bold backdrop-blur-md flex items-center gap-2">
                <CalendarIcon className="w-3 h-3" /> 切换年份
            </button>
        )}

        {/* Progress */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-50">
            {slides.map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-paper-surface/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-amber-200 transition-all duration-500 ease-out ${i <= slideIndex ? 'w-full' : 'w-0'}`} />
                </div>
            ))}
        </div>

        {/* Slides Content */}
        <div className="w-full h-full relative" onClick={nextSlide}>
            
            {/* 0. Title Card */}
            {currentSlide.type === 'title' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                    <div className="mb-8 p-6 bg-paper-surface/5 border border-white/10 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                        <SparklesIcon className="w-16 h-16 text-amber-200" />
                    </div>
                    <h1 className="text-7xl font-title font-bold mb-4 drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-100">{selectedYear}</h1>
                    <h2 className="text-xl font-light tracking-[0.3em] uppercase text-white/80">我们的独家记忆</h2>
                    <div className="mt-12 w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                </div>
            )}

            {/* Monthly Breakdown */}
            {currentSlide.type === 'month' && currentSlide.data && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 animate-fadeIn">
                    {/* Blurred BG */}
                    <div className="absolute inset-0 z-0">
                        {currentSlide.data[0]?.imageUrls?.[0] ? (
                            <img src={currentSlide.data[0].imageUrls[0]} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
                        ) : (
                            <div className="w-full h-full bg-slate-900"></div>
                        )}
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-full max-w-md">
                        {/* Month Number */}
                        <div className="text-[12rem] leading-none font-black text-white/5 absolute top-[-8rem] select-none pointer-events-none">
                            {String((currentSlide.monthIndex || 0) + 1).padStart(2, '0')}
                        </div>

                        {/* Season Tag */}
                        <div className={`text-sm font-bold uppercase tracking-[0.4em] mb-6 ${getSeasonInfo(currentSlide.monthIndex!).color}`}>
                            {getSeasonInfo(currentSlide.monthIndex!).label}
                        </div>

                        {/* Photo Frame */}
                        <div className="bg-paper-surface p-3 pb-8 rounded shadow-2xl rotate-2 transform transition-transform hover:rotate-0 mb-8 w-64 aspect-[3/4]">
                            <div className="w-full h-full bg-paper-dark overflow-hidden">
                                {currentSlide.data[0]?.imageUrls?.[0] ? (
                                    <img src={currentSlide.data[0].imageUrls[0]} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">No Photo</div>
                                )}
                            </div>
                        </div>

                        <h2 className="text-4xl font-serif font-bold text-white mb-2">
                            {CHINESE_MONTHS[currentSlide.monthIndex!]} <span className="text-lg font-sans font-light opacity-60 uppercase tracking-widest">{MONTH_NAMES[currentSlide.monthIndex!]}</span>
                        </h2>

                        <div className="flex gap-4 text-xs font-mono text-white/60 mt-4 border-t border-white/10 pt-4 w-full justify-center">
                            <span>{currentSlide.data.length} MEMORIES</span>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{currentSlide.data[0].location.name.split(',')[0]}</span>
                        </div>
                        
                        <p className="mt-6 text-white/80 font-handwriting text-lg text-center max-w-xs italic line-clamp-2">
                            "{currentSlide.data[0].shortDescription}"
                        </p>
                    </div>
                </div>
            )}

            {/* Map Summary */}
            {currentSlide.type === 'map' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 animate-fadeIn">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><PlaneIcon className="w-6 h-6 text-amber-300" /> 旅程轨迹</h3>
                    <div className="text-7xl font-mono font-bold text-white mb-8 drop-shadow-md">{stats.totalDistance} <span className="text-2xl text-white/50">km</span></div>
                    <div className="relative w-full max-w-lg h-64 bg-paper-surface/5 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden" style={{ touchAction: 'none' }}>
                        {mapData ? (
                            <MapContainer center={[20, 0]} zoom={2} zoomControl={false} attributionControl={false} dragging={true} scrollWheelZoom={true} doubleClickZoom={true} touchZoom={true} style={{ width: '100%', height: '100%', background: 'transparent' }}>
                                <MapInteractionController />
                                <TileLayer url="https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" />
                                <Polyline positions={mapData.coords} color="var(--seal-500)" weight={3} dashArray="5, 10" />
                                {mapData.validEvents.map(e => <CircleMarker key={e.id} center={e.location.coords} radius={4} pathOptions={{ color: 'var(--seal-500)', fillColor: '#fff', fillOpacity: 1 }} />)}
                                <MapFitter bounds={mapData.bounds} />
                            </MapContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-white/30 text-sm">暂无地理位置数据</div>
                        )}
                    </div>
                    <p className="mt-8 text-white/60">跨越了 {stats.locationCount} 个城市，留下了 {stats.totalMemories} 个足迹。</p>
                </div>
            )}

            {/* Palette */}
            {currentSlide.type === 'palette' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 animate-fadeIn">
                    <h3 className="text-xl font-bold uppercase tracking-widest mb-10 flex items-center gap-2 text-amber-100"><PaletteIcon className="w-5 h-5" /> 年度色卡</h3>
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex gap-2">
                            {palette.map((p, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-32 md:w-16 md:h-48 rounded-full shadow-lg transition-transform hover:scale-110 hover:-translate-y-2 border-2 border-white/20" style={{ backgroundColor: p.color }}></div>
                                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase">{p.color}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-4"><span className="text-white/50 text-sm">主色调</span><div className="text-4xl font-title font-bold mt-2 text-white">{mood}</div></div>
                    </div>
                </div>
            )}

            {/* Awards */}
            {currentSlide.type === 'awards' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 animate-fadeIn">
                    <h3 className="text-xl font-bold uppercase tracking-widest mb-8 flex items-center gap-2 text-amber-100"><TrophyIcon className="w-5 h-5" /> 年度颁奖典礼</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                        {awards.map((award, i) => (
                            <div key={i} className="bg-paper-surface/10 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:bg-paper-surface/20 transition-colors">
                                <div className={`p-3 rounded-full ${award.bg} ${award.color}`}><award.icon className="w-6 h-6" /></div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg text-white">{award.title}</h4>
                                    <p className="text-xs text-white/60 mb-1">{award.subtitle}</p>
                                    {award.event ? <div className="text-sm font-medium text-amber-200 truncate">"{award.event.title}"</div> : <div className="text-sm font-medium text-amber-200">{award.value}</div>}
                                </div>
                                {award.event && <div className="text-xs font-mono bg-black/20 px-2 py-1 rounded text-white/80">{award.value}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Receipt */}
            {currentSlide.type === 'receipt' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-paper-surface text-gray-800 p-6 w-full max-w-xs shadow-2xl relative rotate-1 font-mono text-xs">
                        <div className="absolute -top-2 left-0 w-full h-4 bg-paper-surface" style={{ clipPath: 'polygon(0 100%, 5% 0, 10% 100%, 15% 0, 20% 100%, 25% 0, 30% 100%, 35% 0, 40% 100%, 45% 0, 50% 100%, 55% 0, 60% 100%, 65% 0, 70% 100%, 75% 0, 80% 100%, 85% 0, 90% 100%, 95% 0, 100% 100%)' }}></div>
                        <div className="text-center mb-6 mt-2"><h2 className="text-2xl font-bold tracking-widest mb-1">LOVE RECEIPT</h2><p className="text-gray-400">************ {selectedYear} ************</p></div>
                        <div className="space-y-3 mb-6 border-b-2 border-dashed border-gray-300 pb-6">
                            <div className="flex justify-between"><span>TRAVEL_DISTANCE</span><span className="font-bold">{stats.totalDistance} KM</span></div>
                            <div className="flex justify-between"><span>LOCATIONS_VISITED</span><span className="font-bold">{stats.locationCount} PLACES</span></div>
                            <div className="flex justify-between"><span>MEMORIES_SAVED</span><span className="font-bold">{stats.totalMemories} ITEMS</span></div>
                            <div className="flex justify-between"><span>HAPPY_TEARS</span><span className="font-bold">PRICELESS</span></div>
                            <div className="flex justify-between"><span>HUGS_GIVEN</span><span className="font-bold">∞</span></div>
                        </div>
                        <div className="flex justify-between text-lg font-bold mb-8"><span>TOTAL COST</span><span>0.00</span></div>
                        <div className="text-center space-y-2"><div className="h-12 w-4/5 bg-black mx-auto barcode-pattern opacity-80"></div><p className="text-[10px] text-gray-400">THANK YOU FOR BEING WITH ME</p></div>
                        <div className="absolute -bottom-2 left-0 w-full h-4 bg-paper-surface" style={{ clipPath: 'polygon(0 0, 5% 100%, 10% 0, 15% 100%, 20% 0, 25% 100%, 30% 0, 35% 100%, 40% 0, 45% 100%, 50% 0, 55% 100%, 60% 0, 65% 100%, 70% 0, 75% 100%, 80% 0, 85% 100%, 90% 0, 95% 100%, 100% 0)' }}></div>
                    </div>
                    <p className="mt-8 text-white/50 text-sm animate-pulse">点击屏幕生成账单</p>
                </div>
            )}

            {/* Outro */}
            {currentSlide.type === 'outro' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                    <h2 className="text-3xl font-bold mb-4 text-white">未完待续...</h2>
                    <p className="text-white/60 mb-8 max-w-md leading-relaxed">这一年的故事已经存档，<br/>但我们的旅程才刚刚开始。</p>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="px-10 py-4 bg-paper-surface text-rose-900 rounded-full font-bold hover:bg-seal-50 transition-colors shadow-xl hover:scale-105">回到现在</button>
                </div>
            )}
        </div>
        
        {/* Nav Arrows */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 opacity-30 hidden md:block hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="p-2 bg-paper-surface/10 rounded-full"><ChevronLeftIcon className="w-8 h-8" /></button></div>
        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-30 hidden md:block hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="p-2 bg-paper-surface/10 rounded-full"><ChevronRightIcon className="w-8 h-8" /></button></div>
    </div>
  );
};

export default YearInReview;
