
import React, { useState, useMemo, useEffect } from 'react';
import { MemoryEvent } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, HeartIcon, GridIcon, CalendarIcon, CameraIcon, XIcon, FlameIcon, LanternIcon } from './icons';
import { parseDateRobustly, sortEventsAscending, formatDateStandard } from '../utils';
import { getTagConfig } from '../utils/tagConfig';

interface CalendarViewProps {
  events: MemoryEvent[];
  onSelectEvent: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onSelectEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [showPhotos, setShowPhotos] = useState(true); 
  const [isNavOpen, setIsNavOpen] = useState(false); 

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 

  // Group events by YYYY-MM-DD string, normalizing all formats
  const eventsByDate = useMemo(() => {
    const map: Record<string, MemoryEvent[]> = {};
    events.forEach(event => {
      if (!event.date || event.date === 'Future') return;
      // Normalize any date format to YYYY-MM-DD
      const d = parseDateRobustly(event.date);
      if (isNaN(d.getTime()) || d.getFullYear() > 9000) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  // Sync calendar when events change (auto-focus today if a new event just arrived)
  useEffect(() => {
      const today = new Date();
      const todayKey = formatDateStandard(today);
      if (eventsByDate[todayKey]) {
          // If viewing a different month, snap back to today
          if (currentDate.getMonth() !== today.getMonth() || currentDate.getFullYear() !== today.getFullYear()) {
              setCurrentDate(today);
          }
          // If no day selected or selecting a different day, select today
          if (!selectedDay || formatDateStandard(selectedDay) !== todayKey) {
              setSelectedDay(today);
          }
      }
  }, [events.length]);

  const monthlyStats = useMemo(() => {
    let memoryCount = 0;
    let milestoneCount = 0;
    const locations = new Set<string>();
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = eventsByDate[dateKey];
        if (dayEvents) {
            // Memory Count: User created events only
            const userEvents = dayEvents.filter(e => !e.isSystemEvent);
            memoryCount += userEvents.length;
            
            dayEvents.forEach(e => {
                if ((e.tags || []).includes('里程碑')) milestoneCount++;
                
                // Location Count: Exclude system events (virtual locations)
                if (!e.isSystemEvent && e.location.name && e.location.name !== 'Virtual Space') {
                    locations.add(e.location.name.split(',')[0].trim()); 
                }
            });
        }
    }
    return { memoryCount, milestoneCount, locationCount: locations.size };
  }, [year, month, daysInMonth, eventsByDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(new Date(year, month, day));
  };

  const handleYearChange = (newYear: number) => {
      setCurrentDate(new Date(newYear, month, 1));
  };
  
  const handleMonthSelect = (newMonth: number) => {
      setCurrentDate(new Date(year, newMonth, 1));
      setIsNavOpen(false);
  };

  const getSeasonGradient = (m: number) => {
      if (m >= 2 && m <= 4) return 'from-seal-50/30 to-green-100/30';
      if (m >= 5 && m <= 7) return 'from-yellow-100/30 to-orange-100/30';
      if (m >= 8 && m <= 10) return 'from-orange-100/30 to-amber-100/30';
      return 'from-blue-100/30 to-indigo-100/30';
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = formatDateStandard(selectedDay);
    const list = eventsByDate[key] || [];
    return [...list].sort(sortEventsAscending);
  }, [selectedDay, eventsByDate]);

  const renderCalendarGrid = () => {
    const days = [];
    const today = new Date();
    const todayKey = formatDateStandard(today);

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 md:h-16 w-full"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let dayEvents = eventsByDate[dateKey];
      
      if (dayEvents) {
          dayEvents = [...dayEvents].sort(sortEventsAscending);
      }

      const hasEvents = dayEvents && dayEvents.length > 0;
      const isSelected = selectedDay && dateKey === formatDateStandard(selectedDay);
      const isToday = dateKey === todayKey;
      
      const coverPhoto = showPhotos && hasEvents 
        ? dayEvents.find(e => !e.isSystemEvent && e.imageUrls && e.imageUrls.length > 0)?.imageUrls[0] 
        : null;

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`
            relative h-10 md:h-16 w-full flex flex-col items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 overflow-hidden
            ${isSelected 
              ? 'bg-seal-50 border-2 border-ink-300 shadow-md transform scale-105 z-10' 
              : 'hover:bg-seal-50/50'}
            ${!coverPhoto && isToday && !isSelected ? 'bg-seal-50 border border-seal-100' : ''}
          `}
        >
          {coverPhoto && (
              <>
                <img src={coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-900/60 via-transparent to-transparent"></div>
              </>
          )}

          <span className={`
            relative z-10 text-xs md:text-sm font-medium
            ${coverPhoto ? 'text-white font-bold drop-shadow-md' : (isToday ? 'text-seal-600 font-bold' : 'text-slate-700')}
          `}>
            {day}
          </span>
          
          {hasEvents && !coverPhoto && (
             <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 items-center z-20">
               {dayEvents.slice(0, 3).map((evt) => {
                  const firstTag = (evt.tags || [])[0];
                  const cfg = firstTag ? getTagConfig(firstTag) : getTagConfig('日常');
                  const isMilestone = (evt.tags || []).includes('里程碑');
                  return (
                    <span
                      key={`dot-${evt.id}`}
                      className="text-[10px] leading-none drop-shadow-sm"
                      title={cfg.label}
                    >{cfg.emoji}</span>
                  );
               })}
               {dayEvents.length > 3 && <span className="text-[9px] text-ink-400 font-bold ml-0.5">+</span>}
             </div>
          )}
          {hasEvents && coverPhoto && (
             <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 items-center z-20">
               {dayEvents.slice(0, 3).map((evt) => {
                  const firstTag = (evt.tags || [])[0];
                  const cfg = firstTag ? getTagConfig(firstTag) : getTagConfig('日常');
                  return (
                    <span
                      key={`dot-${evt.id}`}
                      className="text-[9px] leading-none drop-shadow-sm"
                      title={cfg.label}
                    >{cfg.emoji}</span>
                  );
               })}
               {dayEvents.length > 3 && <span className="text-[8px] text-white font-bold ml-0.5 drop-shadow-md">+</span>}
             </div>
          )}
          {hasEvents && (
             <div className={`absolute inset-0 rounded-lg md:rounded-xl pointer-events-none ${isSelected ? '' : 'bg-seal-100/40'}`} />
          )}

          {coverPhoto && dayEvents.some(e => (e.tags || []).includes('里程碑')) && (
              <div className="absolute top-0.5 right-0.5 text-white drop-shadow-md">
                  <HeartIcon className="w-3 h-3 fill-current" />
              </div>
          )}
        </button>
      );
    }
    return days;
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div className="h-full relative">
        {isNavOpen && (
            <div className="fixed inset-0 z-[100] bg-paper-surface/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fadeIn">
                <button onClick={() => setIsNavOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                    <XIcon className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-6 mb-8">
                    <button onClick={() => handleYearChange(year - 1)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700"><ChevronLeftIcon className="w-6 h-6" /></button>
                    <span className="text-4xl font-bold text-slate-800 font-title">{year}</span>
                    <button onClick={() => handleYearChange(year + 1)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700"><ChevronRightIcon className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                    {months.map((m, i) => (
                        <button 
                            key={m} 
                            onClick={() => handleMonthSelect(i)}
                            className={`p-3 rounded-xl text-sm font-bold transition-all ${i === month ? 'bg-seal-500 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="p-4 md:p-6 pt-12 safe-area-top pb-40"> 
                <div className={`bg-paper-surface/90 backdrop-blur-xl border border-seal-100 rounded-3xl p-4 md:p-6 shadow-[0_10px_40px_-10px_rgba(251,113,133,0.15)] relative overflow-hidden`}>
                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${getSeasonGradient(month)} blur-3xl opacity-60 pointer-events-none`}></div>
                    <div className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr ${getSeasonGradient(month)} blur-3xl opacity-60 pointer-events-none`}></div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="w-10 md:hidden"></div>
                        <div className="flex items-center gap-2 bg-paper-surface/50 backdrop-blur-sm px-2 py-1 rounded-full border border-seal-50 shadow-sm mx-auto md:mx-0">
                            <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-seal-50 text-slate-500 hover:text-seal-500 transition-colors">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsNavOpen(true)} className="px-2 py-1 rounded-lg hover:bg-seal-50 text-slate-800 transition-colors group">
                                <span className="text-lg font-bold font-title tracking-wider group-hover:text-seal-500 transition-colors whitespace-nowrap">
                                    {year}年 {months[month]}
                                </span>
                            </button>
                            <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-seal-50 text-slate-500 hover:text-seal-500 transition-colors">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowPhotos(!showPhotos)}
                                className={`p-2.5 rounded-full transition-all flex items-center justify-center ${showPhotos ? 'bg-seal-500 text-white shadow-md shadow-seal-100' : 'bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200'}`}
                            >
                                {showPhotos ? <GridIcon className="w-4 h-4" /> : <CameraIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 mb-2 border-b border-gray-100 pb-2 relative z-10">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-[10px] md:text-xs font-bold text-ink-400 uppercase tracking-widest py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 md:gap-2 relative z-10">
                        {renderCalendarGrid()}
                    </div>

                    <div className="mt-4 pt-4 border-t border-seal-50 flex justify-between items-center text-xs text-slate-500 px-2 relative z-10">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-blue-400" /> 
                                <span className="text-slate-600 font-medium">{monthlyStats.memoryCount}</span> 记忆
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPinIcon className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-slate-600 font-medium">{monthlyStats.locationCount}</span> 地点
                            </span>
                        </div>
                        {monthlyStats.milestoneCount > 0 && (
                            <span className="flex items-center gap-1.5 text-seal-500 font-bold">
                                <HeartIcon className="w-3.5 h-3.5" /> 
                                {monthlyStats.milestoneCount} 里程碑
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    {selectedDay ? (
                        <div className="animate-slideInUp">
                            <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-transparent z-10">
                                <h3 className="text-slate-700 font-bold flex items-center gap-2 text-sm uppercase tracking-widest bg-paper-surface/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-seal-100 shadow-sm">
                                    <div className="w-2 h-2 bg-seal-500 rounded-full"></div>
                                    {selectedDay.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                                </h3>
                            </div>
                            
                            {selectedDayEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedDayEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            onClick={() => onSelectEvent(event.id)}
                                            className={`bg-paper-surface border p-4 rounded-2xl cursor-pointer transition-all hover:translate-x-1 hover:shadow-lg group flex gap-4 items-center relative overflow-hidden
                                                ${event.isSystemEvent ? 'border-amber-200 bg-gold-50/50 hover:border-amber-300' : 'border-slate-100 hover:shadow-seal-50'}
                                            `}
                                        >
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${event.isSystemEvent ? 'from-orange-400 to-amber-300' : 'from-seal-400 to-seal-100'}`}></div>

                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 relative z-10 shadow-md 
                                                ${event.isSystemEvent 
                                                    ? 'bg-gradient-to-br from-amber-400 to-seal-600' 
                                                    : ((event.tags || []).includes('里程碑') ? 'bg-gradient-to-br from-seal-400 to-seal-600' : 'bg-slate-400')}
                                            `}>
                                                {event.title.includes('上香') || event.title.includes('祈福') ? <FlameIcon className="w-6 h-6" /> :
                                                 event.title.includes('孔明灯') ? <LanternIcon className="w-6 h-6" /> :
                                                 event.title.includes('爱心雨') ? <HeartIcon className="w-6 h-6" /> :
                                                 ((event.tags || []).includes('里程碑') ? <HeartIcon className="w-6 h-6" /> : <MapPinIcon className="w-5 h-5" />)
                                                }
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 relative z-10">
                                                <h4 className={`font-bold truncate ${event.isSystemEvent ? 'text-amber-800' : 'text-slate-800'} group-hover:text-seal-500 transition-colors`}>
                                                    {event.title}
                                                </h4>
                                                <p className={`text-sm mt-1 line-clamp-2 leading-relaxed ${event.isSystemEvent ? 'text-slate-700 italic font-serif' : 'text-slate-500'}`}>
                                                    {event.isSystemEvent ? `"${event.shortDescription}"` : event.shortDescription}
                                                </p>
                                                {!event.isSystemEvent && (
                                                    <p className="text-slate-400 text-[10px] mt-1 flex items-center gap-1">
                                                        <MapPinIcon className="w-3 h-3" /> {event.location.name}
                                                    </p>
                                                )}
                                            </div>

                                            {event.imageUrls && event.imageUrls.length > 0 && (
                                                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0 relative z-10 rotate-3">
                                                    <img src={event.imageUrls[0]} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-400 bg-paper-surface/50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center gap-2">
                                    <p className="text-sm">这一天还没有记录回忆。</p>
                                    <p className="text-xs text-ink-300 mt-1">去仪式里进行祈福或放飞孔明灯吧！</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                            <CalendarIcon className="w-12 h-12 mb-2 text-gold-300" />
                            <p className="text-sm">选择一个日期查看回忆</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CalendarView;
