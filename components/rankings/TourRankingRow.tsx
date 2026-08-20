'use client';

import { useState } from 'react';
import { ChevronDown, Trophy, Handshake, Crown } from 'lucide-react';
import type { TourRankingEntry } from '@/types';

interface TourRankingRowProps {
  rank: number;
  entry: TourRankingEntry;
  onSelect: () => void;
}

// 종합 랭킹 한 행: 펼치면 대회별 득점 + 친선 득점 내역
export default function TourRankingRow({ rank, entry, onSelect }: TourRankingRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="shrink-0 flex flex-col items-center w-10">
          {rank === 1 ? (
            <Crown className="w-6 h-6 text-amber-400" />
          ) : (
            <span className="text-lg font-bold text-ink-soft tabular-nums">{rank}</span>
          )}
        </div>
        <button onClick={onSelect} className="min-w-0 flex-1 text-left touch-target">
          <div className="font-bold text-ink truncate">
            {entry.name}
          </div>
          <div className="text-xs text-ink-mute tabular-nums">
            {entry.wins}승 {entry.draws > 0 ? `${entry.draws}무 ` : ''}
            {entry.losses}패 · 승률 {Math.round(entry.winRate)}%
          </div>
        </button>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-accent tabular-nums">{entry.totalPoints}</div>
          <div className="text-[10px] text-ink-faint -mt-0.5">점</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-2 text-ink-faint hover:text-ink-mute touch-target"
          aria-label={expanded ? '내역 접기' : '대회별 내역 보기'}
          aria-expanded={expanded}
        >
          <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-line bg-card-soft px-4 py-3 space-y-1.5">
          {entry.perLeague.map((b) => (
            <div key={b.leagueId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-ink-soft min-w-0 truncate">
                <Trophy size={12} className="text-accent shrink-0" /> {b.leagueName}
                <span className="text-ink-mute tabular-nums">
                  ({b.wins}승/{b.matchesPlayed}경기)
                </span>
              </span>
              <span className="font-bold text-ink-soft shrink-0 tabular-nums">{b.points}점</span>
            </div>
          ))}
          {entry.friendlyMatchesPlayed > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <Handshake size={12} className="text-up shrink-0" /> 친선경기
                <span className="text-ink-mute tabular-nums">
                  ({entry.friendlyWins}승/{entry.friendlyMatchesPlayed}경기)
                </span>
              </span>
              <span className="font-bold text-ink-soft shrink-0 tabular-nums">{entry.friendlyPoints}점</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
