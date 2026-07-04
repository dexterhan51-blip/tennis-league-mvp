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
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <h3 id="match-created-title" className="font-bold text-lg text-slate-900">
              {isPending ? '매치 라인업 확인' : '게임 생성 완료'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {typeLabel} {matches.length}게임
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors touch-target"
            aria-label="닫기"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Match List */}
        <div className="overflow-auto flex-1 p-4 space-y-3">
          {matches.map((m, idx) => (
            <div key={m.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-xs font-bold text-clay-600 mb-2">GAME {idx + 1}</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-right">
                  <div className="text-sm font-bold text-slate-800">{m.teamA.man.name}</div>
                  {!isSingles && m.teamA.man.id !== m.teamA.woman.id && (
                    <div className="text-xs text-slate-500">{m.teamA.woman.name}</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                  VS
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-slate-800">{m.teamB.man.name}</div>
                  {!isSingles && m.teamB.man.id !== m.teamB.woman.id && (
                    <div className="text-xs text-slate-500">{m.teamB.woman.name}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-4 border-t border-slate-200">
          {isPending ? (
            <>
              {onReshuffle && (
                <button
                  onClick={onReshuffle}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target flex items-center justify-center gap-1.5"
                >
                  <Shuffle size={16} /> 다시 섞기
                </button>
              )}
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-clay-600 hover:bg-clay-700 transition-colors touch-target"
              >
                생성
              </button>
            </>
          ) : (
            <>
              {onCopyBracket && (
                <button
                  onClick={onCopyBracket}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target flex items-center justify-center gap-1.5"
                >
                  <Copy size={16} /> 대진표 복사
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-clay-600 hover:bg-clay-700 transition-colors touch-target"
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
