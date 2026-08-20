'use client';

import { Crown } from 'lucide-react';

interface MvpCandidate {
  name: string;
  winRate: number;
}

interface MvpAwardDialogProps {
  isOpen: boolean;
  matchDate: string;
  maleMvp: MvpCandidate | null;
  femaleMvp: MvpCandidate | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MvpAwardDialog({
  isOpen,
  matchDate,
  maleMvp,
  femaleMvp,
  onConfirm,
  onCancel,
}: MvpAwardDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-xl animate-scale-in overflow-hidden">
        <div className="bg-accent-soft border-b border-line p-6 text-center">
          <Crown className="w-12 h-12 mx-auto text-amber-400 mb-2" />
          <h3 className="text-xl font-bold text-ink tracking-tight">{matchDate} 게임 종료</h3>
        </div>
        <div className="p-6 space-y-4">
          {maleMvp && (
            <div className="flex items-center gap-4 p-4 bg-tint-m-bg rounded-xl">
              <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                <Crown size={20} className="text-tint-m-fg" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-tint-m-fg font-medium">남자 MVP</div>
                <div className="font-bold text-ink">{maleMvp.name}</div>
                <div className="text-xs text-ink-mute tabular-nums">승률 {(maleMvp.winRate * 100).toFixed(0)}%</div>
              </div>
              <span className="text-sm font-bold text-tint-m-fg">MVP +1회</span>
            </div>
          )}
          {femaleMvp && (
            <div className="flex items-center gap-4 p-4 bg-tint-f-bg rounded-xl">
              <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                <Crown size={20} className="text-tint-f-fg" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-tint-f-fg font-medium">여자 MVP</div>
                <div className="font-bold text-ink">{femaleMvp.name}</div>
                <div className="text-xs text-ink-mute tabular-nums">승률 {(femaleMvp.winRate * 100).toFixed(0)}%</div>
              </div>
              <span className="text-sm font-bold text-tint-f-fg">MVP +1회</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-4 border-t border-line">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-accent hover:bg-accent-strong transition-colors touch-target"
          >
            MVP 확정
          </button>
        </div>
      </div>
    </div>
  );
}
