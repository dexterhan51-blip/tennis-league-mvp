'use client';

import { Calendar } from 'lucide-react';

interface LiveDatePickerProps {
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${month}/${day}(${weekday})`;
}

export function LiveDatePicker({ dates, selectedDate, onSelect }: LiveDatePickerProps) {
  if (dates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
      {dates.map(date => {
        const isSelected = date === selectedDate;
        const isToday = date === new Date().toISOString().split('T')[0];

        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {formatDateShort(date)}
            {isToday && !isSelected && (
              <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />
            )}
          </button>
        );
      })}
    </div>
  );
}
