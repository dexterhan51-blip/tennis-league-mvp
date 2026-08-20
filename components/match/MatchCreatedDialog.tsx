'use client';

import { Match } from '@/types';
import { X, Shuffle, Copy } from 'lucide-react';
import type { MatchCreationType } from '@/hooks/useMatchManagement';

interface MatchCreatedDialogProps {
  isOpen: boolean;
  matches: Match[];
  matchType: MatchCreationType | null;
  isPending: boolean;
  onConfirm: () => void;
  onReshuffle?: () => void;
  /** 생성 완료 상태에서 대진표를 클립보드로 복사 (단톡방 공유용) */
  onCopyBracket?: () => void;
  onClose: () => void;
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  MIXED: '혼복 풀리그',
  MIXED_SINGLES: '단식 포함',
  DOUBLES: '복식',
  SINGLES: '단식',
  MANUAL: '수동',
};

export default function MatchCreatedDialog({
  isOpen,
  matches,
  matchType,
  isPending,
  onConfirm,
  onReshuffle,
  onCopyBracket,
  onClose,
}: MatchCreatedDialogProps) {
  if (!isOpen || matches.length === 0) return null;

  const typeLabel = matchType ? MATCH_TYPE_LABEL[matchType] || matchType : '';
  const isSingles = matchType === 'SINGLES';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-created-title"
    >
      <div className="bg-card border border-line rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-xl animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-card-soft rounded-t-2xl">
          <div>
            <h3 id="match-created-title" className="font-bold text-lg text-ink tracking-tight">
              {isPending ? '매치 라인업 확인' : '게임 생성 완료'}
            </h3>
            <p className="text-xs text-ink-mute mt-0.5">
              {typeLabel} {matches.length}게임
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-line rounded-full transition-colors touch-target"
            aria-label="닫기"
          >
            <X size={20} className="text-ink-faint" />
          </button>
        </div>

        {/* Match List */}
        <div className="overflow-auto flex-1 p-4 space-y-3">
          {matches.map((m, idx) => (
            <div key={m.id} className="bg-card-soft rounded-xl p-3 border border-line">
              <div className="text-xs font-bold text-accent mb-2">GAME {idx + 1}</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-right">
                  <div className="text-sm font-bold text-ink">{m.teamA.man.name}</div>
                  {!isSingles && m.teamA.man.id !== m.teamA.woman.id && (
                    <div className="text-xs text-ink-mute">{m.teamA.woman.name}</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs font-bold text-ink-faint bg-card px-2 py-1 rounded border border-line">
                  VS
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-ink">{m.teamB.man.name}</div>
                  {!isSingles && m.teamB.man.id !== m.teamB.woman.id && (
                    <div className="text-xs text-ink-mute">{m.teamB.woman.name}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-4 border-t border-line">
          {isPending ? (
            <>
              {onReshuffle && (
                <button
                  onClick={onReshuffle}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target flex items-center justify-center gap-1.5"
                >
                  <Shuffle size={16} /> 다시 섞기
                </button>
              )}
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-accent hover:bg-accent-strong transition-colors touch-target"
              >
                생성
              </button>
            </>
          ) : (
            <>
              {onCopyBracket && (
                <button
                  onClick={onCopyBracket}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target flex items-center justify-center gap-1.5"
                >
                  <Copy size={16} /> 대진표 복사
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-accent hover:bg-accent-strong transition-colors touch-target"
              >
                확인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
