'use client';

import React, { useState } from 'react';
import { Trophy, Archive, Plus, Trash2, X } from 'lucide-react';
import type { PlayerStat } from '@/types';

export type EndSeasonOption = 'archive-and-new' | 'archive-only' | 'delete';

interface EndSeasonDialogProps {
  isOpen: boolean;
  leagueName: string;
  totalMatchDays: number;
  totalMatches: number;
  champion: PlayerStat | null;
  onConfirm: (option: EndSeasonOption) => void;
  onCancel: () => void;
}

export default function EndSeasonDialog({
  isOpen,
  leagueName,
  totalMatchDays,
  totalMatches,
  champion,
  onConfirm,
  onCancel,
}: EndSeasonDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    onCancel();
  };

  const handleConfirmStep1 = () => {
    setStep(2);
  };

  const handleOption = (option: EndSeasonOption) => {
    setStep(1);
    onConfirm(option);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
        {step === 1 ? (
          <>
            {/* Step 1: Summary */}
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-6 text-center relative">
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <Trophy className="w-12 h-12 mx-auto text-white mb-2" />
              <h3 className="text-xl font-bold text-white">시즌 종료</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">리그</span>
                <span className="text-sm font-bold text-slate-900">{leagueName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">총 경기일</span>
                <span className="text-sm font-bold text-slate-900">{totalMatchDays}일</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">총 경기</span>
                <span className="text-sm font-bold text-slate-900">{totalMatches}경기</span>
              </div>
              {champion && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">챔피언</span>
                  <span className="text-sm font-bold text-amber-600">
                    {champion.name} ({champion.totalPoints}점)
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
              >
                취소
              </button>
              <button
                onClick={handleConfirmStep1}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors touch-target"
              >
                시즌 종료
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Options */}
            <div className="bg-gradient-to-r from-green-400 to-green-500 p-6 text-center relative">
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <Trophy className="w-12 h-12 mx-auto text-white mb-2" />
              <h3 className="text-xl font-bold text-white">시즌이 종료되었습니다!</h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => handleOption('archive-and-new')}
                className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors touch-target text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Plus size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">아카이브 후 새 시즌</div>
                  <div className="text-xs text-slate-500">선수 유지, 기록 초기화</div>
                </div>
              </button>

              <button
                onClick={() => handleOption('archive-only')}
                className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors touch-target text-left"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <Archive size={20} className="text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">아카이브만</div>
                  <div className="text-xs text-slate-500">홈으로 돌아가기</div>
                </div>
              </button>

              <div className="pt-2 text-center">
                <button
                  onClick={() => handleOption('delete')}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors inline-flex items-center gap-1"
                >
                  <Trash2 size={12} /> 리그 완전 삭제
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
