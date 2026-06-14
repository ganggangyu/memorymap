import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { MemoryEvent } from '../types';
import { sortEventsDescending } from '../utils';

interface ThreeDCarouselProps {
  events: MemoryEvent[];
  onImageClick: (images: { url: string; event: MemoryEvent }[], index: number) => void;
}

const ThreeDCarousel: React.FC<ThreeDCarouselProps> = ({ events, onImageClick }) => {
  const [rotation, setRotation] = useState(0);
  const [tilt, setTilt] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startRotation = useRef(0);
  const startTilt = useRef(0);
  const velocity = useRef(0);
  const tiltVelocity = useRef(0);
  const animationFrame = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Keep a mutable ref for the latest rotation, so onClick always reads fresh value
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  
  // Click-vs-doubleclick discrimination
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickIndex = useRef<number>(-1);
  const didDragThisGesture = useRef(false);

  const photos = useMemo(() => {
      const sortedEvents = [...events].sort(sortEventsDescending);
      const p: { url: string; event: MemoryEvent; globalIndex: number }[] = [];
      let globalIndexCounter = 0;
      sortedEvents.forEach(e => {
          if (e.imageUrls && e.imageUrls.length > 0) {
              e.imageUrls.forEach(url => {
                  p.push({ url, event: e, globalIndex: globalIndexCounter++ });
              });
          }
      });
      return p.slice(0, 30);
  }, [events]);

  const count = photos.length;
  const radius = Math.max(300, count * 35);
  const angleStep = 360 / (count || 1);

  // Floating particles for subtle ambiance (static seed)
  const particles = useMemo(() => {
      return Array.from({ length: 40 }).map((_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.1,
          duration: Math.random() * 8 + 6,
          delay: Math.random() * 6
      }));
  }, []);

  // --- Inertia loop ---
  useEffect(() => {
    const inertiaLoop = () => {
        if (!isDragging.current) {
            velocity.current *= 0.95;
            tiltVelocity.current *= 0.9;
            
            // Gentle auto-spin when idle
            if (Math.abs(velocity.current) < 0.05) {
                velocity.current = velocity.current * 0.9 + 0.06 * 0.1;
            }
            
            setTilt(prev => prev * 0.95);
            setRotation(prev => prev - velocity.current);
        }
        animationFrame.current = requestAnimationFrame(inertiaLoop);
    };
    inertiaLoop();
    return () => cancelAnimationFrame(animationFrame.current);
  }, []);

  // --- Snap-to helper: computes the nearest target rotation for a given card index ---
  const snapToCard = useCallback((index: number) => {
      const currentAngle = index * angleStep;
      const neededRotation = -currentAngle;
      const currentRot = rotationRef.current; // always fresh
      const cycles = Math.round(currentRot / 360);
      const target = (cycles * 360) + neededRotation;
      setRotation(target);
      setTilt(0);
      velocity.current = 0;
  }, [angleStep]);

  // --- Pointer handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    didDragThisGesture.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startRotation.current = rotationRef.current;
    startTilt.current = tilt;
    velocity.current = 0;
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    
    // Threshold to distinguish drag from click
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDragThisGesture.current = true;
    }
    
    const newRotation = startRotation.current - dx * 0.3;
    let newTilt = startTilt.current + dy * 0.1;
    newTilt = Math.max(-15, Math.min(15, newTilt));

    setRotation(newRotation);
    setTilt(newTilt);
    velocity.current = dx * 0.05;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // --- Card click handler (discriminates single vs double click) ---
  const handleCardClick = useCallback((index: number) => {
      // If user was dragging, ignore clicks
      if (didDragThisGesture.current) {
          didDragThisGesture.current = false;
          return;
      }
      
      if (clickTimer.current && lastClickIndex.current === index) {
          // Second click on the same card within 350ms → double-click
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
          lastClickIndex.current = -1;
          // Open lightbox directly — NO rotation snap, instant open
          onImageClick(photos, index);
      } else {
          // First click (or click on different card) → clear any pending timer
          if (clickTimer.current) {
              clearTimeout(clickTimer.current);
          }
          lastClickIndex.current = index;
          clickTimer.current = setTimeout(() => {
              // Single-click confirmed after 350ms → snap rotation
              clickTimer.current = null;
              snapToCard(index);
          }, 350);
      }
  }, [photos, onImageClick, snapToCard]);

  // --- Compute which card is closest to "front" (for highlight effect) ---
  const frontCardIndex = useMemo(() => {
      if (count === 0) return -1;
      const normRot = ((rotation % 360) + 360) % 360;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < count; i++) {
          const cardAngle = (i * angleStep + normRot) % 360;
          const dist = Math.min(cardAngle, 360 - cardAngle);
          if (dist < bestDist) {
              bestDist = dist;
              bestIdx = i;
          }
      }
      return bestIdx;
  }, [rotation, count, angleStep]);

  if (photos.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: 'var(--paper-bg)' }}>
              <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-400">No photos to display</p>
          </div>
  );
  }

  return (
    <div 
        ref={containerRef}
        className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ 
            perspective: '1800px', 
            touchAction: 'none',
            background: 'linear-gradient(180deg, #0a0a1a 0%, #111827 40%, #1a1a2e 100%)'
        }}
    >
        {/* --- Inline animations --- */}
        <style>{`
            @keyframes floatUp {
                0%, 100% { transform: translateY(0) scale(1); opacity: var(--fp-op, 0.2); }
                50% { transform: translateY(-30px) scale(1.3); opacity: calc(var(--fp-op, 0.2) * 2); }
            }
            @keyframes glowPulse {
                0%, 100% { box-shadow: 0 0 30px rgba(244, 63, 94, 0.3), 0 0 60px rgba(244, 63, 94, 0.1); }
                50% { box-shadow: 0 0 50px rgba(244, 63, 94, 0.5), 0 0 90px rgba(244, 63, 94, 0.2); }
            }
            @keyframes shineSweep {
                0% { left: -100%; }
                100% { left: 200%; }
            }
            .floating-particle {
                animation: floatUp var(--fp-dur, 7s) infinite ease-in-out;
                animation-delay: var(--fp-del, 0s);
            }
            .card-front-glow {
                animation: glowPulse 3s infinite ease-in-out;
            }
        `}</style>

        {/* --- Floating particles (ambient) --- */}
        {particles.map(p => (
            <div
                key={p.id}
                className="floating-particle absolute rounded-full pointer-events-none"
                style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: `rgba(255,255,255,${p.opacity})`,
                    '--fp-op': String(p.opacity),
                    '--fp-dur': `${p.duration}s`,
                    '--fp-del': `${p.delay}s`,
                } as React.CSSProperties}
            />
        ))}

        {/* --- Floor / Horizon --- */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none">
            <div className="w-full h-full bg-gradient-to-t from-rose-900/10 via-indigo-900/5 to-transparent" />
            <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-rose-400/20 to-transparent" />
        </div>

        {/* --- Center spot glow --- */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full pointer-events-none"
            style={{
                background: 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%)',
            }}
        />

        {/* --- 3D Scene Root --- */}
        <div 
            className="absolute top-[45%] left-1/2 w-0 h-0"
            style={{ 
                transformStyle: 'preserve-3d',
                transform: `translateZ(-550px) rotateX(${tilt - 5}deg) rotateY(${rotation}deg)`,
                transition: isDragging.current ? 'none' : 'transform 0.1s linear',
            }}
        >
            {photos.map((photo, i) => {
                const isFront = i === frontCardIndex;
                return (
                <div 
                    key={i}
                    className={`
                        absolute top-0 left-0 w-[140px] h-[200px] -mt-[100px] -ml-[70px]
                        rounded-2xl cursor-pointer group
                        transition-all duration-500
                        ${isFront 
                            ? 'card-front-glow z-10' 
                            : 'hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]'
                        }
                    `}
                    style={{
                        transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                        backfaceVisibility: 'visible',
                        background: 'rgba(15, 15, 30, 0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: isFront 
                            ? '1.5px solid rgba(244, 63, 94, 0.5)' 
                            : '1px solid rgba(255,255,255,0.08)',
                    }}
                    onClick={() => handleCardClick(i)}
                >
                    {/* Photo area */}
                    <div className="relative w-full h-[75%] overflow-hidden rounded-t-2xl">
                        <img 
                            src={photo.url} 
                            alt={photo.event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            draggable={false}
                            loading="lazy"
                        />
                        {/* Shine sweep on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
                            <div className="absolute top-0 w-[60%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12"
                                style={{ animation: 'shineSweep 1.2s ease-in-out infinite' }}
                            />
                        </div>
                        {/* Front-card glow overlay */}
                        {isFront && (
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-rose-400/5 to-transparent pointer-events-none" />
                        )}
                    </div>

                    {/* Info bar */}
                    <div className="h-[25%] flex flex-col items-center justify-center px-2 rounded-b-2xl"
                        style={{ background: 'rgba(0,0,0,0.3)' }}
                    >
                        <p className="text-[10px] font-semibold text-white/90 truncate w-full text-center tracking-wide">
                            {photo.event.title}
                        </p>
                        <p className="text-[8px] text-rose-300/70 font-mono mt-0.5 tracking-wider">
                            {photo.event.date}
                        </p>
                    </div>

                    {/* Floor reflection */}
                    <div 
                        className="absolute top-full left-0 w-full h-full pointer-events-none"
                        style={{
                            transform: 'scaleY(-1) translateY(6px)',
                            opacity: isFront ? 0.35 : 0.15,
                            filter: 'blur(4px)',
                        }}
                    >
                        <div className="w-full h-[78%] overflow-hidden rounded-b-2xl"
                            style={{ background: 'rgba(0,0,0,0.4)' }}
                        >
                            <img 
                                src={photo.url} 
                                className="w-full h-full object-cover opacity-70"
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
                );
            })}
        </div>

        {/* --- Bottom indicator --- */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
            <div className="flex gap-1.5">
                {photos.slice(0, Math.min(count, 8)).map((_, i) => {
                    const isActive = i === frontCardIndex;
                    return (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-500 ${
                                isActive 
                                    ? 'w-5 h-1.5 bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
                                    : 'w-1.5 h-1.5 bg-white/15'
                            }`}
                        />
                    );
                })}
            </div>
            <span className="text-[10px] text-white/25 tracking-[0.25em] font-medium mt-1">
                DRAG · TAP TO FOCUS · DOUBLE-TAP TO VIEW
            </span>
        </div>
    </div>
  );
};

export default ThreeDCarousel;
