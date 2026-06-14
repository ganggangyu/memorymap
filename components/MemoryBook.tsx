import React, { useMemo, useRef, useState } from 'react';
import { MemoryEvent } from '../types';
import { sortEventsAscending } from '../utils';
import { XIcon, SparklesIcon } from './icons';

interface MemoryBookProps {
  isOpen: boolean;
  onClose: () => void;
  events: MemoryEvent[];
}

const MemoryBook: React.FC<MemoryBookProps> = ({ isOpen, onClose, events }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  const sorted = useMemo(() => events.filter(e => !e.isSystemEvent).sort(sortEventsAscending), [events]);

  const handleDownload = () => {
    if (!printRef.current) return;
    setPrinting(true);
    const content = printRef.current.innerHTML;
    const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>我们的旅程</title>' +
      '<style>body{font-family:"Noto Serif SC",serif;max-width:700px;margin:0 auto;padding:24px;color:#3c2415;background:#fffdf7}' +
      '.cover{text-align:center;padding:60px 0}.ink-line{height:1px;background:linear-gradient(to right,transparent,#c4a97d 10%,#8b7355 50%,#c4a97d 90%,transparent);margin:16px 0}' +
      '.toc-item{display:flex;align-items:center;gap:12px;font-size:14px;padding:4px 0}' +
      '.entry{margin-bottom:40px;padding-bottom:32px;border-bottom:1px dashed #f5ebd8}.entry img{width:100%;border-radius:12px;margin-bottom:12px}' +
      '.entry-quote{font-style:italic;color:#8b7355}.footer{text-align:center;padding:40px 0;color:#a89070}' +
      '</style></head><body>' + content + '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    // 直接导航到 blob URL 显示 HTML 页面
    location.href = url;
    setPrinting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex flex-col bg-paper-surface" onClick={onClose}>
      {/* 工具栏 */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-12 pb-4 border-b border-paper-cream no-print safe-area-top">
        <button onClick={onClose} className="p-2 hover:bg-paper-dark rounded-full"><XIcon className="w-5 h-5 text-ink-400" /></button>
        <h3 className="font-bold text-ink-800">📖 我们的书</h3>
        <div className="w-8" />
      </div>

      {/* 书内容 — 点击打印时会直接调浏览器打印 */}
      <div ref={printRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-12 pb-16 safe-area-top safe-area-bottom" onClick={e => e.stopPropagation()}>
        <div className="max-w-2xl mx-auto">

          {/* 封面 */}
          <div className="text-center pt-8 pb-16 page-break-after-always">
            <div className="text-7xl mb-8">💕</div>
            <h1 className="text-4xl font-bold text-ink-900 mb-4 font-title">我们的旅程</h1>
            <div className="ink-line w-32 mx-auto mb-6" />
            <p className="text-ink-400 text-sm mb-2">记录每一个心动瞬间</p>
            <p className="text-ink-300 text-xs">
              {sorted.length > 0 ? sorted[0].date : '——'} — {sorted.length > 0 ? sorted[sorted.length - 1].date : '——'}
            </p>
            <p className="text-ink-300 text-xs mt-1">共 {sorted.length} 篇回忆</p>
          </div>

          {/* 目录 */}
          <div className="mb-12 pb-8 border-b-2 border-dashed border-paper-cream page-break-after-always">
            <h2 className="text-xl font-bold text-ink-800 mb-6">目录</h2>
            <div className="space-y-2">
              {sorted.map((e, i) => (
                <div key={e.id} className="flex items-center gap-4 text-sm">
                  <span className="text-ink-300 tabular-nums w-8 text-right">{i + 1}</span>
                  <div className="ink-line flex-1 h-px" />
                  <span className="text-ink-600 font-medium">{e.title}</span>
                  <span className="text-ink-300 text-xs tabular-nums">{e.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 每一篇回忆 */}
          {sorted.map((e, i) => (
            <div key={e.id} className="mb-12 pb-8 border-b border-dashed border-paper-cream last:border-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-ink-300 text-xs font-mono">No.{i + 1}</span>
                <span className="text-ink-800 font-bold">{e.title}</span>
                <span className="text-ink-300 text-xs">{e.date}</span>
              </div>

              {e.imageUrls?.[0] && (
                <div className="rounded-2xl overflow-hidden mb-4 shadow-soft">
                  <img src={e.imageUrls[0]} alt={e.title} className="w-full object-cover" style={{ maxHeight: '400px' }} />
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 text-xs text-ink-400">
                <span>📍 {e.location.name}</span>
                {(e.tags || []).includes('里程碑') && <span className="tag-pill">里程碑</span>}
              </div>

              <p className="text-ink-600 leading-relaxed italic mb-3">"{e.shortDescription}"</p>

              {e.longDescription && (
                <p className="text-ink-500 text-sm leading-relaxed whitespace-pre-wrap">{e.longDescription}</p>
              )}

              {/* 多张照片 */}
              {e.imageUrls && e.imageUrls.length > 1 && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {e.imageUrls.slice(1).map((url, j) => (
                    <img key={j} src={url} alt="" className="rounded-xl object-cover w-full aspect-square shadow-soft" />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* 封底 */}
          <div className="text-center py-16">
            <div className="ink-line w-24 mx-auto mb-6" />
            <p className="text-ink-400 text-sm">Made with ❤️</p>
            <p className="text-ink-300 text-xs mt-1">时光信笺 · 我们的旅程</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 16px; }
          body { background: white; }
          .no-print { display: none !important; }
          .page-break-after-always { page-break-after: always; }
        }
      `}</style>
    </div>
  );
};

export default MemoryBook;
