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
      <div className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-xl animate-scale-in overflow-hidden">
        {step === 1 ? (
          <>
            {/* Step 1: Summary */}
            <div className="bg-accent-soft border-b border-line p-6 text-center relative">
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-accent/10 rounded-full transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-ink-mute" />
              </button>
              <Trophy className="w-12 h-12 mx-auto text-amber-400 mb-2" />
              <h3 className="text-xl font-bold text-ink tracking-tight">시즌 종료</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-line">
                <span className="text-sm text-ink-mute">리그</span>
                <span className="text-sm font-bold text-ink">{leagueName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line">
                <span className="text-sm text-ink-mute">총 경기일</span>
                <span className="text-sm font-bold text-ink tabular-nums">{totalMatchDays}일</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line">
                <span className="text-sm text-ink-mute">총 경기</span>
                <span className="text-sm font-bold text-ink tabular-nums">{totalMatches}경기</span>
              </div>
              {champion && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-ink-mute">챔피언</span>
                  <span className="text-sm font-bold text-amber-500 tabular-nums">
                    {champion.name} ({champion.totalPoints}점)
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-line">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target"
              >
                취소
              </button>
              <button
                onClick={handleConfirmStep1}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors touch-target"
              >
                시즌 종료
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Options */}
            <div className="bg-up/10 border-b border-line p-6 text-center relative">
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-up/10 rounded-full transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-ink-mute" />
              </button>
              <Trophy className="w-12 h-12 mx-auto text-up mb-2" />
              <h3 className="text-xl font-bold text-ink tracking-tight">시즌이 종료되었습니다!</h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => handleOption('archive-and-new')}
                className="w-full flex items-center gap-3 p-4 bg-accent-soft hover:bg-accent/15 rounded-xl transition-colors touch-target text-left"
              >
                <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                  <Plus size={20} className="text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-ink text-sm">아카이브 후 새 시즌</div>
                  <div className="text-xs text-ink-mute">선수·통산 기록은 유지 · 이번 시즌 순위만 새로 시작</div>
                </div>
              </button>

              <button
                onClick={() => handleOption('archive-only')}
                className="w-full flex items-center gap-3 p-4 bg-card-soft hover:bg-line rounded-xl transition-colors touch-target text-left"
              >
                <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                  <Archive size={20} className="text-ink-soft" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-ink text-sm">아카이브만</div>
                  <div className="text-xs text-ink-mute">홈으로 돌아가기</div>
                </div>
              </button>

              <p className="text-[11px] text-ink-faint text-center px-2 leading-relaxed">
                통산 기록(최고 순위 · 우승 횟수 · 시즌별 성적)은 선수 프로필에 계속 누적됩니다.
              </p>

              <div className="pt-2 text-center">
                <button
                  onClick={() => handleOption('delete')}
                  className="text-xs text-down/70 hover:text-down transition-colors inline-flex items-center gap-1"
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
