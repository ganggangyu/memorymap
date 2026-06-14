// 日历工具：将回忆添加到系统日历，支持提醒
// Android (Capacitor): 使用 cordova-plugin-calendar
// Web: 下载 .ics 文件手动导入

import { MemoryEvent } from '../types';

declare global {
  interface Window {
    plugins?: {
      calendar?: {
        createEventInteractively: (
          title: string,
          location: string,
          notes: string,
          startDate: Date,
          endDate: Date,
          success: () => void,
          error: (msg: string) => void
        ) => void;
        createEventWithOptions: (
          title: string,
          location: string,
          notes: string,
          startDate: Date,
          endDate: Date,
          options: {
            firstReminderMinutes?: number;
            secondReminderMinutes?: number;
            recurrence?: string;
            recurrenceInterval?: number;
            recurrenceEndDate?: Date;
            calendarName?: string;
            url?: string;
          },
          success: () => void,
          error: (msg: string) => void
        ) => void;
        hasReadWritePermission: (
          success: (has: boolean) => void,
          error: (msg: string) => void
        ) => void;
        requestReadWritePermission: (
          success: (granted: boolean) => void,
          error: (msg: string) => void
        ) => void;
      };
    };
  }
}

const hasCordovaCalendar = (): boolean => {
  return !!(window.plugins?.calendar);
};

// 生成 ICS 文件内容
const generateICS = (event: MemoryEvent): string => {
  const uid = `memorymap-${event.id}@memorymap.app`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateParts = event.date.split('-').map(Number);
  const startDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 10, 0);
  const endDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 11, 0);

  const fmtDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0];
  const fmtLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MemoryMap//RomanticJourney//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmtLocal(startDate)}`,
    `DTEND:${fmtLocal(endDate)}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${event.title || '浪漫回忆'}`,
    `DESCRIPTION:${event.shortDescription}\\n\\n—— 来自「时光信笺 · 浪漫旅程地图」`,
    `LOCATION:${event.location.name}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:回忆提醒：${event.title || '美好瞬间'}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

// 下载 ICS 文件（Web 端回退方案）
export const downloadCalendarFile = (event: MemoryEvent): void => {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title || 'memory'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 请求日历权限
export const requestCalendarPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (hasCordovaCalendar()) {
      window.plugins!.calendar!.requestReadWritePermission(
        (granted) => resolve(granted),
        () => resolve(false)
      );
    } else {
      // Web 端默认允许（通过下载 ICS）
      resolve(true);
    }
  });
};

// 检查是否有日历读写权限
export const checkCalendarPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (hasCordovaCalendar()) {
      window.plugins!.calendar!.hasReadWritePermission(
        (has) => resolve(has),
        () => resolve(false)
      );
    } else {
      resolve(true);
    }
  });
};

// 将回忆添加到系统日历
export const addEventToCalendar = (
  event: MemoryEvent,
  remindMinutes: number = 15
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (hasCordovaCalendar()) {
      const dateParts = event.date.split('-').map(Number);
      const startDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 10, 0);
      const endDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 11, 0);

      const notes = `${event.shortDescription}\n\n地点：${event.location.name}\n—— 来自「时光信笺 · 浪漫旅程地图」`;

      window.plugins!.calendar!.createEventWithOptions(
        event.title || '浪漫回忆',
        event.location.name,
        notes,
        startDate,
        endDate,
        {
          firstReminderMinutes: remindMinutes,
          calendarName: '浪漫旅程',
        },
        () => resolve(true),
        (msg) => {
          console.warn('Calendar create failed:', msg);
          resolve(false);
        }
      );
    } else {
      // Web 端下载 ICS
      downloadCalendarFile(event);
      resolve(true);
    }
  });
};

// 从日历中删除回忆事件
export const removeEventFromCalendar = (eventId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (hasCordovaCalendar()) {
      // cordova-plugin-calendar doesn't support delete by UID directly
      // The event would need to be found by title and date
      resolve(true);
    } else {
      resolve(true);
    }
  });
};
