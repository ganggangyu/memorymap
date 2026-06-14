import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { MemoryEvent } from '../types';
import { XIcon, DownloadIcon, StampIcon, LayoutIcon, TicketIcon, CameraIcon, DiscIcon, FilmIcon } from './icons';

interface SouvenirModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: MemoryEvent;
}

type SouvenirMode = 'postcard' | 'instant' | 'ticket' | 'magazine' | 'vinyl' | 'film';

const MODES: { id: SouvenirMode; icon: React.FC<{ className?: string }>; label: string }[] = [
  { id: 'postcard', icon: StampIcon, label: '明信片' },
  { id: 'instant', icon: CameraIcon, label: '拍立得' },
  { id: 'ticket', icon: TicketIcon, label: '登机牌' },
  { id: 'magazine', icon: LayoutIcon, label: '杂志' },
  { id: 'vinyl', icon: DiscIcon, label: '黑胶' },
  { id: 'film', icon: FilmIcon, label: '胶片' },
];

const SouvenirModal: React.FC<SouvenirModalProps> = ({ isOpen, onClose, event }) => {
  const [mode, setMode] = useState<SouvenirMode>('postcard');
  const [isSaving, setIsSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const coverUrl = event.imageUrls?.[0] ?? '';

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!captureRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });
      const a = document.createElement('a');
      a.download = `memory-${mode}-${event.date}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const Postcard = () => (
    <div className="w-[320px] bg-[#faf8f0] shadow-2xl rounded-sm overflow-hidden">
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-handwriting text-xl">Memory</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h2 className="font-title text-2xl text-gray-800 leading-tight">{event.title}</h2>
          <div className="w-10 h-10 rounded-full bg-seal-100 flex items-center justify-center text-[9px] font-mono text-seal-600 border border-seal-200 shrink-0 ml-2">
            POST
          </div>
        </div>
        <p className="font-handwriting text-gray-500 text-sm leading-relaxed line-clamp-3 mb-3">
          {event.shortDescription}
        </p>
        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase tracking-wider border-t border-gray-200 pt-3">
          <span>{event.location.name}</span>
          <span>{event.date}</span>
        </div>
      </div>
    </div>
  );

  const Instant = () => (
    <div className="w-[300px] bg-white shadow-2xl p-3 pb-14 rotate-1">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-handwriting">No Photo</div>
        )}
      </div>
      <div className="mt-3 text-center font-handwriting text-gray-700 text-lg leading-tight px-2">
        {event.title}
      </div>
      <div className="text-center text-[10px] text-gray-400 font-mono mt-1">
        {event.date} · {event.location.name}
      </div>
    </div>
  );

  const Ticket = () => (
    <div className="w-[360px] bg-white shadow-2xl rounded-xl overflow-hidden flex">
      <div className="flex-1 p-5 border-r-2 border-dashed border-gray-200">
        <div className="text-[10px] font-bold text-seal-400 uppercase tracking-[0.25em] mb-3">Boarding Pass</div>
        <div className="text-3xl font-title text-gray-800 mb-4">{event.title}</div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><span className="text-gray-400 block text-[9px] uppercase">From</span><span className="font-bold text-gray-700">HOME</span></div>
          <div className="flex items-center justify-center text-seal-400 text-sm">✈</div>
          <div className="text-right"><span className="text-gray-400 block text-[9px] uppercase">To</span><span className="font-bold text-gray-700 text-right w-full block truncate">{event.location.name.slice(0, 8)}</span></div>
        </div>
        <div className="flex gap-4 mt-4 text-xs border-t border-gray-100 pt-3">
          <div><span className="text-gray-400 block text-[9px] uppercase">Date</span><span className="font-bold text-gray-700">{event.date}</span></div>
          <div><span className="text-gray-400 block text-[9px] uppercase">Gate</span><span className="font-bold text-gray-700">A{String(event.id).slice(-2)}</span></div>
          <div><span className="text-gray-400 block text-[9px] uppercase">Seat</span><span className="font-bold text-gray-700">1A & 1B</span></div>
        </div>
      </div>
      <div className="w-24 bg-seal-500 flex flex-col items-center justify-center text-white p-3">
        <div className="text-xs opacity-70 uppercase tracking-widest mb-1">Admit</div>
        <div className="text-xl font-black">TWO</div>
        <div className="mt-4 w-16 h-16 rounded-lg overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover opacity-90" crossOrigin="anonymous" />
          ) : null}
        </div>
      </div>
    </div>
  );

  const Magazine = () => (
    <div className="w-[300px] bg-white shadow-2xl">
      <div className="aspect-[3/4] relative overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">NO IMAGE</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-8 left-0 right-0 text-center">
          <div className="text-5xl font-serif font-bold text-white tracking-[0.15em] drop-shadow-md">VOGUE</div>
          <div className="text-[9px] text-white/80 tracking-[0.35em] uppercase mt-1">Romance Edition · {event.date}</div>
        </div>
        <div className="absolute bottom-10 left-6 right-6 text-white">
          <h2 className="text-3xl font-serif italic leading-none mb-2">{event.title}</h2>
          <p className="text-xs opacity-80 uppercase tracking-wider">{event.location.name}</p>
        </div>
      </div>
    </div>
  );

  const Vinyl = () => (
    <div className="relative w-[360px] h-[360px] flex items-center justify-center">
      {/* Sleeve */}
      <div className="absolute inset-0 bg-white shadow-2xl rounded-sm overflow-hidden z-10">
        {coverUrl ? (
          <img src={coverUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">No Cover</div>
        )}
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-10 left-0 right-0 text-center text-white">
          <div className="font-bold text-lg tracking-wider drop-shadow-lg">{event.title}</div>
          <div className="text-xs font-mono opacity-75">{event.date}</div>
        </div>
      </div>
      {/* Record peeking out */}
      <div className="absolute -right-6 w-[180px] h-[180px] rounded-full bg-[#1a1a1a] shadow-xl flex items-center justify-center z-0">
        <div className="absolute inset-3 rounded-full border border-gray-800" />
        <div className="absolute inset-8 rounded-full border border-gray-800" />
        <div className="absolute inset-14 rounded-full border border-gray-800" />
        <div className="w-12 h-12 rounded-full bg-seal-500 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
        </div>
      </div>
    </div>
  );

  const Film = () => (
    <div className="bg-[#111] p-4 shadow-2xl w-[260px]">
      {(event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls.slice(0, 3) : [null]).map((url, i) => (
        <div key={i} className="mb-4 last:mb-0">
          {/* Sprocket holes top */}
          <div className="flex gap-3 mb-1 mx-2">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="w-2.5 h-2.5 rounded-sm bg-[#222]" />
            ))}
          </div>
          <div className="aspect-[16/10] bg-gray-800 overflow-hidden mx-1">
            {url ? (
              <img src={url} className="w-full h-full object-cover sepia-[0.5] contrast-110" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">NO FRAME</div>
            )}
          </div>
          <div className="flex gap-3 mt-1 mx-2">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="w-2.5 h-2.5 rounded-sm bg-[#222]" />
            ))}
          </div>
        </div>
      ))}
      <div className="text-center text-[#444] font-mono text-[10px] mt-2">{event.title} · {event.date}</div>
    </div>
  );

  const renderMode = () => {
    switch (mode) {
      case 'postcard': return <Postcard />;
      case 'instant': return <Instant />;
      case 'ticket': return <Ticket />;
      case 'magazine': return <Magazine />;
      case 'vinyl': return <Vinyl />;
      case 'film': return <Film />;
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/95 flex flex-col items-center justify-center animate-fadeIn" onClick={onClose}>
      {/* Top controls */}
      <div className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 flex items-center gap-3 z-50" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-full text-sm font-bold border border-white/20 hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <DownloadIcon className="w-4 h-4" />
          {isSaving ? '生成中...' : '保存'}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-full backdrop-blur-md">
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center p-8 pt-20 pb-36 overflow-auto" onClick={e => e.stopPropagation()}>
        <div ref={captureRef}>
          {renderMode()}
        </div>
      </div>

      {/* Mode switcher */}
      <div className="absolute bottom-[max(12px,env(safe-area-inset-bottom))] left-4 right-4 z-50" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center gap-1.5 bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 max-w-sm mx-auto border border-white/10">
          {MODES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all min-w-[52px] ${
                mode === id
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SouvenirModal;
