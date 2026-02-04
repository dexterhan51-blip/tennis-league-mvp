'use client';

import React, { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useUndo as useUndoContext } from '@/contexts/UndoContext';

export default function UndoButton() {
  const { canUndo, lastAction, undo } = useUndoContext();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (canUndo && lastAction) {
      setIsVisible(true);
      setProgress(100);

      // Animate progress bar
      const startTime = lastAction.timestamp;
      const duration = 5000; // 5 seconds

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining <= 0) {
          setIsVisible(false);
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    } else {
      setIsVisible(false);
    }
  }, [canUndo, lastAction]);

  if (!isVisible || !lastAction) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <button
        onClick={undo}
        className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-700 transition-colors touch-target"
        aria-label="실행 취소"
      >
        <Undo2 className="w-5 h-5" />
        <span className="text-sm font-medium">{lastAction.label} 취소</span>
      </button>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-600 rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-blue-400 transition-all duration-50 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
