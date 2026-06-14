import React, { useState, useRef, useMemo, useEffect } from 'react';
import { XIcon, UploadIcon, CloudIcon, SearchIcon, TrashIcon, PhotoIcon, CheckIcon, CalendarIcon, PlusIcon, MapPinIcon } from './icons';
import { MemoryEvent } from '../types';
import { isR2Configured, saveR2Config, uploadBase64ToR2, listR2Files, deleteFileFromR2 } from '../r2';
import { syncToCloud, restoreFromCloud } from '../utils/cloudSync';
import { formatDateStandard } from '../utils';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile: (file: File) => void;
  currentEvents?: MemoryEvent[];
  onCleanOldImages?: () => void;
  onUpdateEventImageUrls?: (eventId: string, imageUrls: string[]) => Promise<void>;
  onUpdateEventDate?: (event: MemoryEvent) => Promise<void>;
  onCreateEvent?: (eventData: Omit<MemoryEvent, 'id'>) => Promise<void>;
  onDeleteEvents?: (ids: string[]) => Promise<void>;
}

const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({ isOpen, onClose, onImportFile, currentEvents, onCleanOldImages, onUpdateEventImageUrls, onUpdateEventDate, onCreateEvent, onDeleteEvents }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'r2' | 'clean' | 'gallery' | 'dates' | 'delete'>('r2');
  const [amapKey, setAmapKey] = useState(localStorage.getItem('amap_key') || '');
  const [r2Endpoint, setR2Endpoint] = useState('');
  const [r2AccessKey, setR2AccessKey] = useState('');
  const [r2SecretKey, setR2SecretKey] = useState('');
  const [r2Bucket, setR2Bucket] = useState('');
  const [r2PublicUrl, setR2PublicUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const r2Status = isR2Configured();

  // Gallery state
  const [r2Photos, setR2Photos] = useState<{key:string; url:string; size:number; lastModified:string}[]>([]);
  const [r2PhotosLoading, setR2PhotosLoading] = useState(false);
  const [r2PhotoError, setR2PhotoError] = useState('');
  const [selectedPhotoKeys, setSelectedPhotoKeys] = useState<Set<string>>(new Set());
  const [targetEventId, setTargetEventId] = useState('');
  const [deletingPhotos, setDeletingPhotos] = useState(false);
  const [showOrphanOnly, setShowOrphanOnly] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Date management state
  const [editedDates, setEditedDates] = useState<Record<string, string>>({});
  const [savingDates, setSavingDates] = useState<Set<string>>(new Set());
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(formatDateStandard(new Date()));
  const [newEventLocName, setNewEventLocName] = useState('');
  const [newEventLat, setNewEventLat] = useState('');
  const [newEventLng, setNewEventLng] = useState('');

  // Delete state
  const [deleteSelected, setDeleteSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Reset selections when modal closes or tab switches
  useEffect(() => {
    if (!isOpen) {
      setSelectedPhotoKeys(new Set());
      setTargetEventId('');
      setEditedDates({});
      setShowNewEventForm(false);
      setNewEventTitle('');
      setNewEventDate(formatDateStandard(new Date()));
      setNewEventLocName('');
      setNewEventLat('');
      setNewEventLng('');
      setDeleteSelected(new Set());
      setDeleting(false);
    }
  }, [isOpen]);

  // Load R2 photos when gallery tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'gallery' && r2Status && r2Photos.length === 0) {
      setR2PhotosLoading(true);
      setR2PhotoError('');
      listR2Files()
        .then(photos => { setR2Photos(photos); setR2PhotosLoading(false); })
        .catch(e => { setR2PhotoError('加载失败: ' + (e?.message || e)); setR2PhotosLoading(false); });
    }
  }, [isOpen, activeTab, r2Status]);

  // Compute which R2 photos are already used in any event
  const usedPhotoUrls = useMemo(() => {
    if (!currentEvents) return new Set<string>();
    const urls = new Set<string>();
    currentEvents.forEach(ev => (ev.imageUrls || []).forEach(u => urls.add(u)));
    return urls;
  }, [currentEvents]);

  // Filtered photos based on orphan toggle
  const displayPhotos = useMemo(() => {
    if (!showOrphanOnly) return r2Photos;
    return r2Photos.filter(p => !usedPhotoUrls.has(p.url));
  }, [r2Photos, showOrphanOnly, usedPhotoUrls]);

  const orphanCount = useMemo(() => r2Photos.filter(p => !usedPhotoUrls.has(p.url)).length, [r2Photos, usedPhotoUrls]);

  const togglePhotoSelection = (url: string) => {
    setSelectedPhotoKeys(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };
  const selectAllPhotos = () => setSelectedPhotoKeys(new Set(displayPhotos.map(p => p.url)));
  const deselectAllPhotos = () => setSelectedPhotoKeys(new Set());

  const handleAddPhotosToEvent = async () => {
    if (!targetEventId || selectedPhotoKeys.size === 0) return;
    const event = currentEvents?.find(e => e.id === targetEventId);
    if (!event) { alert('目标回忆已被删除，请重新选择'); return; }

    try {
      const currentUrls = new Set(event.imageUrls);
      selectedPhotoKeys.forEach(url => currentUrls.add(url));
      await onUpdateEventImageUrls?.(targetEventId, Array.from(currentUrls));
      alert(`✅ 已添加 ${selectedPhotoKeys.size} 张照片`);
      setSelectedPhotoKeys(new Set());
      setTargetEventId('');
    } catch (e: any) {
      alert('保存失败: ' + (e?.message || e));
    }
  };

  const handleDeleteR2Photos = async () => {
    if (selectedPhotoKeys.size === 0) return;
    if (!confirm(`确定从 R2 永久删除选中的 ${selectedPhotoKeys.size} 张照片？\n\n⚠️ 删除后，回忆中如果有引用这些照片将显示失败。`)) return;
    setDeletingPhotos(true);
    try {
      let deleted = 0;
      for (const url of selectedPhotoKeys) {
        const ok = await deleteFileFromR2(url);
        if (ok) deleted++;
      }
      // Refresh the photo list
      const fresh = await listR2Files();
      setR2Photos(fresh);
      setSelectedPhotoKeys(new Set());
      alert(`✅ 已删除 ${deleted}/${selectedPhotoKeys.size} 张照片`);
    } catch (e: any) {
      alert('删除失败: ' + (e?.message || e));
    } finally {
      setDeletingPhotos(false);
    }
  };

  const handleSaveDate = async (event: MemoryEvent) => {
    const newDate = editedDates[event.id];
    if (!newDate || newDate === event.date) return;

    setSavingDates(prev => new Set(prev).add(event.id));
    try {
      await onUpdateEventDate?.({ ...event, date: newDate });
      setEditedDates(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
    } catch {
      alert('保存失败');
    } finally {
      setSavingDates(prev => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }
  };

  const handleBatchSaveDates = async () => {
    if (!currentEvents) return;
    const toSave = currentEvents.filter(ev =>
      editedDates[ev.id] && editedDates[ev.id] !== ev.date
    );
    for (const ev of toSave) await handleSaveDate(ev);
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim()) { alert('请输入标题'); return; }
    if (!newEventDate) { alert('请选择日期'); return; }
    let coords: [number, number] = [0, 0];
    if (newEventLat && newEventLng) {
      const lat = parseFloat(newEventLat);
      const lng = parseFloat(newEventLng);
      if (isNaN(lat) || isNaN(lng)) { alert('坐标格式错误'); return; }
      coords = [lat, lng];
    }
    try {
      await onCreateEvent?.({
        title: newEventTitle.trim(),
        date: newEventDate,
        tags: ['日常'],
        shortDescription: '',
        longDescription: '',
        location: { name: newEventLocName.trim() || '未知地点', coords },
        imageUrls: [],
        isSystemEvent: false,
      });
      setShowNewEventForm(false);
      setNewEventTitle('');
      setNewEventDate(formatDateStandard(new Date()));
      setNewEventLocName('');
      setNewEventLat('');
      setNewEventLng('');
    } catch (e: any) {
      alert('创建失败: ' + (e?.message || e));
    }
  };

  const toggleDeleteSelect = (id: string) => {
    setDeleteSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (deleteSelected.size === 0) return;
    if (!confirm(`确定删除选中的 ${deleteSelected.size} 条回忆？此操作不可撤销！`)) return;
    setDeleting(true);
    try {
      await onDeleteEvents?.(Array.from(deleteSelected));
      setDeleteSelected(new Set());
    } catch (e: any) {
      alert('删除失败: ' + (e?.message || e));
    } finally {
      setDeleting(false);
    }
  };

  const handleExportData = () => {
    const data = localStorage.getItem('romantic_journey_local_events');
    if (!data) { alert('没有数据可导出'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memorymap_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ 数据已导出！');
  };

  const storageStats = useMemo(() => {
    if (!currentEvents) return null;
    let totalBase64Photos = 0;
    let eventsWithBase64 = 0;
    currentEvents.forEach(e => {
      let photoCount = 0;
      (e.imageUrls || []).forEach(url => {
        if (url.startsWith('data:')) photoCount++;
      });
      if (photoCount > 0) {
        totalBase64Photos += photoCount;
        eventsWithBase64++;
      }
    });
    const totalJson = localStorage.getItem('romantic_journey_local_events')?.length || 0;
    return {
      totalJsonKB: Math.round(totalJson / 1024),
      totalBase64Photos,
      eventsWithBase64,
    };
  }, [currentEvents]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onImportFile(file); onClose(); }
  };

  const dirtyCount = currentEvents?.filter(ev =>
    editedDates[ev.id] && editedDates[ev.id] !== ev.date
  ).length || 0;

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-paper-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex bg-slate-50 p-2 shrink-0 border-b border-slate-100 gap-1 overflow-x-auto">
          <button onClick={() => setActiveTab('r2')} className={`shrink-0 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'r2' ? 'bg-paper-surface text-orange-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <CloudIcon className="w-3.5 h-3.5" />R2
          </button>
          <button onClick={() => setActiveTab('gallery')} className={`shrink-0 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'gallery' ? 'bg-paper-surface text-pink-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <PhotoIcon className="w-3.5 h-3.5" />R2相册
          </button>
          <button onClick={() => setActiveTab('dates')} className={`shrink-0 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'dates' ? 'bg-paper-surface text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <CalendarIcon className="w-3.5 h-3.5" />日期管理
          </button>
          <button onClick={() => setActiveTab('delete')} className={`shrink-0 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'delete' ? 'bg-paper-surface text-red-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <TrashIcon className="w-3.5 h-3.5" />删除
          </button>
          <button onClick={() => setActiveTab('clean')} className={`shrink-0 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'clean' ? 'bg-paper-surface text-amber-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <TrashIcon className="w-3.5 h-3.5" />清理
          </button>
          <button onClick={() => setActiveTab('import')} className={`shrink-0 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'import' ? 'bg-paper-surface text-purple-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}>
            <UploadIcon className="w-3.5 h-3.5" />备份
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar">
          {/* ===== R2 Config Tab ===== */}
          {activeTab === 'r2' && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${r2Status ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">🌩️ Cloudflare R2 存储</h4>
                <p className="opacity-90">{r2Status ? '已配置，照片上传 R2，免流出流量费。' : '照片存手机本地。配置 R2 后无限存储、免流出费。'}</p>
              </div>

              <div className="bg-paper-surface p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-sm text-gray-700">R2 配置（已内置，可覆盖）</h4>
                <p className="text-xs text-gray-400">免费 10GB，流量免流。Cloudflare R2 → 存储桶 → 公开访问。</p>
                <input type="text" value={r2Endpoint} onChange={e => setR2Endpoint(e.target.value)}
                  placeholder="Endpoint (https://xxx.r2.cloudflarestorage.com)"
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                <input type="text" value={r2AccessKey} onChange={e => setR2AccessKey(e.target.value)}
                  placeholder="Access Key ID"
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                <input type="password" value={r2SecretKey} onChange={e => setR2SecretKey(e.target.value)}
                  placeholder="Secret Access Key"
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                <div className="flex gap-2">
                  <input type="text" value={r2Bucket} onChange={e => setR2Bucket(e.target.value)}
                    placeholder="Bucket 名称"
                    className="flex-1 p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                  <input type="text" value={r2PublicUrl} onChange={e => setR2PublicUrl(e.target.value)}
                    placeholder="公开 URL"
                    className="flex-1 p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                </div>
                <button
                  onClick={() => {
                    if (!r2Endpoint || !r2AccessKey || !r2SecretKey || !r2Bucket || !r2PublicUrl) {
                      alert('请填写所有必填项'); return;
                    }
                    saveR2Config({
                      endpoint: r2Endpoint.trim(),
                      accessKeyId: r2AccessKey.trim(),
                      secretAccessKey: r2SecretKey.trim(),
                      bucket: r2Bucket.trim(),
                      publicUrl: r2PublicUrl.trim().replace(/\/$/, ''),
                    });
                    alert('✅ R2 配置已保存！');
                  }}
                  className="w-full py-2.5 bg-orange-500 text-white text-xs font-bold rounded-lg active:scale-95"
                >
                  保存 R2 配置
                </button>
              </div>

              <div className="bg-paper-surface p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2 text-gray-700">
                  <SearchIcon className="w-4 h-4 text-blue-500" /> 高德地图 Key
                </h4>
                <div className="flex gap-2">
                  <input type="text" value={amapKey} onChange={e => setAmapKey(e.target.value)}
                    placeholder="粘贴高德 Web服务 Key"
                    className="flex-1 p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                  <button onClick={() => { localStorage.setItem('amap_key', amapKey.trim()); alert(amapKey.trim() ? '已保存' : '已清除'); }}
                    className="px-4 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-lg active:scale-95">保存</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== R2 Gallery Tab ===== */}
          {activeTab === 'gallery' && (
            <div className="space-y-4 animate-fadeIn">
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${r2Status ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">🖼️ R2 相册</h4>
                <p className="opacity-90">{r2Status ? '浏览 R2 上所有照片，选择照片分配给回忆。' : '请先配置 R2 存储。'}</p>
              </div>

              {!r2Status ? (
                <p className="text-xs text-slate-400 text-center py-8">请先在 R2 配置页完成设置</p>
              ) : r2PhotosLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent" /></div>
              ) : r2PhotoError ? (
                <div className="text-center py-4">
                  <p className="text-xs text-red-500 mb-2">{r2PhotoError}</p>
                  <button onClick={() => { setR2PhotoError(''); setR2Photos([]); }}
                    className="text-xs text-pink-600 font-bold underline">重试</button>
                </div>
              ) : r2Photos.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">R2 存储桶中暂无照片</p>
              ) : (
                <>
                  <div className="flex gap-2 items-end">
                    <select value={targetEventId} onChange={e => setTargetEventId(e.target.value)}
                      className="flex-1 p-2.5 rounded-lg border border-gray-200 text-xs bg-white">
                      <option value="">-- 选择目标回忆 --</option>
                      {currentEvents?.filter(e => !e.isSystemEvent).map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.date} {ev.title}</option>
                      ))}
                    </select>
                    <button
                      disabled={selectedPhotoKeys.size === 0 || !targetEventId}
                      onClick={handleAddPhotosToEvent}
                      className="shrink-0 py-2.5 px-4 bg-pink-500 text-white text-xs font-bold rounded-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      添加 ({selectedPhotoKeys.size})
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <button onClick={selectAllPhotos} className="text-pink-600 font-medium">全选</button>
                    <span>|</span>
                    <button onClick={deselectAllPhotos} className="text-slate-400">取消全选</button>
                    <span className="w-px h-4 bg-gray-300" />
                    <button
                      onClick={() => { setShowOrphanOnly(!showOrphanOnly); deselectAllPhotos(); }}
                      className={`font-medium transition-colors ${showOrphanOnly ? 'text-amber-600' : 'text-gray-400'}`}
                    >
                      {showOrphanOnly ? `✨ 未归属 (${orphanCount})` : `未归属 (${orphanCount})`}
                    </button>
                    <span className="ml-auto">{selectedPhotoKeys.size} / {displayPhotos.length} 已选</span>
                    {selectedPhotoKeys.size > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={handleDeleteR2Photos}
                          disabled={deletingPhotos}
                          className="text-red-500 font-medium disabled:opacity-40"
                        >
                          {deletingPhotos ? '删除中...' : '🗑️ 删除选中'}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {displayPhotos.map(photo => {
                      const isUsed = usedPhotoUrls.has(photo.url);
                      return (
                      <div key={photo.key}
                        onClick={() => togglePhotoSelection(photo.url)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedPhotoKeys.has(photo.url) ? 'border-pink-500 shadow-md scale-[0.96]' : 'border-gray-200 hover:border-pink-300'}`}>
                        <img src={photo.url} className="w-full h-full object-cover" loading="lazy" />
                        {!isUsed && !showOrphanOnly && (
                          <div className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow" title="未归属任何回忆">?</div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewUrl(photo.url); }}
                          className="absolute top-1 left-1 bg-black/50 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 active:scale-90 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                        </button>
                        {selectedPhotoKeys.has(photo.url) && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>

                  {showOrphanOnly && displayPhotos.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">✅ 所有照片都已归属回忆</p>
                  )}

                  {/* Fullscreen preview */}
                  {previewUrl && (
                    <div className="fixed inset-0 z-[8000] bg-black/95 flex items-center justify-center animate-fadeIn"
                      onClick={() => setPreviewUrl(null)}>
                      <button onClick={() => setPreviewUrl(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white z-10"><XIcon className="w-6 h-6" /></button>
                      <img src={previewUrl} className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
                        onClick={e => e.stopPropagation()} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Date Management Tab ===== */}
          {activeTab === 'dates' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs">
                <h4 className="font-bold text-sm mb-1 text-blue-800">📅 日期管理</h4>
                <p className="text-blue-700">修改回忆日期后自动重排。也可在此新建回忆。</p>
              </div>

              {/* 新建回忆按钮 */}
              <button
                onClick={() => setShowNewEventForm(!showNewEventForm)}
                className="w-full py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1.5"
              >
                <PlusIcon className="w-4 h-4" />
                {showNewEventForm ? '收起新建表单' : '新建回忆'}
              </button>

              {showNewEventForm && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-3 animate-fadeIn">
                  <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                    placeholder="回忆标题（必填）"
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs" />
                  <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs" />
                  <input type="text" value={newEventLocName} onChange={e => setNewEventLocName(e.target.value)}
                    placeholder="地点名称（如：上海·外滩）"
                    className="w-full p-2.5 rounded-lg border border-gray-200 text-xs" />
                  <div className="flex gap-2">
                    <input type="text" value={newEventLat} onChange={e => setNewEventLat(e.target.value)}
                      placeholder="纬度（如 31.2304）"
                      className="flex-1 p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                    <input type="text" value={newEventLng} onChange={e => setNewEventLng(e.target.value)}
                      placeholder="经度（如 121.4737）"
                      className="flex-1 p-2.5 rounded-lg border border-gray-200 text-xs font-mono" />
                  </div>
                  <p className="text-[10px] text-green-600">📌 留空坐标则默认 (0, 0)，后续可在地图编辑</p>
                  <button
                    onClick={handleCreateEvent}
                    className="w-full py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl active:scale-95"
                  >创建回忆</button>
                </div>
              )}

              {(!currentEvents || currentEvents.filter(e => !e.isSystemEvent).length === 0) && !showNewEventForm ? (
                <p className="text-xs text-slate-400 text-center py-4">暂无回忆数据</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {currentEvents
                      .filter(e => !e.isSystemEvent)
                      .sort((a, b) => {
                        const da = editedDates[a.id] || a.date;
                        const db = editedDates[b.id] || b.date;
                        return da.localeCompare(db);
                      })
                      .map(event => {
                        const isSaving = savingDates.has(event.id);
                        const currentDate = editedDates[event.id] ?? event.date;
                        const isDirty = editedDates[event.id] && editedDates[event.id] !== event.date;
                        return (
                          <div key={event.id} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${isDirty ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{event.title}</p>
                              <p className="text-[10px] text-slate-400">{event.date}</p>
                            </div>
                            <input
                              type="date"
                              value={currentDate}
                              onChange={e => setEditedDates(prev => ({ ...prev, [event.id]: e.target.value }))}
                              className="shrink-0 p-1.5 rounded-md border border-gray-200 text-xs w-32"
                            />
                            <button
                              disabled={isSaving || !isDirty}
                              onClick={() => handleSaveDate(event)}
                              className="shrink-0 py-1.5 px-3 bg-blue-500 text-white text-[10px] font-bold rounded-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              {isSaving ? '...' : '保存'}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  {dirtyCount > 0 && (
                    <button onClick={handleBatchSaveDates}
                      className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl active:scale-95">
                      批量保存全部修改 ({dirtyCount})
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Delete Tab ===== */}
          {activeTab === 'delete' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs">
                <h4 className="font-bold text-sm mb-1 text-red-800">🗑️ 删除回忆</h4>
                <p className="text-red-700">勾选回忆后点击删除。此操作不可撤销，删除前请确认。</p>
              </div>

              {!currentEvents || currentEvents.filter(e => !e.isSystemEvent).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">暂无回忆数据</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => {
                      const allIds = currentEvents.filter(e => !e.isSystemEvent).map(e => e.id);
                      setDeleteSelected(new Set(allIds));
                    }} className="text-red-600 font-medium underline">全选</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => setDeleteSelected(new Set())} className="text-slate-400 underline">取消全选</button>
                    <span className="ml-auto text-slate-400">{deleteSelected.size} / {currentEvents.filter(e => !e.isSystemEvent).length} 已选</span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {currentEvents
                      .filter(e => !e.isSystemEvent)
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(event => {
                        const isSelected = deleteSelected.has(event.id);
                        return (
                          <div key={event.id}
                            onClick={() => toggleDeleteSelect(event.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-red-400 bg-red-50/60 ring-1 ring-red-300' : 'border-gray-200 bg-white hover:border-red-200'}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                              {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                            <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                              {event.imageUrls?.[0] ? (
                                <img src={event.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-gray-300">📷</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{event.title}</p>
                              <p className="text-[10px] text-slate-400">{event.date} · {event.location.name}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    disabled={deleteSelected.size === 0 || deleting}
                    onClick={handleDeleteSelected}
                    className="w-full py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {deleting ? '删除中...' : `删除选中 (${deleteSelected.size})`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ===== Clean Tab ===== */}
          {activeTab === 'clean' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-800 text-xs">
                <h4 className="font-bold text-sm mb-1">💡 清理旧数据</h4>
                <p>旧照片存为 base64 占用了本地存储配额。清理后旧照片数据清空，可重新编辑上传到 R2。</p>
              </div>

              {storageStats ? (
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">总数据大小</span>
                    <span className={`font-bold ${storageStats.totalJsonKB > 4000 ? 'text-red-500' : 'text-slate-700'}`}>
                      {storageStats.totalJsonKB} KB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">旧 base64 图片</span>
                    <span className="font-bold text-amber-600">{storageStats.totalBase64Photos} 张</span>
                  </div>
                </div>
              ) : <p className="text-xs text-slate-400 text-center py-4">暂无数据</p>}

              {storageStats && storageStats.totalBase64Photos > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`清理 ${storageStats.totalBase64Photos} 张旧 base64 照片？`)) {
                      onCleanOldImages?.();
                      alert('✅ 清理完成！');
                    }
                  }}
                  className="w-full py-3 bg-amber-500 text-white text-sm font-bold rounded-xl active:scale-95"
                >清理 {storageStats.totalBase64Photos} 张旧 base64 照片</button>
              )}

              {storageStats && storageStats.totalBase64Photos === 0 && (
                <p className="text-[11px] text-green-600 text-center">✅ 存储状态健康</p>
              )}
            </div>
          )}

          {/* ===== Import/Backup Tab ===== */}
          {activeTab === 'import' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs">
                <p className="text-blue-700">文字数据自动备份到 R2。两端共享同一份数据。</p>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { const ok = await syncToCloud(); alert(ok ? '✅ 同步成功' : '❌ 同步失败'); }}
                  className="flex-1 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-lg active:scale-95">⬆️ 上传同步</button>
                <button onClick={async () => {
                    const ok = await restoreFromCloud();
                    if (ok) { alert('✅ 已恢复。刷新中...'); window.location.reload(); }
                    else alert('R2 上暂无数据');
                  }}
                  className="flex-1 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-lg active:scale-95">⬇️ 下载同步</button>
              </div>

              <div className="border-t border-gray-200 pt-4" />
              <button onClick={handleExportData}
                className="w-full py-3 bg-green-500 text-white text-sm font-bold rounded-xl active:scale-95">📥 导出所有数据（JSON）</button>

              <button onClick={() => {
                  if (!confirm('从 R2 拉取最新数据覆盖本地？')) return;
                  restoreFromCloud().then(ok => {
                    if (ok) { alert('✅ 已恢复'); window.location.reload(); }
                    else alert('R2 上暂无数据');
                  });
                }}
                className="w-full py-3 bg-purple-500 text-white text-sm font-bold rounded-xl active:scale-95">📥 从 R2 恢复数据</button>

              <div className="border-t border-gray-200 pt-4" />
              <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-purple-100/50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json,.zip" onChange={handleFileUpload} />
                <div className="w-20 h-20 bg-paper-surface text-sage-500 rounded-full flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                  <UploadIcon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">从备份文件恢复</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs">上传之前导出的 JSON 备份文件。</p>
              </div>
              {currentEvents && currentEvents.length > 0 && (
                <div className="text-center"><p className="text-xs text-slate-400">当前已有 {currentEvents.length} 条回忆</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseConfigModal;
