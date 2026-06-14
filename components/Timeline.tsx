
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MemoryEvent, Achievement, AchievementStatus } from '../types';
import MapView from './MapView';
import CardListView from './CardListView';
import CalendarView from './CalendarView';
import GalleryView from './GalleryView';
import HomePage from './HomePage';
import DetailPanel from './DetailPanel';
import EventForm from './EventForm';
import Lightbox from './Lightbox';
import MemoriesWidget from './MemoriesWidget';
import {
    LanternIcon, FlameIcon, TrophyIcon, MapPinIcon,
    GridIcon, CalendarIcon, PlusIcon, SearchIcon, MenuIcon,
    LayoutIcon, HeartIcon, ClockIcon, EditIcon, ListIcon,
    DownloadIcon, UploadIcon, PlayIcon, PauseIcon, StopIcon,
    SpeakerWaveIcon, SpeakerXMarkIcon, ChevronLeftIcon, ChevronRightIcon, XIcon,
    SparklesIcon, LinkIcon, DatabaseIcon, CakeIcon,
    TimelineNavIcon, MapNavIcon, GalleryNavIcon, RitualNavIcon, RouteIcon
} from './icons';
import { playGameSound, sortEventsAscending } from '../utils';
import { ANNIVERSARY } from '../src/constants';

interface TimelineProps {
    events: MemoryEvent[];
    onSaveEvent: (event: Omit<MemoryEvent, 'id'>, id?: string) => void;
    onDeleteEvent: (id: string) => void;
    onOpenLanterns: () => void;
    onTriggerHearts: () => void;
    onOpenYearInReview: () => void;
    onOpenIncense: () => void;
    onOpenAchievements: () => void;
    onOpenBirthday: () => void;
    onOpenCollage: () => void;
    onOpenDice: () => void;
    onOpenBook: () => void;
    onExportData: () => void;
    onImportData: () => void;
    onImportFromUrl: () => void;
    bgmUrl: string;
    isBgmPlaying: boolean;
    onToggleBgm: () => void;
    onSetBgm: (url: string) => void;
    achievements: Achievement[];
    achievementStatuses: Record<string, AchievementStatus>;
}

type ViewMode = 'home' | 'map' | 'list' | 'calendar' | 'gallery';

const Timeline: React.FC<TimelineProps> = ({
    events,
    onSaveEvent,
    onDeleteEvent,
    onOpenLanterns,
    onTriggerHearts,
    onOpenYearInReview,
    onOpenIncense,
    onOpenAchievements,
    onOpenBirthday,
    onOpenCollage,
    onOpenDice,
    onOpenBook,
    onExportData,
    onImportData,
    onImportFromUrl,
    bgmUrl,
    isBgmPlaying,
    onToggleBgm,
    onSetBgm,
    achievements,
    achievementStatuses
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isRitualsOpen, setIsRitualsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const bgmInputRef = useRef<HTMLInputElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<MemoryEvent | null>(null);
  const [pendingLocation, setPendingLocation] = useState<[number, number] | null>(null);
  const [draftFormData, setDraftFormData] = useState<Partial<MemoryEvent> | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{ url: string; event: MemoryEvent }[]>([]);


  const filteredEvents = useMemo(() => {
      if (!searchQuery) return events;
      const q = searchQuery.toLowerCase();
      return events.filter(e =>
          e.title.toLowerCase().includes(q) ||
          e.location.name.toLowerCase().includes(q) ||
          e.shortDescription.toLowerCase().includes(q)
      );
  }, [events, searchQuery]);

  const selectedEvent = useMemo(() =>
      events.find(e => e.id === selectedEventId) || null
  , [events, selectedEventId]);

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          onSetBgm(url);
      }
  };

  const handleSelectEvent = (id: string | null) => {
      setSelectedEventId(id);
  };

  const startAddEvent = () => {
      setEventToEdit(null);
      setPendingLocation(null);
      setDraftFormData(null);
      setViewMode('map');
      setIsPickingLocation(true);
      setIsAdding(false);
  };

  const handleEditEvent = (event: MemoryEvent) => {
      setEventToEdit(event);
      setDraftFormData(null);
      setIsAdding(true);
  };

  const handleDeleteEvent = (id: string) => {
      onDeleteEvent(id);
      setSelectedEventId(null);
  };

  const handleSave = (data: Omit<MemoryEvent, 'id'>, id?: string) => {
      onSaveEvent(data, id);
      setIsAdding(false);
      setEventToEdit(null);
      setPendingLocation(null);
      setDraftFormData(null);
  };

  const handleLocationPick = (coords: [number, number]) => {
      setPendingLocation(coords);
      setIsPickingLocation(false);
      setIsAdding(true);
  };

  const openLightbox = (images: { url: string; event: MemoryEvent }[], index: number) => {
      setLightboxImages(images);
      setLightboxIndex(index);
      setIsLightboxOpen(true);
  };

  const renderContent = () => {
      switch (viewMode) {
          case 'home':
              return (
                  <HomePage
                      events={filteredEvents}
                      achievements={achievements}
                      achievementStatuses={achievementStatuses}
                      onSelectEvent={handleSelectEvent}
                      onNavigate={(v) => setViewMode(v as ViewMode)}
                      onOpenRituals={() => setIsRitualsOpen(true)}
                      onOpenAchievements={onOpenAchievements}
                      onOpenBirthday={onOpenBirthday}
                      onOpenYearInReview={onOpenYearInReview}
                      onOpenDataMgmt={onImportData}
                      onOpenDice={onOpenDice}
                      onOpenBook={onOpenBook}
                  />
              );
          case 'map':
              return (
                  <MapView
                      events={filteredEvents}
                      selectedEventId={selectedEventId}
                      onSelectEvent={handleSelectEvent}
                      isAddingLocation={isPickingLocation}
                      onMapLocationSelect={handleLocationPick}
                      onCancelAdd={() => { setIsPickingLocation(false); setIsAdding(true); }}
                      flyToCoords={selectedEvent?.location.coords || null}
                      onMarkerMove={(id, coords) => {
                          const ids = Array.isArray(id) ? id : [id];
                          ids.forEach(eventId => {
                              const evt = events.find(e => e.id === eventId);
                              if (evt) {
                                  onSaveEvent({ ...evt, location: { ...evt.location, coords } }, evt.id);
                              }
                          });
                      }}
                      onAddAtLocation={(coords, name) => {
                          setPendingLocation(coords);
                          setEventToEdit(null);
                          setDraftFormData({ location: { name, coords } } as any);
                          setIsPickingLocation(false);
                          setIsAdding(true);
                      }}
                  />
              );
          case 'list':
              return <CardListView events={filteredEvents} onSelectEvent={handleSelectEvent} />;
          case 'calendar':
              return <CalendarView events={filteredEvents} onSelectEvent={handleSelectEvent} />;
          case 'gallery':
              return <GalleryView events={filteredEvents} onImageClick={openLightbox} />;
          default:
              return null;
      }
  };

  return (
    <div className="w-full h-full flex flex-col relative paper-texture overflow-hidden">

        <input
            type="file"
            ref={bgmInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleBgmUpload}
        />

        {/* === Top Bar === */}
        <div className="absolute top-0 left-0 right-0 z-[60] p-4 pointer-events-none flex justify-end items-start gap-2 safe-area-top">
            {viewMode === 'map' && !isPickingLocation && (
                <button onClick={startAddEvent} className="pointer-events-auto w-11 h-11 bg-gradient-to-br bg-seal-600 text-white rounded-full shadow-lg shadow-gold-200/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-90 animate-fadeIn">
                    <PlusIcon className="w-5 h-5" />
                </button>
            )}
        </div>

        {/* === Rituals Bottom Sheet === */}
        {isRitualsOpen && (
            <div className="fixed inset-0 z-[1000] flex flex-col justify-end animate-fadeIn">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsRitualsOpen(false)} />
                <div className="relative bg-paper-surface/95 backdrop-blur-2xl rounded-t-3xl shadow-[0_-10px_40px_rgba(60,36,21,0.06)] p-6 pb-10 animate-slideInUp border-t border-gold-100/20">
                    <div className="w-12 h-1.5 bg-gold-200 rounded-full mx-auto mb-6" />
                    <h3 className="text-center text-lg font-bold text-ink-800 mb-6 font-title">
                        <span className="text-seal-500">✨</span> 浪漫仪式 <span className="text-seal-500">✨</span>
                    </h3>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => { onOpenLanterns(); setIsRitualsOpen(false); }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gold-100 active:scale-[0.98] transition-transform">
                            <div className="w-10 h-10 bg-seal-500 rounded-xl flex items-center justify-center shadow-md"><LanternIcon className="w-5 h-5 text-white" /></div>
                            <div className="text-left"><p className="font-bold text-sm text-ink-800">放飞孔明灯</p><p className="text-[11px] text-ink-400">写下心愿，让天灯载着它飘向远方</p></div>
                        </button>
                        <button onClick={() => { onOpenIncense(); setIsRitualsOpen(false); }}
                            className="w-full flex items-center gap-4 p-4 rounded-lg active:scale-[0.98] transition-transform" style={{ background: 'var(--seal-50)', border: '1px solid var(--seal-100)' }}>
                            <div className="w-10 h-10 bg-seal-500 rounded-xl flex items-center justify-center shadow-md"><FlameIcon className="w-5 h-5 text-white" /></div>
                            <div className="text-left"><p className="font-bold text-sm text-ink-800">上香祈福</p><p className="text-[11px] text-ink-400">点燃一柱心香，为彼此祈求平安</p></div>
                        </button>
                        <button onClick={() => { onTriggerHearts(); playGameSound('match'); setIsRitualsOpen(false); }}
                            className="w-full flex items-center gap-4 p-4 rounded-lg active:scale-[0.98] transition-transform" style={{ background: 'var(--sage-50)', border: '1px solid var(--sage-100)' }}>
                            <div className="w-10 h-10 bg-seal-400 rounded-xl flex items-center justify-center shadow-md"><HeartIcon className="w-5 h-5 text-white" /></div>
                            <div className="text-left"><p className="font-bold text-sm text-ink-800">爱心雨</p><p className="text-[11px] text-seal-500">粉红爱心从天而降，记录此刻甜蜜</p></div>
                        </button>
                    </div>
                </div>
            </div>
        )}

            <div className="absolute top-20 left-4 z-30 pointer-events-none hidden md:block w-64">
                 <div className="pointer-events-auto">
                     <MemoriesWidget events={events} />
                 </div>
            </div>

        {/* main content area */}
        <div className="flex-1 relative z-0 min-h-0 w-full overflow-hidden">
            <div className="w-full h-full pb-20 md:pb-24" style={{ display: viewMode === 'home' ? 'block' : 'none' }}>
              {events.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                  <div className="w-20 h-20 bg-seal-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-gold-200/50">
                    <MapPinIcon className="w-10 h-10 text-ink-400" />
                  </div>
                  <h3 className="text-lg font-bold text-ink-800 mb-1">开始你们的旅程</h3>
                  <p className="text-sm text-gold-300 mb-6 max-w-[240px] leading-relaxed">在地图上标记每一个<br/>值得纪念的地方</p>
                  <button onClick={() => setViewMode('map')} className="px-8 py-3 bg-seal-600 text-white rounded-full text-sm font-bold shadow-lg shadow-gold-200/40 active:scale-95 transition-all">
                    去地图创建第一个回忆
                  </button>
                </div>
              ) : (
                <HomePage
                    events={filteredEvents}
                    achievements={achievements}
                    achievementStatuses={achievementStatuses}
                    onSelectEvent={handleSelectEvent}
                    onNavigate={(v) => setViewMode(v as ViewMode)}
                    onOpenRituals={() => setIsRitualsOpen(true)}
                    onOpenAchievements={onOpenAchievements}
                    onOpenBirthday={onOpenBirthday}
                    onOpenYearInReview={onOpenYearInReview}
                    onOpenDataMgmt={onImportData}
                    onOpenDice={onOpenDice}
                    onOpenBook={onOpenBook}
                />
              )}
            </div>
            <div className="w-full h-full pb-20 md:pb-24" style={{ display: viewMode === 'map' ? 'block' : 'none' }}>
              <MapView
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={handleSelectEvent}
                  isAddingLocation={isPickingLocation}
                  onMapLocationSelect={handleLocationPick}
                  onCancelAdd={() => { setIsPickingLocation(false); setIsAdding(true); }}
                  flyToCoords={selectedEvent?.location.coords || null}
                  onMarkerMove={(id, coords) => {
                      const ids = Array.isArray(id) ? id : [id];
                      ids.forEach(eventId => {
                          const evt = events.find(e => e.id === eventId);
                          if (evt) {
                              onSaveEvent({ ...evt, location: { ...evt.location, coords } }, evt.id);
                          }
                      });
                  }}
                  onAddAtLocation={(coords, name) => {
                      setPendingLocation(coords);
                      setEventToEdit(null);
                      setDraftFormData({ location: { name, coords } } as any);
                      setIsPickingLocation(false);
                      setIsAdding(true);
                  }}
              />
            </div>
            <div className="w-full h-full pb-20 md:pb-24" style={{ display: viewMode === 'list' ? 'block' : 'none' }}>
              <CardListView events={filteredEvents} onSelectEvent={handleSelectEvent} />
            </div>
            <div className="w-full h-full pb-20 md:pb-24" style={{ display: viewMode === 'calendar' ? 'block' : 'none' }}>
              <CalendarView events={filteredEvents} onSelectEvent={handleSelectEvent} />
            </div>
            <div className="w-full h-full pb-20 md:pb-24" style={{ display: viewMode === 'gallery' ? 'block' : 'none' }}>
              <GalleryView events={filteredEvents} onImageClick={openLightbox} />
            </div>
        <div className={`fixed bottom-0 left-0 right-0 nav-glass safe-area-bottom z-[400] transition-transform duration-500 ${isPickingLocation ? 'translate-y-full' : 'translate-y-0'}`}>
            <div className="flex justify-around items-center h-[64px] max-w-md mx-auto px-2 pb-1">
                <NavButtonV2 active={viewMode === 'home'} onClick={() => setViewMode('home')} icon={HeartIcon} label="首页" />
                <NavButtonV2 active={viewMode === 'list'} onClick={() => setViewMode('list')} icon={TimelineNavIcon} label="时间轴" />
                <NavButtonV2 active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} icon={CalendarIcon} label="日历" />
                <NavButtonV2 active={viewMode === 'map'} onClick={() => setViewMode('map')} icon={MapNavIcon} label="地图" />
                <NavButtonV2 active={viewMode === 'gallery'} onClick={() => setViewMode('gallery')} icon={GalleryNavIcon} label="相册" />
            </div>
        </div>

        {/* Detail panel: fullscreen */}
        {selectedEventId && (
            <div className="absolute inset-0 z-[500]">
                <DetailPanel event={selectedEvent} onClose={() => setSelectedEventId(null)} onEdit={handleEditEvent} onDelete={handleDeleteEvent} onImageClick={openLightbox} />
            </div>
        )}

        {(isAdding && !isPickingLocation) && (
            <EventForm
                isOpen={true}
                onClose={() => setIsAdding(false)}
                onSave={handleSave}
                eventToEdit={eventToEdit}
                initialCoords={pendingLocation}
                initialLocationName={pendingLocation ? "已选位置" : ""}
                onLocationUpdate={() => {}}
                onPickLocation={(data) => {
                    setDraftFormData(data);
                    setIsAdding(false);
                    setViewMode('map');
                    setIsPickingLocation(true);
                }}
                initialData={draftFormData}
            />
        )}

        <Lightbox
            isOpen={isLightboxOpen}
            onClose={() => setIsLightboxOpen(false)}
            images={lightboxImages}
            initialIndex={lightboxIndex}
            onGoToMemory={(id) => { setIsLightboxOpen(false); setSelectedEventId(id); }}
        />
    </div>
    </div>
  );
};

const NavButtonV2 = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-16 h-full pb-1 transition-all duration-300 ${active ? 'nav-active' : 'text-ink-300 hover:text-seal-500'}`}
    >
        <div className={`p-2 rounded-[14px] transition-all duration-300 ${active ? 'nav-active-bg -translate-y-0.5' : ''}`}>
            <Icon className={`w-5 h-5 transition-all duration-300 ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
        </div>
        <span className={`text-[10px] font-bold mt-1 transition-all ${active ? 'text-seal-600' : ''}`}>{label}</span>
    </button>
);

export default Timeline;
