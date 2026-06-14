
import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  selectedDate: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.toLowerCase() === 'future') return null;
    const date = new Date(dateStr);
    // Check if the parsed date is valid
    return isNaN(date.getTime()) ? null : date;
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onChange, onClose }) => {
    const initialDate = parseDateString(selectedDate) || new Date();
    const [viewDate, setViewDate] = useState(initialDate);
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Close the date picker if the user clicks outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [onClose]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const numDays = daysInMonth(year, month);
    const startDayIndex = firstDayOfMonth(year, month);

    const selected = parseDateString(selectedDate);
    const today = new Date();

    const handleDayClick = (day: number) => {
      const newDate = new Date(year, month, day);
      onChange(formatDate(newDate));
    };

    const handleFutureClick = () => {
      onChange('Future');
    };

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const renderDays = () => {
        const dayElements = [];
        // Add empty cells for days before the start of the month
        for (let i = 0; i < startDayIndex; i++) {
            dayElements.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
        }
        // Add cells for each day of the month
        for (let day = 1; day <= numDays; day++) {
            const currentDate = new Date(year, month, day);
            const isSelected = selected && currentDate.toDateString() === selected.toDateString();
            const isToday = currentDate.toDateString() === today.toDateString();

            dayElements.push(
                <button
                    type="button"
                    key={day}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200
                        ${isSelected
                            ? 'bg-seal-500 text-white font-semibold'
                            : isToday
                            ? 'bg-seal-100 text-ink-800'
                            : 'text-gray-700 hover:bg-paper-dark'
                        }`}
                    onClick={() => handleDayClick(day)}
                >
                    {day}
                </button>
            );
        }
        return dayElements;
    };

    return (
        <div ref={datePickerRef} className="absolute top-full mt-2 z-50 bg-paper-surface rounded-lg shadow-xl p-4 w-80 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-paper-dark text-gray-600" aria-label="Previous month">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="font-semibold text-gray-800">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-paper-dark text-gray-600" aria-label="Next month">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 mb-2 font-medium">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {renderDays()}
            </div>
            <div className="mt-4 border-t border-gray-200 pt-3">
                <button
                    type="button"
                    className={`w-full text-center py-2 rounded-md transition-colors duration-200 text-sm font-semibold
                        ${selectedDate === 'Future'
                            ? 'bg-seal-500 text-white'
                            : 'bg-paper-dark hover:bg-seal-100 text-gray-700'
                        }`}
                    onClick={handleFutureClick}
                >
                    Mark as a Future Dream
                </button>
            </div>
        </div>
    );
};

export default DatePicker;
