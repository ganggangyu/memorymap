
import React, { useMemo } from 'react';
import { MemoryEvent } from '../types';
import { SparklesIcon, ClockIcon } from './icons';
import { parseDateRobustly, sortEventsAscending } from '../utils';

interface MemoriesWidgetProps {
  events: MemoryEvent[];
}

const MemoriesWidget: React.FC<MemoriesWidgetProps> = ({ events }) => {
  const widgetData = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // 1. Check for "On This Day" (Historical)
    const onThisDayEvents = events.filter(e => {
        const d = parseDateRobustly(e.date);
        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getDate() === currentDay && d.getFullYear() !== today.getFullYear();
    });

    if (onThisDayEvents.length > 0) {
        onThisDayEvents.sort(sortEventsAscending);

        const event = onThisDayEvents[0];
        const eventDate = parseDateRobustly(event.date);
        const yearsAgo = today.getFullYear() - eventDate.getFullYear();
        return {
            type: 'historical',
            title: `${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago today`,
            subtitle: `We were at ${event.location.name}`,
            icon: SparklesIcon,
            colorClass: 'from-seal-50 to-seal-50 text-ink-800'
        };
    }

    // 2. Check for "Upcoming" (Future or Time Capsule)
    const futureEvents = events.filter(e => {
        if (e.date === 'Future') return false;

        let d: Date = parseDateRobustly(e.date);
        return !isNaN(d.getTime()) && d > today;
    });

    futureEvents.sort(sortEventsAscending);

    if (futureEvents.length > 0) {
        const event = futureEvents[0];
        const targetDate = parseDateRobustly(event.date);
        const diffTime = Math.abs(targetDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            type: 'future',
            title: `${diffDays} day${diffDays > 1 ? 's' : ''} to go`,
            subtitle: `Until ${event.title}`,
            icon: ClockIcon,
            colorClass: 'from-blue-100 to-teal-100 text-teal-800'
        };
    }

    return null;
  }, [events]);

  if (!widgetData) return null;

  return (
    <div className={`mx-4 mt-4 mb-2 p-3 rounded-lg bg-gradient-to-r ${widgetData.colorClass} shadow-sm border border-white/50 flex items-center gap-3 animate-fadeIn`}>
        <div className="p-2 bg-paper-surface/60 rounded-full shadow-sm shrink-0">
            <widgetData.icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{widgetData.title}</p>
            <p className="text-xs opacity-80 truncate">{widgetData.subtitle}</p>
        </div>
    </div>
  );
};

export default MemoriesWidget;
