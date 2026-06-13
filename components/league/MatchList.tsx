'use client';

import { Calendar } from 'lucide-react';
import SwipeableItem from '@/components/ui/SwipeableItem';
import ScoreInput from '@/components/ui/ScoreInput';
import type { Match } from '@/types';

interface MatchListProps {
  matches: Match[];
  matchDate: string;
  pendingScores: Record<string, { scoreA: number; scoreB: number }>;
  onUpdateScore: (matchId: string, team: 'A' | 'B', score: number) => void;
  onCommitScore: (matchId: string) => void;
  onCancelFinished: (matchId: string) => void;
  onRequestDelete: (matchId: string) => void;
  onOpenRegistration: () => void;
}

export default function MatchList({
  matches,
  matchDate,
  pendingScores,
  onUpdateScore,
  onCommitScore,
  onCancelFinished,
  onRequestDelete,
  onOpenRegistration,
}: MatchListProps) {
  return (
    <section className="space-y-3">
      {matches.length === 0 && (
        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-3">{matchDate} 진행된 게임이 없습니다.</p>
          <button onClick={onOpenRegistration} className="text-sm text-blue-600 font-bold hover:underline cursor-pointer">
            + 게임 등록하기
          </button>
        </div>
      )}

      {matches.map((m, idx) => {
        const pending = pendingScores[m.id];
        const displayScoreA = pending ? pending.scoreA : m.scoreA;
        const displayScoreB = pending ? pending.scoreB : m.scoreB;
        const hasPendingScore = !!pending;
        const isSingles = m.teamA.man.id === m.teamA.woman.id;

        return (
          <SwipeableItem key={m.id} onDelete={() => onRequestDelete(m.id)}>
            <div className={`p-4 rounded-xl border shadow-sm transition-colors ${m.isFinished ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-600">GAME {idx + 1}</span>
                  {isSingles && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-bold">단식</span>}
                  {m.isExhibition && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold">시범</span>}
                </div>
                {m.isFinished && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">경기종료</span>}
              </div>

              <div className="mb-3">
                <div className="text-sm font-bold text-slate-700 mb-2">
                  {m.teamA.man.name}
                  {m.teamA.man.id !== m.teamA.woman.id && <span className="text-slate-400"> & {m.teamA.woman.name}</span>}
                </div>
                <ScoreInput value={displayScoreA} onChange={(score) => onUpdateScore(m.id, 'A', score)} disabled={m.isFinished} />
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-xs font-bold text-slate-400">VS</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              <div className="mb-3">
                <div className="text-sm font-bold text-slate-700 mb-2">
                  {m.teamB.man.name}
                  {m.teamB.man.id !== m.teamB.woman.id && <span className="text-slate-400"> & {m.teamB.woman.name}</span>}
                </div>
                <ScoreInput value={displayScoreB} onChange={(score) => onUpdateScore(m.id, 'B', score)} disabled={m.isFinished} />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                {m.isFinished ? (
                  <button onClick={() => onCancelFinished(m.id)} className="w-full py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors touch-target">
                    수정하기
                  </button>
                ) : (
                  <button
                    onClick={() => onCommitScore(m.id)}
                    disabled={!hasPendingScore}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors touch-target ${hasPendingScore ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  >
                    완료
                  </button>
                )}
              </div>
            </div>
          </SwipeableItem>
        );
      })}
    </section>
  );
}
