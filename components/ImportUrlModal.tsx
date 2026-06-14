
import React, { useState } from 'react';
import { XIcon, DownloadIcon, LinkIcon, EditIcon } from './icons';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => void;
}

const ImportUrlModal: React.FC<ImportUrlModalProps> = ({ isOpen, onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Safety checks for common non-direct links
    if (url.includes('pan.baidu.com') || url.includes('yun.baidu.com')) {
        setError('百度网盘通常不是直链。请确保链接点击后能直接开始下载文件。');
        return;
    }
    if (url.includes('drive.google.com') && !url.includes('export=download')) {
         setError('Google Drive 链接需要是直接下载链接 (包含 export=download)。');
         return;
    }

    onImport(url);
    // Don't clear URL immediately in case of error, handled by parent usually but keeping UI persistent helps
    setError(null);
    onClose();
  };

  const handlePaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          if (text) setUrl(text);
      } catch (err) {
          // Fallback or permission denied
          console.warn("Clipboard access denied");
      }
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div 
            className="bg-paper-surface w-full max-w-lg rounded-3xl shadow-2xl p-8 relative border border-slate-100" 
            onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                <XIcon className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-8 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-100 transform rotate-3">
                    <LinkIcon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">云端导入 (Cloud Import)</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs">
                    无需下载文件。输入 ZIP 或 JSON 文件的<span className="font-bold text-slate-700">直链 (Direct Link)</span>，App 将自动同步所有回忆与媒体。
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative group">
                    <input 
                        type="url" 
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setError(null); }}
                        placeholder="https://example.com/backup.zip"
                        className="w-full pl-4 pr-24 py-4 rounded-xl border-2 border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500 focus:bg-paper-surface focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 font-medium placeholder:text-slate-400"
                        autoFocus
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button 
                            type="button"
                            onClick={handlePaste}
                            className="bg-paper-surface text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hover:border-blue-200 shadow-sm transition-all flex items-center gap-1"
                        >
                            <EditIcon className="w-3 h-3" /> 粘贴
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2 animate-shake">
                        <span className="text-lg">⚠️</span>
                        <span className="pt-0.5">{error}</span>
                    </div>
                )}

                <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                    <DownloadIcon className="w-5 h-5" />
                    开始同步数据
                </button>
                
                <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Supported Sources</p>
                    <div className="flex justify-center gap-3 mt-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">GitHub Raw</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">AWS S3</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">Cloudflare R2</span>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ImportUrlModal;
