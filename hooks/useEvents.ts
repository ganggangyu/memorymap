import { useState, useEffect, useCallback } from 'react';
import { MemoryEvent } from '../types';
import { initDB, getEventSummaries, saveEventToDB, deleteEventFromDB, saveAllEventsToDB } from '../db';
import { formatDateStandard, sortEventsAscending } from '../utils';
import { restoreFromCloud } from '../utils/cloudSync';

export const useEvents = () => {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await initDB();
      // 先从云端恢复
      await restoreFromCloud();
      const loadedEvents = await getEventSummaries();
      setEvents(loadedEvents.sort(sortEventsAscending));
      setIsLoading(false);
    };
    loadData();
  }, []);

  const saveEvent = useCallback(async (eventData: Omit<MemoryEvent, 'id'>, id?: string) => {
    const newEvent: MemoryEvent = { ...eventData, id: id || Date.now().toString() };
    await saveEventToDB(newEvent);
    setEvents(prev => {
      let next = id ? prev.map(e => e.id === id ? newEvent : e) : [...prev, newEvent];
      return next.sort(sortEventsAscending);
    });
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await deleteEventFromDB(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const savePrayEvent = useCallback(async (blessing: string) => {
    await saveEvent({
      title: '诚心祈福',
      date: formatDateStandard(new Date()),
      tags: ['日常'],
      location: { name: '心灵圣殿', coords: [0, 0] },
      shortDescription: blessing,
      longDescription: '在此刻，我点燃一柱心香，许下美好的愿望：\n' + blessing,
      imageUrls: [],
      isSystemEvent: true,
    });
  }, [saveEvent]);

  const saveLanternWish = useCallback(async (wish: string) => {
    await saveEvent({
      title: '放飞孔明灯',
      date: formatDateStandard(new Date()),
      tags: ['愿望'],
      location: { name: '星空之下', coords: [0, 0] },
      shortDescription: wish,
      longDescription: '看着孔明灯缓缓升空，我的愿望也随之飞向远方：\n' + wish,
      imageUrls: [],
      isSystemEvent: true,
    });
  }, [saveEvent]);

  const saveHeartEvent = useCallback(async () => {
    await saveEvent({
      title: '甜蜜爱心雨',
      date: formatDateStandard(new Date()),
      tags: ['纪念日'],
      location: { name: '浪漫时刻', coords: [0, 0] },
      shortDescription: '此时此刻，爱意漫天洒落。',
      longDescription: '屏幕上下起了粉红色的爱心雨，这是属于我们的浪漫瞬间。',
      imageUrls: [],
      isSystemEvent: true,
    });
  }, [saveEvent]);

  const importEvents = useCallback(async (importedEvents: MemoryEvent[]) => {
    if (importedEvents.length === 0) throw new Error('导入数据为空');
    const result = await saveAllEventsToDB(importedEvents);
    setEvents(importedEvents.sort(sortEventsAscending));
    return result;
  }, []);

  return {
    events,
    setEvents,
    isLoading,
    setIsLoading,
    saveEvent,
    deleteEvent,
    savePrayEvent,
    saveLanternWish,
    saveHeartEvent,
    importEvents,
  };
};
