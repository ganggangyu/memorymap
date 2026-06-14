
import React, { useRef, useEffect, useState } from 'react';
import { XIcon, LanternIcon, SparklesIcon } from './icons';

interface FloatingLanternsProps {
  isOpen: boolean;
  onClose: () => void;
  onWishMade?: (wish: string) => void;
}

class Lantern {
  x: number;
  y: number;
  width: number;
  height: number;
  riseSpeed: number;
  driftSpeed: number;
  driftOffset: number;
  colorHue: number;
  opacity: number;
  text?: string;
  scale: number;

  constructor(canvasWidth: number, canvasHeight: number, text?: string) {
    this.scale = text ? 1.5 : Math.random() * 0.5 + 0.6; // Scale factor (0.6 to 1.1)
    this.width = 35 * this.scale;
    this.height = 50 * this.scale;
    
    // Start at random x
    this.x = Math.random() * canvasWidth;
    // Distribute initially across the screen height, plus some below
    this.y = Math.random() * (canvasHeight + 200);
    
    if (text) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight + 100; // Start just below screen
    }

    // Very slow, peaceful rise (0.2 to 0.5 pixels per frame)
    this.riseSpeed = (Math.random() * 0.3 + 0.2) * (text ? 1.2 : 1); 
    
    // Side drift parameters (very slow frequency)
    this.driftSpeed = Math.random() * 0.005 + 0.002;
    this.driftOffset = Math.random() * Math.PI * 2;

    // Warm hues: predominantly golden-orange (30-45), occasional deep red (10-15)
    this.colorHue = Math.random() < 0.8 ? (Math.random() * 15 + 30) : (Math.random() * 10 + 5);
    
    // Stable opacity - no drastic fading in/out
    this.opacity = text ? 1 : Math.random() * 0.3 + 0.6;
    this.text = text;
  }

  update(time: number) {
    // Move up
    this.y -= this.riseSpeed;

    // Gentle side-to-side sway (sine wave position)
    const sway = Math.sin(time * this.driftSpeed + this.driftOffset);
    this.x += sway * 0.3;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Gentle flame flicker effect (affects light radius/intensity, NOT global opacity)
    // Using two sine waves creates a more natural, non-repetitive flicker
    const flicker = Math.sin(time * 0.1 + this.driftOffset * 10) * 0.05 + 
                    Math.cos(time * 0.23 + this.driftOffset * 5) * 0.05;
    
    // 1. Inner Glow (The Candle Light)
    // Centered towards the bottom where the fuel cell is
    const glowRadius = this.width * (1.3 + flicker);
    const glow = ctx.createRadialGradient(0, this.height * 0.3, 0, 0, this.height * 0.3, glowRadius);
    
    // Bright yellow/white core
    glow.addColorStop(0, `hsla(50, 100%, 90%, ${this.opacity})`); 
    // Warm orange glow surrounding it
    glow.addColorStop(0.4, `hsla(${this.colorHue}, 100%, 60%, ${this.opacity * 0.6})`); 
    // Fade out to transparent
    glow.addColorStop(1, `hsla(${this.colorHue}, 100%, 50%, 0)`); 
    
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, this.height * 0.3, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Lantern Paper Body
    // Shape: Slightly wider top, rounded bottom (classic sky lantern)
    const w = this.width / 2;
    const h = this.height / 2;
    const topW = w * 1.2;
    const bottomW = w * 0.8;

    ctx.beginPath();
    ctx.moveTo(-topW, -h); // Top Left
    ctx.quadraticCurveTo(-w, 0, -bottomW, h); // Left Curve to Bottom
    ctx.lineTo(bottomW, h); // Bottom Line
    ctx.quadraticCurveTo(w, 0, topW, -h); // Right Curve to Top
    ctx.closePath();

    // Fill with semi-transparent paper gradient
    const paperGradient = ctx.createLinearGradient(0, -h, 0, h);
    // Lighter at top (far from flame), warmer/darker at bottom (near flame)
    paperGradient.addColorStop(0, `hsla(${this.colorHue}, 80%, 60%, ${this.opacity * 0.7})`);
    paperGradient.addColorStop(1, `hsla(${this.colorHue}, 90%, 45%, ${this.opacity * 0.85})`);
    ctx.fillStyle = paperGradient;
    ctx.fill();

    // 3. Structure (Rim and Wires)
    // Very faint lines to suggest structure without being harsh
    ctx.strokeStyle = `rgba(50, 20, 10, ${this.opacity * 0.3})`;
    ctx.lineWidth = 1;
    
    // Top Rim (Oval)
    ctx.beginPath();
    ctx.ellipse(0, -h, topW, w * 0.15, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Bottom Rim (Oval)
    ctx.beginPath();
    ctx.ellipse(0, h, bottomW, w * 0.15, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Text
    if (this.text) {
        ctx.fillStyle = 'rgba(40, 15, 5, 0.9)';
        ctx.font = `bold ${16 * this.scale}px "Dancing Script", cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw text with a slight shadow for readability
        ctx.shadowColor = "rgba(255,255,255,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(this.text, 0, -5);
        ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

const FloatingLanterns: React.FC<FloatingLanternsProps> = ({ isOpen, onClose, onWishMade }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wish, setWish] = useState('');
  
  // Use ref for lanterns to avoid re-renders during animation loop
  const lanternsRef = useRef<Lantern[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    
    // Initialize a set of lanterns
    // Check screen size to decide count (fewer on mobile for performance)
    const count = window.innerWidth < 600 ? 20 : 40;
    
    const initLanterns = Array.from({ length: count }).map(() => 
        new Lantern(window.innerWidth, window.innerHeight)
    );
    lanternsRef.current = initLanterns;

    const animate = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        // Clear with deep night sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#020617'); // Slate 950
        gradient.addColorStop(1, '#1e1b4b'); // Indigo 950
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        timeRef.current++;

        // Update and Draw
        // We filter out lanterns that have gone way above the screen to keep array clean
        lanternsRef.current = lanternsRef.current.filter(l => l.y > -150);
        
        lanternsRef.current.forEach(l => {
            l.update(timeRef.current);
            l.draw(ctx, timeRef.current);
        });

        // Gently spawn new lanterns to maintain density
        if (lanternsRef.current.length < count && Math.random() < 0.01) {
            const newL = new Lantern(width, height);
            newL.y = height + 50; // Start at bottom
            lanternsRef.current.push(newL);
        }

        animationRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
        cancelAnimationFrame(animationRef.current);
        window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleSendWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wish.trim()) return;
    
    if (canvasRef.current) {
        const newLantern = new Lantern(canvasRef.current.width, canvasRef.current.height, wish);
        lanternsRef.current.push(newLantern);
        if (onWishMade) onWishMade(wish);
        setWish('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black">
        <canvas ref={canvasRef} className="absolute inset-0 block" />
        
        {/* UI Overlay */}
        <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-2 bg-black/20 rounded-full backdrop-blur-sm">
                <XIcon className="w-8 h-8" />
            </button>
        </div>

        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center px-4 z-10 pointer-events-none">
            <div className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full max-w-md pointer-events-auto text-center animate-fadeIn shadow-2xl">
                <LanternIcon className="w-12 h-12 text-seal-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                <h2 className="text-2xl font-bold text-white mb-2 font-title">许一个愿</h2>
                <p className="text-white/70 mb-6 text-sm">让你的梦想飘进星空。</p>
                
                <form onSubmit={handleSendWish} className="flex gap-2">
                    <input 
                        type="text" 
                        value={wish}
                        onChange={(e) => setWish(e.target.value)}
                        placeholder="写下你的愿望..."
                        className="flex-1 bg-paper-surface/10 border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500 backdrop-blur-sm transition-all"
                        maxLength={30}
                    />
                    <button 
                        type="submit"
                        className="bg-gradient-to-r from-gold-500 to-seal-600 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 transform hover:scale-105 active:scale-95"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        放飞
                    </button>
                </form>
            </div>
            <button onClick={onClose} className="mt-4 text-white/40 hover:text-white text-sm font-medium transition-colors pointer-events-auto">
              关闭
            </button>
        </div>
    </div>
  );
};

export default FloatingLanterns;
