import React, { useRef, useState, useEffect } from 'react';
import { MemoryEvent } from '../types';
import { XIcon, DownloadIcon } from './icons';

interface PhotoCollageProps {
  isOpen: boolean;
  onClose: () => void;
  events: MemoryEvent[];
}

const PhotoCollage: React.FC<PhotoCollageProps> = ({ isOpen, onClose, events }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const photos = events
    .flatMap(e => (e.imageUrls || []).map(url => ({ url, event: e })))
    .slice(0, 30);

  useEffect(() => {
    if (!isOpen || photos.length === 0) return;
    setGenerating(true);
    setImageUrl(null);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const w = 800, h = 800;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = '#fff5f5';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 - 20;
    const count = photos.length;
    let loaded = 0;

    photos.forEach((photo, i) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loaded++;
        // Heart shape parametric equation
        const t = (i / count) * Math.PI * 2;
        const scale = 1 + (i % 3) * 0.1;
        const x = 16 * Math.pow(Math.sin(t), 3) * 12 * scale;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 12 * scale;
        const size = 60 + (i % 4) * 8;
        ctx.save();
        const sx = cx + x - size / 2;
        const sy = cy + y - size / 2;
        // Rounded clip
        ctx.beginPath();
        const r = 6;
        const px = sx, py = sy, pw = size, ph = size;
        ctx.moveTo(px + r, py);
        ctx.lineTo(px + pw - r, py);
        ctx.quadraticCurveTo(px + pw, py, px + pw, py + r);
        ctx.lineTo(px + pw, py + ph - r);
        ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
        ctx.lineTo(px + r, py + ph);
        ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
        ctx.lineTo(px, py + r);
        ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.closePath();
        ctx.clip();
        // Draw image centered and cropped
        const iar = img.width / img.height;
        const car = size / size;
        let dw = size, dh = size, dx = sx, dy = sy;
        if (iar > car) { dw = size * iar / car; dx = sx - (dw - size) / 2; }
        else { dh = size * car / iar; dy = sy - (dh - size) / 2; }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();

        if (loaded === count) {
          setImageUrl(canvas.toDataURL('image/jpeg', 0.9));
          setGenerating(false);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === count) {
          setImageUrl(canvas.toDataURL('image/jpeg', 0.9));
          setGenerating(false);
        }
      };
      img.src = photo.url;
    });
  }, [isOpen]);

  const handleSave = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `heart-collage-${new Date().toISOString().slice(0, 10)}.jpg`;
    a.click();
  };

  if (!isOpen) return null;
  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/70 backdrop-blur p-4" onClick={onClose}>
        <div className="bg-paper-surface rounded-3xl p-8 text-center max-w-sm" onClick={e => e.stopPropagation()}>
          <p className="text-lg font-bold mb-2">还没有照片</p>
          <p className="text-sm text-gray-500 mb-4">添加一些带照片的回忆再来拼接吧</p>
          <button onClick={onClose} className="px-6 py-2 bg-seal-500 text-white rounded-full font-bold">知道了</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-paper-surface rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">❤️ 爱心拼图</h3>
          <button onClick={onClose} className="p-2 hover:bg-paper-dark rounded-full"><XIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center">
          <canvas ref={canvasRef} className="hidden" />
          {generating ? (
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-seal-500 border-t-transparent" />
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="爱心拼图" className="w-full rounded-2xl shadow-lg" />
          ) : null}
          {imageUrl && (
            <button onClick={handleSave} className="mt-4 w-full py-3 bg-gradient-to-r from-seal-500 to-seal-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <DownloadIcon className="w-4 h-4" /> 保存图片
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoCollage;
