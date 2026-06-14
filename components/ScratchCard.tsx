
import React, { useRef, useEffect, useState } from 'react';

interface ScratchCardProps {
  width: number;
  height: number;
  children: React.ReactNode;
  onReveal?: () => void;
  coverColor?: string;
}

const ScratchCard: React.FC<ScratchCardProps> = ({ width, height, children, onReveal, coverColor = '#d1d5db' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas
    canvas.width = width;
    canvas.height = height;

    // Fill with cover color/pattern
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, width, height);
    
    // Add some noise/texture to look like a lottery card
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
    
    // Add text "Scratch Me"
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("✨ 刮开有惊喜 ✨", width / 2, height / 2);

    // Composite operation for scratching
    ctx.globalCompositeOperation = 'destination-out';
  }, [width, height, coverColor]);

  const handleStart = () => {
    isDrawing.current = true;
  };

  const handleEnd = () => {
    isDrawing.current = false;
    checkRevealPercentage();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = (e as React.MouseEvent).clientX - rect.left;
        y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkRevealPercentage = () => {
      const canvas = canvasRef.current;
      if (!canvas || isRevealed) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Sample pixels to check transparency
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparentPixels = 0;
      
      // Optimization: Check every 4th pixel to save performance
      for (let i = 0; i < pixels.length; i += 4 * 4) {
          if (pixels[i + 3] < 128) {
              transparentPixels++;
          }
      }
      
      const totalPixels = pixels.length / (4 * 4);
      const percentage = (transparentPixels / totalPixels) * 100;

      if (percentage > 50) {
          setIsRevealed(true);
          if (onReveal) onReveal();
      }
  };

  return (
    <div className="relative overflow-hidden rounded-xl shadow-inner select-none" style={{ width, height }}>
        {/* Content Layer */}
        <div className={`absolute inset-0 z-0 flex items-center justify-center bg-paper-surface transition-opacity duration-1000 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
            {children}
        </div>
        
        {/* Helper Hint (only visible when not revealed) */}
        {!isRevealed && (
             <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                 <span className="animate-pulse font-bold text-gray-400">Loading...</span>
             </div>
        )}

        {/* Scratch Layer */}
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-10 touch-none transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-crosshair'}`}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseMove={handleMove}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onTouchMove={handleMove}
        />
    </div>
  );
};

export default ScratchCard;
