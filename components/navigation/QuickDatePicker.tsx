'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface QuickDatePickerProps {
  selectedDate: string;
  onChange: (date: string) => void;
  matchDates?: string[];
}

export default function QuickDatePicker({
  selectedDate,
  onChange,
  matchDates = [],
}: QuickDatePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Generate dates for the picker (past 30 days + today)
  const dates = useMemo(() => {
    const result: string[] = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  }, []);

  // Unique match dates set for quick lookup
  const matchDateSet = useMemo(() => new Set(matchDates), [matchDates]);

  // Scroll to selected date on mount
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[d.getDay()];
  };

  const handlePrev = () => {
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex > 0) {
      onChange(dates[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex < dates.length - 1) {
      onChange(dates[currentIndex + 1]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Quick buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onChange(today)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
            selectedDate === today
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          오늘
        </button>
        <button
          onClick={() => onChange(yesterday)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${
            selectedDate === yesterday
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          어제
        </button>
        <div className="flex-1" />
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          aria-label="이전 날짜"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <button
          onClick={handleNext}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          aria-label="다음 날짜"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Date scroll */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="tablist"
        aria-label="날짜 선택"
      >
        {dates.map((date) => {
          const isSelected = date === selectedDate;
          const hasMatch = matchDateSet.has(date);
          const isToday = date === today;

          return (
            <button
              key={date}
              onClick={() => onChange(date)}
              data-selected={isSelected}
              className={`
                flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all touch-target
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md'
                  : hasMatch
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }
              `}
              role="tab"
              aria-selected={isSelected}
            >
              <span className="text-xs font-medium">{getDayName(date)}</span>
              <span className="text-sm font-bold">{formatDate(date)}</span>
              {hasMatch && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
              )}
              {isToday && !isSelected && (
                <Calendar className="w-3 h-3 mt-1 text-slate-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
