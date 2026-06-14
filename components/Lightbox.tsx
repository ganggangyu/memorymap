
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { XIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, LivePhotoIcon, PlayIcon } from './icons';
import { MemoryEvent } from '../types';

interface LightboxProps {
  isOpen: boolean;
  images: { url: string; type?: 'image' | 'video'; event?: MemoryEvent }[];
  initialIndex: number;
  onClose: () => void;
  onGoToMemory?: (eventId: string) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ isOpen, images, initialIndex, onClose, onGoToMemory }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Touch swipe for mobile
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeThreshold = 60;

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setIsPlaying(true);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
      setIsPlaying(true);
      setIsZoomed(false);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - (e.changedTouches[0]?.clientX ?? touchStartX.current);
    const dy = Math.abs(touchStartY.current - (e.changedTouches[0]?.clientY ?? touchStartY.current));
    if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > dy) {
      if (dx > 0) handleNext();
      else handlePrev();
    }
  };

  if (!isOpen || images.length === 0) return null;

  const currentItem = images[currentIndex];
  const event = currentItem.event;
  const isVideo = currentItem.type === 'video';

  const toggleVideo = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (videoRef.current) {
          if (videoRef.current.paused) {
              videoRef.current.play();
              setIsPlaying(true);
          } else {
              videoRef.current.pause();
              setIsPlaying(false);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-md flex flex-col animate-fadeIn">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
         <div className="text-white/90 pointer-events-auto">
            {event && (
                <div className="flex flex-col">
                    <h3 className="font-bold text-lg text-shadow">{event.title}</h3>
                    <span className="text-xs opacity-80">{event.date}</span>
                </div>
            )}
         </div>
         <div className="flex items-center gap-4 pointer-events-auto">
             {event && onGoToMemory && (
                 <button 
                    onClick={() => onGoToMemory(event.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-paper-surface/10 hover:bg-paper-surface/20 text-white rounded-full text-sm transition-colors backdrop-blur-sm border border-white/20"
                 >
                     <MapPinIcon className="w-4 h-4" />
                     <span className="hidden sm:inline">查看回忆详情</span>
                 </button>
             )}
         </div>
      </div>

      {/* Main Content */}
      <div
        className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-4 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10 hidden md:block"
        >
            <ChevronLeftIcon className="w-8 h-8" />
        </button>
        
        <div 
            className="relative w-full h-full flex items-center justify-center"
            onClick={() => !isVideo && setIsZoomed(prev => !prev)}
        >
            {isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center" onClick={toggleVideo}>
                    <video 
                        ref={videoRef}
                        src={currentItem.url} 
                        className="max-h-screen max-w-full object-contain animate-fadeIn"
                        autoPlay
                        loop
                        playsInline
                    />
                    {/* Play/Pause Overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                <PlayIcon className="w-10 h-10 text-white ml-1" />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <img 
                    src={currentItem.url} 
                    alt={event?.title || 'Memory'} 
                    className={`max-h-screen max-w-full object-contain transition-transform duration-300 ease-out cursor-zoom-in ${isZoomed ? 'scale-150 cursor-zoom-out' : ''}`}
                    style={{ touchAction: 'none' }}
                />
            )}

            {/* Live Badge (Visible for video items) */}
            {isVideo && (
                <div className="absolute top-20 left-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded flex items-center gap-1.5 border border-white/10 pointer-events-none">
                    <LivePhotoIcon className={`w-3 h-3 ${isPlaying ? 'text-yellow-400 animate-pulse' : 'text-white/70'}`} />
                    <span className="text-[10px] font-bold text-white tracking-wider">LIVE PHOTO</span>
                </div>
            )}
        </div>

        <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-4 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10 hidden md:block"
        >
            <ChevronRightIcon className="w-8 h-8" />
        </button>
      </div>
      
      {/* Footer Controls & Persistent Close Button */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none">
          
          <div className="text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-auto">
              {currentIndex + 1} / {images.length}
          </div>

          <button 
            onClick={onClose}
            className="pointer-events-auto flex flex-col items-center justify-center gap-1 text-white/90 hover:text-white transition-colors group"
          >
              <div className="w-12 h-12 bg-paper-surface/10 group-hover:bg-paper-surface/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center shadow-lg">
                  <XIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase">关闭</span>
          </button>
      </div>
    </div>
  );
};

export default Lightbox;
