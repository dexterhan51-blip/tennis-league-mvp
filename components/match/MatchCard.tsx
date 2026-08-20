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
      className={`p-4 bg-card rounded-xl border transition-all ${
        isFinished ? 'border-up/30 bg-up/5' : 'border-line'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-ink-mute">게임 {index + 1}</span>
        {isFinished && (
          <span className="flex items-center gap-1 text-xs font-medium text-up">
            <CheckCircle className="w-4 h-4" />
            완료
          </span>
        )}
      </div>

      {/* Team A */}
      <div className={`mb-4 ${teamAWon ? 'ring-2 ring-accent/30 rounded-lg p-2 -m-2' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          {teamAWon && (
            <span className="text-xs font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded">
              WIN
            </span>
          )}
          <span className="font-medium text-ink text-sm">
            {match.teamA.man.name}
            {match.teamA.man.id !== match.teamA.woman.id && (
              <span className="text-ink-faint"> & </span>
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
        <div className="flex-1 border-t border-line" />
        <span className="text-xs font-bold text-ink-faint">VS</span>
        <div className="flex-1 border-t border-line" />
      </div>

      {/* Team B */}
      <div className={`${teamBWon ? 'ring-2 ring-accent/30 rounded-lg p-2 -m-2' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          {teamBWon && (
            <span className="text-xs font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded">
              WIN
            </span>
          )}
          <span className="font-medium text-ink text-sm">
            {match.teamB.man.name}
            {match.teamB.man.id !== match.teamB.woman.id && (
              <span className="text-ink-faint"> & </span>
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
