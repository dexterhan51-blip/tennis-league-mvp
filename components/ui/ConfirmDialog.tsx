'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  requireDoubleConfirm?: boolean;
  doubleConfirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  requireDoubleConfirm = false,
  doubleConfirmText = '정말로 삭제하시겠습니까?',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    if (requireDoubleConfirm && step === 1) {
      setStep(2);
    } else {
      onConfirm();
    }
  }, [requireDoubleConfirm, step, onConfirm]);

  const handleCancel = useCallback(() => {
    setStep(1);
    onCancel();
  }, [onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const confirmButtonClass = isDanger
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-scale-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {isDanger && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            )}
            <div className="flex-1">
              <h3 id="dialog-title" className="text-lg font-bold text-slate-900">
                {step === 2 ? doubleConfirmText : title}
              </h3>
              {step === 1 && (
                <p className="mt-2 text-sm text-slate-600">{message}</p>
              )}
              {step === 2 && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors touch-target"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t border-slate-200">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors touch-target ${confirmButtonClass}`}
          >
            {step === 2 ? '네, 삭제합니다' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
