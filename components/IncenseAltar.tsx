
import React, { useEffect, useRef, useState } from 'react';
import { XIcon } from './icons';

interface IncenseAltarProps {
  isOpen: boolean;
  onClose: () => void;
  onPray?: (blessing: string) => void;
}

const BLESSINGS = [
  "愿 岁岁平安",
  "愿 万事胜意",
  "愿 所求皆如愿",
  "愿 平安喜乐",
  "愿 诸事顺遂",
  "愿 前程似锦",
  "愿 身体健康",
  "愿 幸福安康",
  "愿 得偿所愿",
  "愿 岁月静好",
  "愿 念念不忘 必有回响",
  "愿 山河无恙 人间皆安",
  "愿 心之所向 素履以往",
  "愿 且以深情 共白头",
  "愿 即使生活 依然热爱",
  "愿 长路漫漫 终有归途",
  "愿 所有的美好 不期而遇",
  "愿 所有的等待 不负归期",
  "愿 朝暮与年岁并往",
  "愿 这一生 温暖纯良"
];

// --- Audio Engine ---
class SpatialAudio {
    ctx: AudioContext | null = null;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playSparkSound() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Strike sound
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }
    
    playBellSound() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // Deep, resonant temple bell (Gong)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Lower frequency for a larger, grander bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t); 
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.05); // Stronger attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + 5.0); // Long decay
        
        // Add harmonics for richness
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(365, t); // Overtone
        gain2.gain.setValueAtTime(0, t);
        gain2.gain.linearRampToValueAtTime(0.1, t + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 3.0);

        osc.connect(gain);
        osc2.connect(gain2);
        gain.connect(this.ctx.destination);
        gain2.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 5.0);
        osc2.start(t);
        osc2.stop(t + 3.0);
    }
}

// --- Smoke Particle System ---
class SmokeParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; alpha: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.1; // Very still air
    this.vy = -Math.random() * 0.3 - 0.2; // Slow rise
    this.size = Math.random() * 3 + 2;
    this.maxLife = Math.random() * 400 + 200; 
    this.life = this.maxLife;
    this.alpha = 0;
  }

  update() {
    this.y += this.vy;
    this.vx += (Math.random() - 0.5) * 0.005; // Micro turbulence
    this.x += this.vx;
    
    this.size += 0.02; 
    this.life--;

    // Fade in and out curve
    if (this.life > this.maxLife * 0.8) {
        this.alpha = (this.maxLife - this.life) / (this.maxLife * 0.2) * 0.2;
    } else {
        this.alpha = (this.life / this.maxLife) * 0.2;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.alpha;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    // Incense smoke color (bluish grey)
    grad.addColorStop(0, 'rgba(200, 210, 230, 0.4)');
    grad.addColorStop(1, 'rgba(150, 160, 170, 0)'); 
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

const IncenseAltar: React.FC<IncenseAltarProps> = ({ isOpen, onClose, onPray }) => {
  const [isLit, setIsLit] = useState(false);
  const [blessingText, setBlessingText] = useState<string | null>(null);
  
  // Refs
  const audioSystem = useRef(new SpatialAudio());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<SmokeParticle[]>([]);
  
  // Ambient Sound
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Initialize & Ambient ---
  useEffect(() => {
      if (isOpen) {
          setIsLit(false);
          setBlessingText(null);
          particlesRef.current = []; 
          
          // Start Ambient (Temple Silence / Wind)
          const audio = new Audio('https://aistudiocdn.com/samples/wind-chimes.mp3'); 
          audio.loop = true;
          audio.volume = 0.1; // Very subtle
          audio.play().catch(() => {});
          ambientAudioRef.current = audio;
      } else {
          if (ambientAudioRef.current) {
              ambientAudioRef.current.pause();
              ambientAudioRef.current = null;
          }
      }
      return () => {
          if (ambientAudioRef.current) ambientAudioRef.current.pause();
      };
  }, [isOpen]);

  // --- Smoke Animation Loop ---
  useEffect(() => {
      if (!isOpen) return;
      
      const animate = () => {
          if (!canvasRef.current) return;
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;

          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          if (isLit) {
              const cx = canvasRef.current.width / 2;
              const h = canvasRef.current.height;
              
              // Emitter vertical position
              // Height - (25vh) - stick height approx 70px
              const emitterY = h - (h * 0.25) - 70;
              
              const emitters = [
                  { x: cx, y: emitterY },
                  { x: cx - 12, y: emitterY + 2 },
                  { x: cx + 12, y: emitterY + 2 },
              ];
              
              // Gentle consistent stream
              if (Math.random() < 0.5) {
                  const source = emitters[Math.floor(Math.random() * emitters.length)];
                  particlesRef.current.push(new SmokeParticle(source.x, source.y));
              }
          }

          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
              const p = particlesRef.current[i];
              p.update();
              p.draw(ctx);
              if (p.life <= 0) {
                  particlesRef.current.splice(i, 1);
              }
          }

          animationRef.current = requestAnimationFrame(animate);
      };

      const resize = () => {
          if (canvasRef.current) {
              canvasRef.current.width = window.innerWidth;
              canvasRef.current.height = window.innerHeight;
          }
      };
      resize();
      window.addEventListener('resize', resize);
      
      animate();
      return () => {
          cancelAnimationFrame(animationRef.current);
          window.removeEventListener('resize', resize);
      };
  }, [isOpen, isLit]);

  // --- Handlers ---

  const handleLight = () => {
      if (!isLit) {
          setIsLit(true);
          audioSystem.current.playSparkSound();
          
          // Play bell after a moment for impact
          setTimeout(() => audioSystem.current.playBellSound(), 600);
          
          const text = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
          
          // Show text
          setTimeout(() => setBlessingText(text), 1200);
          
          // Trigger save event
          if (onPray) {
              setTimeout(() => {
                  onPray(text);
              }, 1500);
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] bg-[#1a0505] flex flex-col items-center justify-center overflow-hidden animate-fadeIn font-serif">
        {/* === Background Layers === */}
        {/* Dark Red Wall Texture */}
        <div className="absolute inset-0 bg-[#2c0b0b] opacity-100 pointer-events-none"></div>
        {/* Subtle Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-40 mix-blend-multiply pointer-events-none"></div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0505] via-transparent to-[#000000] opacity-90 pointer-events-none"></div>
        
        {/* Golden Light Glow from Bottom */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[90vw] h-[60vh] bg-amber-600/10 rounded-t-full blur-[100px] transition-opacity duration-[3000ms] ${isLit ? 'opacity-100' : 'opacity-0'}`}></div>

        {/* Canvas for Smoke */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 z-50 text-white/30 hover:text-white transition-colors p-2 bg-black/20 rounded-full">
            <XIcon className="w-8 h-8" />
        </button>

        {/* === MAIN SCENE === */}
        <div className="relative z-40 flex flex-col items-center justify-center h-full w-full">
            
            {/* Blessing Text (Horizontal Layout - Premium Gold) */}
            <div className={`absolute top-[20%] transition-all duration-[2000ms] flex flex-col items-center gap-6 ${blessingText ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
                {/* Horizontal Text Container */}
                <div className="relative py-6 px-12">
                    {/* Glowing Backlight for Text */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-900/40 to-transparent blur-xl"></div>
                    
                    {/* Main Text - Embossed Gold Effect */}
                    <div className="relative text-3xl md:text-5xl font-title tracking-[0.3em] font-bold text-center leading-normal">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-[#fff7d6] via-[#ffd700] to-[#b8860b] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter brightness-125">
                            {blessingText}
                        </span>
                    </div>
                    
                    {/* Decorative Lines */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                </div>

                {/* Red Seal */}
                <div className="mt-4 opacity-90 transform rotate-[-2deg] border border-red-900/50 p-1 rounded-sm shadow-xl animate-float">
                    <div className="w-12 h-12 bg-[#8b0000] text-[#ffcccc] text-sm flex items-center justify-center font-serif font-bold border border-[#5c0000] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                        <div className="border border-[#ffcccc]/30 w-10 h-10 flex items-center justify-center">
                            上吉
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Censer Area */}
            <div 
                className="absolute bottom-[25vh] flex flex-col items-center cursor-pointer group scale-90 md:scale-100"
                onClick={handleLight}
            >
                {/* Incense Sticks */}
                <div className="relative flex justify-center items-end gap-4 mb-[-8px] z-20">
                    {/* Left Stick */}
                    <div className="relative flex flex-col items-center transform -rotate-[8deg] origin-bottom translate-y-1">
                        <div className={`w-[2px] h-[3px] rounded-full bg-orange-500 shadow-[0_0_6px_2px_rgba(255,100,0,0.8)] transition-opacity duration-700 mb-[-1px] ${isLit ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                        <div className="w-[1.5px] h-16 bg-[#a8a29e] rounded-t-sm opacity-80"></div>
                        <div className="w-[1.5px] h-8 bg-[#7f1d1d]"></div>
                    </div>
                    {/* Center Stick */}
                    <div className="relative flex flex-col items-center -translate-y-1">
                        <div className={`w-[2.5px] h-[4px] rounded-full bg-orange-500 shadow-[0_0_8px_3px_rgba(255,100,0,0.9)] transition-opacity duration-700 mb-[-1px] ${isLit ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                        <div className="w-[1.5px] h-20 bg-[#a8a29e] rounded-t-sm opacity-80"></div>
                        <div className="w-[1.5px] h-8 bg-[#7f1d1d]"></div>
                    </div>
                    {/* Right Stick */}
                    <div className="relative flex flex-col items-center transform rotate-[8deg] origin-bottom translate-y-1">
                        <div className={`w-[2px] h-[3px] rounded-full bg-orange-500 shadow-[0_0_6px_2px_rgba(255,100,0,0.8)] transition-opacity duration-700 mb-[-1px] ${isLit ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                        <div className="w-[1.5px] h-16 bg-[#a8a29e] rounded-t-sm opacity-80"></div>
                        <div className="w-[1.5px] h-8 bg-[#7f1d1d]"></div>
                    </div>
                </div>
                
                {/* Ash Layer */}
                <div className="w-28 h-4 bg-[#57534e] rounded-[50%] z-20 mt-[-2px] shadow-inner opacity-100"></div>

                {/* Ancient Vessel (Solid, Dark, Heavy) */}
                <div className="relative z-10 transition-transform duration-500 group-hover:scale-[1.01]">
                    {/* Main Body - Squat, Rounded */}
                    <div className="w-48 h-24 relative bg-gradient-to-b from-[#292524] via-[#1c1917] to-[#0c0a09] rounded-b-[4rem] rounded-t-sm shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_20px_40px_rgba(0,0,0,0.6)] border-t border-[#44403c]">
                        {/* Texture Overlay */}
                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] mix-blend-overlay rounded-b-[4rem]"></div>
                        
                        {/* Subtle Rim Highlight */}
                        <div className="absolute top-[2px] left-2 right-2 h-[1px] bg-paper-surface/10"></div>

                        {/* Central Relief (Simple Ring) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-12 border border-[#44403c]/30 rounded-full opacity-50"></div>
                    </div>

                    {/* Legs (Tripod Style - Thick) */}
                    <div className="absolute -bottom-3 left-8 w-6 h-8 bg-gradient-to-b from-[#1c1917] to-[#0c0a09] rounded-b-lg shadow-lg"></div>
                    <div className="absolute -bottom-3 right-8 w-6 h-8 bg-gradient-to-b from-[#1c1917] to-[#0c0a09] rounded-b-lg shadow-lg"></div>
                    {/* Back Leg (Shadow) */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-6 bg-[#000] rounded-b-xl -z-10 opacity-80"></div>
                    
                    {/* Handles (Ears) */}
                    <div className="absolute -top-4 -left-2 w-4 h-12 border-l-4 border-[#292524] rounded-l-full skew-x-6 shadow-md"></div>
                    <div className="absolute -top-4 -right-2 w-4 h-12 border-r-4 border-[#292524] rounded-r-full -skew-x-6 shadow-md"></div>
                </div>
                
                {/* Wooden Stand */}
                <div className="w-40 h-3 bg-[#3f2e26] rounded-full mt-2 shadow-2xl border-t border-[#5d4037] opacity-80"></div>

                {/* Interaction Hint */}
                {!isLit && (
                    <div className="absolute top-full mt-10 text-[#78716c] text-[10px] font-medium tracking-[0.4em] uppercase opacity-60 animate-pulse">
                        点击上香 • 祈愿安康
                    </div>
                )}
            </div>

            <button onClick={onClose} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 text-white/30 hover:text-white text-sm transition-colors">
              关闭
            </button>

        </div>
    </div>
  );
};

export default IncenseAltar;
