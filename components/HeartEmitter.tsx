
import React, { useEffect, useRef } from 'react';

interface HeartOverlayProps {
  trigger: number;
}

// Romantic color palette
const COLORS = [
  'var(--seal-600)', // Rose 600
  'var(--seal-500)', // Rose 500
  'var(--seal-400)', // Rose 400
  'var(--gold-300)', // Rose 300
  'var(--seal-50)', // Rose 50
  '#fbbf24', // Amber 400 (Gold sparks)
];

const HeartOverlay: React.FC<HeartOverlayProps> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);
  const widthRef = useRef(0);
  const heightRef = useRef(0);

  class Particle {
    x: number;
    y: number;
    z: number; // Depth (0.5 = far, 1.5 = near)
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    size: number;
    color: string;
    type: 'heart' | 'circle';
    oscillationOffset: number;
    oscillationSpeed: number;

    constructor(w: number, h: number) {
      this.x = Math.random() * w;
      // Start above the screen with some variation
      this.y = -Math.random() * h * 0.5 - 50; 
      
      // Depth factor affects size and speed
      this.z = Math.random() * 1 + 0.5; 
      
      this.size = (Math.random() * 15 + 8) * this.z;
      
      // Velocity: Closer items fall faster
      this.vy = (Math.random() * 3 + 2) * this.z;
      this.vx = (Math.random() - 0.5) * 1;
      
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.1;
      
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      // 15% chance to be a golden sparkle circle
      this.type = Math.random() > 0.85 ? 'circle' : 'heart';
      
      this.oscillationOffset = Math.random() * Math.PI * 2;
      this.oscillationSpeed = Math.random() * 0.05 + 0.01;
    }

    update(dt: number, time: number) {
      // Gravity / Vertical movement
      this.y += this.vy * dt;
      
      // Horizontal sway (Wind effect) based on depth
      const windForce = Math.sin(time * this.oscillationSpeed + this.oscillationOffset) * 1.5;
      this.x += (windForce * this.z + this.vx) * dt;

      // Rotation tumbling
      this.rotation += this.rotationSpeed * dt;
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      // Fade out logic based on Z-index or just keep it somewhat transparent
      ctx.globalAlpha = Math.min(1, this.z * 0.8); 

      if (this.type === 'heart') {
        const s = this.size;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Perfect Heart Bezier Curves
        // Top left curve
        ctx.moveTo(0, -s * 0.3);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.9, -s * 1.1, -s * 0.4, 0, s * 0.8);
        // Top right curve
        ctx.bezierCurveTo(s * 1.1, -s * 0.4, s * 0.5, -s * 0.9, 0, -s * 0.3);
        ctx.fill();
        
        // Add a subtle shine/highlight for 3D feel
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(-s * 0.3, -s * 0.3, s * 0.15, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Draw Bokeh/Sparkle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Glow effect
        ctx.shadowBlur = 8 * this.z;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }
  }

  // --- Animation Loop ---
  const animate = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, widthRef.current, heightRef.current);

    // Stop loop if no particles left to save battery
    if (particlesRef.current.length === 0) {
        requestRef.current = requestAnimationFrame(animate);
        return;
    }

    // Filter out particles that have fallen off screen
    particlesRef.current = particlesRef.current.filter(p => p.y < heightRef.current + 100);

    // Update and Draw
    const dt = 1.0; // Normalized time step
    
    // Convert time to seconds-ish for sine waves
    const t = time * 0.005;

    particlesRef.current.forEach(p => {
      p.update(dt, t);
      p.draw(ctx);
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  // --- Resize Handler ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        widthRef.current = window.innerWidth;
        heightRef.current = window.innerHeight;
        canvasRef.current.width = widthRef.current;
        canvasRef.current.height = heightRef.current;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Start loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- Trigger Logic ---
  useEffect(() => {
    if (trigger === 0) return;

    // Spawn a large batch of particles
    // More particles on desktop, fewer on mobile for performance
    const spawnCount = window.innerWidth < 768 ? 50 : 100;
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < spawnCount; i++) {
        newParticles.push(new Particle(widthRef.current, heightRef.current));
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

  }, [trigger]);

  return (
    <canvas 
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9000]"
        style={{ width: '100%', height: '100%' }}
    />
  );
};

export default HeartOverlay;
