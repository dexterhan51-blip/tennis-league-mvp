'use client';

import { useState } from 'react';
import { ChevronDown, Trophy, Handshake } from 'lucide-react';
import type { TourRankingEntry } from '@/types';

interface TourRankingRowProps {
  rank: number;
  entry: TourRankingEntry;
  onSelect: () => void;
}

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  if (rank === 2) return 'bg-slate-100 text-slate-600 border-slate-300';
  if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-white text-slate-500 border-slate-200';
}

// 종합 랭킹 한 행: 펼치면 대회별 득점 + 친선 득점 내역
export default function TourRankingRow({ rank, entry, onSelect }: TourRankingRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <span
          className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-black ${rankBadge(rank)}`}
        >
          {rank}
        </span>
        <button onClick={onSelect} className="min-w-0 flex-1 text-left touch-target">
          <div className="font-bold text-slate-900 truncate">
            {entry.name}
            {rank === 1 && <span className="ml-1">👑</span>}
          </div>
          <div className="text-[11px] text-slate-400">
            {entry.wins}승 {entry.draws > 0 ? `${entry.draws}무 ` : ''}
            {entry.losses}패 · 승률 {Math.round(entry.winRate)}%
          </div>
        </button>
        <div className="shrink-0 text-right">
          <div className="text-lg font-black text-clay-600">{entry.totalPoints}</div>
          <div className="text-[10px] text-slate-400 -mt-0.5">점</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-2 text-slate-300 hover:text-slate-500 touch-target"
          aria-label={expanded ? '내역 접기' : '대회별 내역 보기'}
          aria-expanded={expanded}
        >
          <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 space-y-1.5">
          {entry.perLeague.map((b) => (
            <div key={b.leagueId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 min-w-0 truncate">
                <Trophy size={12} className="text-clay-500 shrink-0" /> {b.leagueName}
                <span className="text-slate-400">
                  ({b.wins}승/{b.matchesPlayed}경기)
                </span>
              </span>
              <span className="font-bold text-slate-700 shrink-0">{b.points}점</span>
            </div>
          ))}
          {entry.friendlyMatchesPlayed > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Handshake size={12} className="text-green-600 shrink-0" /> 친선경기
                <span className="text-slate-400">
                  ({entry.friendlyWins}승/{entry.friendlyMatchesPlayed}경기)
                </span>
              </span>
              <span className="font-bold text-slate-700 shrink-0">{entry.friendlyPoints}점</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
