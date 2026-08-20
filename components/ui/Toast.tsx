'use client';

import React from 'react';
import { useToast, ToastType } from '@/contexts/ToastContext';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastStyles: Record<ToastType, { iconColor: string; icon: React.ReactNode }> = {
  success: {
    iconColor: 'text-up',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  error: {
    iconColor: 'text-down',
    icon: <XCircle className="w-5 h-5" />,
  },
  warning: {
    iconColor: 'text-amber-500',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  info: {
    iconColor: 'text-accent',
    icon: <Info className="w-5 h-5" />,
  },
};

export default function ToastContainer() {
  const { toasts, hideToast } = useToast();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            className="bg-card border border-line text-ink px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto animate-toast-slide-down max-w-sm w-full"
            role="alert"
            aria-live="polite"
          >
            <span className={style.iconColor}>{style.icon}</span>
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => hideToast(toast.id)}
              className="p-1 hover:bg-card-soft rounded-full transition-colors touch-target"
              aria-label="닫기"
            >
              <X className="w-4 h-4 text-ink-faint" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
