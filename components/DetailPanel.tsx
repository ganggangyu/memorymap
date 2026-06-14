
import React, { useState, useEffect, useRef } from 'react';
import { MemoryEvent } from '../types';
import {
    ArrowLeftIcon, SparklesIcon, EditIcon, MapPinIcon, CalendarIcon, StarIcon, TrashIcon,
    PlaneIcon, CoffeeIcon, UtensilsIcon, GiftIcon, GamepadIcon, TreeIcon, VideoIcon, LivePhotoIcon, MusicIcon, MusicNoteIcon
} from './icons';
import { formatDMS } from '../utils';
import { addEventToCalendar, downloadCalendarFile } from '../utils/calendar';

interface DetailPanelProps {
  event: MemoryEvent | null;
  onClose: () => void;
  onEdit: (event: MemoryEvent) => void;
  onDelete: (id: string) => void;
  onImageClick: (images: { url: string; event: MemoryEvent }[], index: number) => void;
  compact?: boolean;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ event: initialEvent, onClose, onEdit, onDelete, onImageClick, compact }) => {
  const [event, setEvent] = useState<MemoryEvent | null>(initialEvent);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlayingLive, setIsPlayingLive] = useState(false);

  // 核心优化：进入详情时拉取完整 Base64 字段
  useEffect(() => {
    if (initialEvent) {
        setEvent(initialEvent);
        setIsLoadingFull(false);
    }
    setCurrentIndex(0);
  }, [initialEvent]);

  if (!event) return <div className="h-full w-full bg-paper-surface/50 backdrop-blur" />;

  const handleLiveStart = () => {
      if (currentIndex === 0 && event.livePhotoUrl && liveVideoRef.current) {
          setIsPlayingLive(true);
          liveVideoRef.current.play().catch(() => {});
      }
  };

  const hasImages = event.imageUrls && event.imageUrls.length > 0;
  const lightboxImages = hasImages ? event.imageUrls.map(url => ({ url, event })) : [];
  
  return (
    <div className="h-full flex flex-col relative bg-paper-surface overflow-hidden">
        {/* 顶部按钮 — safe-area 避开状态栏 */}
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-0 right-0 px-4 z-50 flex justify-between items-start pointer-events-none">
            <button onClick={onClose} className="bg-black/20 backdrop-blur-md p-2.5 rounded-full border border-white/20 text-white pointer-events-auto"><ArrowLeftIcon className="w-6 h-6" /></button>
            <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => onEdit(event)} className="bg-black/20 backdrop-blur-md p-2.5 rounded-full border border-white/20 text-white"><EditIcon className="w-5 h-5" /></button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Hero Image */}
          <div className={`relative w-full bg-gray-900 overflow-hidden ${compact ? 'h-[25vh]' : 'h-[40vh]'}`}>
            {hasImages ? (
              <div className="w-full h-full relative cursor-pointer" onMouseEnter={handleLiveStart} onMouseLeave={() => setIsPlayingLive(false)}>
                {event.livePhotoUrl && <video ref={liveVideoRef} src={event.livePhotoUrl} className={`absolute inset-0 w-full h-full object-cover transition-opacity ${isPlayingLive ? 'opacity-100' : 'opacity-0'}`} muted loop playsInline />}
                <img src={event.imageUrls[currentIndex]} className={`w-full h-full object-cover transition-opacity ${isPlayingLive ? 'opacity-0' : 'opacity-100'}`} onClick={() => onImageClick(lightboxImages, currentIndex)} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
              </div>
            ) : <div className="w-full h-full bg-seal-50 flex items-center justify-center"><SparklesIcon className="w-16 h-16 text-gold-300" /></div>}

            <div className="absolute bottom-6 left-6 right-6 text-white animate-slideInUp">
                <h1 className="text-3xl font-title font-bold drop-shadow-lg">{event.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs font-medium opacity-80 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5"/> {event.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5"/> {event.location.name}</span>
                </div>
                {isLoadingFull && <div className="mt-4 flex items-center gap-2 text-[10px] text-ink-300 font-bold"><div className="w-2 h-2 bg-seal-400 rounded-full animate-ping"></div> 正在加载高清回忆细节...</div>}
            </div>
          </div>

          <div className="p-5 -mt-6 bg-paper-surface rounded-t-[2.5rem] relative z-10">
            <div className="w-12 h-1.5 bg-paper-dark rounded-full mx-auto mb-4"></div>

            <p className="text-base text-gray-600 font-handwriting leading-relaxed italic text-center mb-4">"{event.shortDescription}"</p>

            {event.longDescription && (
              <div className="bg-seal-50/50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{event.longDescription}</p>
              </div>
            )}

            {/* 视频播放 */}
            {event.videoUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                <video src={event.videoUrl} controls className="w-full max-h-64 object-contain bg-black" playsInline />
              </div>
            )}

            {/* 音频播放 */}
            {event.audioUrl && (
              <div className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <MusicNoteIcon className="w-6 h-6 text-seal-500 shrink-0" />
                  <audio src={event.audioUrl} controls className="flex-1 h-8" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-400 justify-center pb-2">
              <span>{formatDMS(event.location.coords[0], event.location.coords[1])}</span>
            </div>

            {/* 添加到日历 */}
            <div className="pt-3 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => {
                  if (window.plugins?.calendar) {
                    addEventToCalendar(event).then(success => {
                      if (success) alert('已添加到系统日历');
                      else alert('添加失败，请检查日历权限');
                    });
                  } else {
                    downloadCalendarFile(event);
                    alert('日历文件已下载，请打开导入');
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-seal-200 text-seal-600 rounded-full text-sm font-bold hover:bg-seal-50 active:scale-95 transition-all shadow-sm"
              >
                <CalendarIcon className="w-4 h-4" />
                添加到系统日历
              </button>
            </div>
          </div>
        </div>
        
    </div>
  );
};

export default DetailPanel;
