'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { Match } from '@/types';
import ScoreInput from '@/components/ui/ScoreInput';

interface MatchCardProps {
  match: Match;
  index: number;
  onScoreChange: (matchId: string, team: 'A' | 'B', score: number) => void;
  disabled?: boolean;
}

export default function MatchCard({
  match,
  index,
  onScoreChange,
  disabled = false,
}: MatchCardProps) {
  const isFinished = match.isFinished;
  const teamAWon = isFinished && match.scoreA > match.scoreB;
  const teamBWon = isFinished && match.scoreB > match.scoreA;

  return (
    <div
      className={`p-4 bg-white rounded-xl shadow-sm border transition-all ${
        isFinished ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-500">게임 {index + 1}</span>
        {isFinished && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircle className="w-4 h-4" />
            완료
          </span>
        )}
      </div>

      {/* Team A */}
      <div className={`mb-4 ${teamAWon ? 'ring-2 ring-blue-200 rounded-lg p-2 -m-2' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          {teamAWon && (
            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
              WIN
            </span>
          )}
          <span className="font-medium text-slate-900 text-sm">
            {match.teamA.man.name}
            {match.teamA.man.id !== match.teamA.woman.id && (
              <span className="text-slate-400"> & </span>
            )}
            {match.teamA.man.id !== match.teamA.woman.id && match.teamA.woman.name}
          </span>
        </div>
        <ScoreInput
          value={match.scoreA}
          onChange={(score) => onScoreChange(match.id, 'A', score)}
          disabled={disabled || isFinished}
        />
      </div>

      {/* VS Divider */}
      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs font-bold text-slate-400">VS</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* Team B */}
      <div className={`${teamBWon ? 'ring-2 ring-blue-200 rounded-lg p-2 -m-2' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          {teamBWon && (
            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
              WIN
            </span>
          )}
          <span className="font-medium text-slate-900 text-sm">
            {match.teamB.man.name}
            {match.teamB.man.id !== match.teamB.woman.id && (
              <span className="text-slate-400"> & </span>
            )}
            {match.teamB.man.id !== match.teamB.woman.id && match.teamB.woman.name}
          </span>
        </div>
        <ScoreInput
          value={match.scoreB}
          onChange={(score) => onScoreChange(match.id, 'B', score)}
          disabled={disabled || isFinished}
        />
      </div>
    </div>
  );
}
