import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { MemoryEvent } from './types';
import { useEvents } from './hooks/useEvents';
import { useAudio } from './hooks/useAudio';
import { useModals } from './hooks/useModals';
import { useAchievements } from './hooks/useAchievements';
import { exportEventsToZip, importEventsFromFile, buildImportSuccessMessage } from './utils/media';
import { syncToCloud } from './utils/cloudSync';
import Timeline from './components/Timeline';
import YearInReview from './components/YearInReview';
import BirthdaySurprise from './components/BirthdaySurprise';
import FloatingLanterns from './components/FloatingLanterns';
import IncenseAltar from './components/IncenseAltar';
import AchievementsModal from './components/AchievementsModal';
import AchievementToast from './components/AchievementToast';
import ImportUrlModal from './components/ImportUrlModal';
import DatabaseConfigModal from './components/DatabaseConfigModal';
import PhotoCollage from './components/PhotoCollage';
import LoveDice from './components/LoveDice';
import MemoryBook from './components/MemoryBook';
import HeartEmitter from './components/HeartEmitter';
import { ErrorBoundary } from './components/ErrorBoundary';

const DEFAULT_BGM = 'https://aistudiocdn.com/samples/music.mp3';

const App: React.FC = () => {
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const { events, isLoading, setIsLoading, saveEvent, deleteEvent, savePrayEvent, saveLanternWish, saveHeartEvent, importEvents } = useEvents();
  const { bgmUrl, setBgmUrl, isBgmPlaying, setIsBgmPlaying, toggleBgm, audioRef } = useAudio(DEFAULT_BGM);
  const { modals, open, close } = useModals();
  const { achievements, achievementStatuses, latestAchievement, addAchievement, editAchievement, deleteAchievement, toggleManualStatus } = useAchievements(events);

  useEffect(() => {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#4a3728' });
    SplashScreen.hide();
  }, []);

  // 定时自动同步到云端
  useEffect(() => {
    const interval = setInterval(() => syncToCloud(), 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePray = (blessing: string) => savePrayEvent(blessing);
  const handleLanternWish = (wish: string) => saveLanternWish(wish);

  const handleTriggerHearts = () => {
    setHeartTrigger(t => t + 1);
    saveHeartEvent();
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportEventsToZip(events);
    } catch (error) {
      console.error('Export failed', error);
      showToast('备份失败，文件可能过大。');
    } finally {
      setIsExporting(false);
    }
  };

  const processImportFile = async (file: Blob | File) => {
    setIsLoading(true);
    try {
      const { events: importedEvents, mediaCount } = await importEventsFromFile(file);
      const result = await importEvents(importedEvents);
      showToast(buildImportSuccessMessage(result, mediaCount));
    } catch (err: any) {
      console.error('Import failed', err);
      showToast(`导入失败：${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlImport = async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await processImportFile(await response.blob());
    } catch (err) {
      console.error('URL Import failed', err);
      alert('链接下载失败，请检查链接是否有效且允许跨域访问。');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-paper-surface z-[9999]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-seal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full overflow-hidden">
        {isExporting && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4" />
            <p className="font-bold text-lg">正在打包回忆...</p>
            <p className="text-sm opacity-80">视频文件较大，请耐心等待压缩</p>
          </div>
        )}

        <audio ref={audioRef} src={bgmUrl} loop />
        <HeartEmitter trigger={heartTrigger} />
        <AchievementToast achievement={latestAchievement} />
        {toast && (
          <div className="fixed inset-x-0 bottom-24 flex justify-center z-[3000] pointer-events-none px-4">
            <div className="pointer-events-auto bg-ink-900/90 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium max-w-sm text-center whitespace-pre-line animate-fadeIn">
              {toast}
            </div>
          </div>
        )}

        <Timeline
          events={events}
          onSaveEvent={saveEvent}
          onDeleteEvent={deleteEvent}
          onOpenLanterns={() => open('lanterns')}
          onTriggerHearts={handleTriggerHearts}
          onOpenYearInReview={() => open('yearInReview')}
          onOpenIncense={() => open('incense')}
          onOpenAchievements={() => open('achievements')}
          onOpenBirthday={() => open('birthday')}
          onOpenCollage={() => open('collage')}
          onOpenDice={() => open('dice')}
          onOpenBook={() => open('book')}
          onExportData={handleExportData}
          onImportData={() => open('dbConfig')}
          onImportFromUrl={() => open('importUrl')}
          bgmUrl={bgmUrl}
          isBgmPlaying={isBgmPlaying}
          onToggleBgm={toggleBgm}
          onSetBgm={setBgmUrl}
          achievements={achievements}
          achievementStatuses={achievementStatuses}
        />

        <YearInReview isOpen={modals.yearInReview} onClose={() => close('yearInReview')} events={events} />
        <BirthdaySurprise isOpen={modals.birthday} onClose={() => close('birthday')} />
        <FloatingLanterns isOpen={modals.lanterns} onClose={() => close('lanterns')} onWishMade={handleLanternWish} />
        <IncenseAltar isOpen={modals.incense} onClose={() => close('incense')} onPray={handlePray} />
        <AchievementsModal
          isOpen={modals.achievements}
          onClose={() => close('achievements')}
          achievements={achievements}
          achievementStatuses={achievementStatuses}
          onAdd={addAchievement}
          onEdit={editAchievement}
          onDelete={deleteAchievement}
          onToggleManual={toggleManualStatus}
        />
        <ImportUrlModal isOpen={modals.importUrl} onClose={() => close('importUrl')} onImport={handleUrlImport} />
        <DatabaseConfigModal
          isOpen={modals.dbConfig}
          onClose={() => close('dbConfig')}
          onImportFile={processImportFile}
          currentEvents={events}
          onUpdateEventImageUrls={async (eventId, imageUrls) => {
            const ev = events.find(e => e.id === eventId);
            if (ev) await saveEvent({ ...ev, imageUrls } as any, eventId);
          }}
          onUpdateEventDate={async (updatedEvent) => {
            await saveEvent(updatedEvent as any, updatedEvent.id);
          }}
          onCreateEvent={async (eventData) => {
            await saveEvent(eventData as any);
          }}
          onDeleteEvents={async (ids) => {
            for (const id of ids) await deleteEvent(id);
          }}
          onCleanOldImages={() => {
            const data = localStorage.getItem('romantic_journey_local_events');
            if (!data) return;
            const parsed = JSON.parse(data);
            const cleaned = parsed.map((e: any) => ({
              ...e,
              imageUrls: (e.imageUrls || []).map((url: string) =>
                url.startsWith('data:') ? '' : url
              ).filter(Boolean),
              videoUrl: e.videoUrl?.startsWith('data:') ? undefined : e.videoUrl,
              audioUrl: e.audioUrl?.startsWith('data:') ? undefined : e.audioUrl,
              livePhotoUrl: e.livePhotoUrl?.startsWith('data:') ? undefined : e.livePhotoUrl,
            }));
            localStorage.setItem('romantic_journey_local_events', JSON.stringify(cleaned));
            // 刷新页面以重新加载数据
            window.location.reload();
          }}
        />
        <PhotoCollage
          isOpen={modals.collage}
          onClose={() => close('collage')}
          events={events}
        />
        <LoveDice
          isOpen={modals.dice}
          onClose={() => close('dice')}
        />
        <MemoryBook
          isOpen={modals.book}
          onClose={() => close('book')}
          events={events}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
