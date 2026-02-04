'use client';

import React from 'react';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PlayerWithRank } from '@/types';

interface RankingRowProps {
  player: PlayerWithRank;
  onClick?: () => void;
}

export default function RankingRow({ player, onClick }: RankingRowProps) {
  const { currentRank, previousRank, rankChange, name, wins, losses, totalPoints, gender, dailyBonus } = player;

  const getRankChangeDisplay = () => {
    if (rankChange > 0) {
      return (
        <span className="flex items-center gap-0.5 text-green-500 text-xs font-medium animate-rank-slide">
          <TrendingUp className="w-3 h-3" />
          {rankChange}
        </span>
      );
    }
    if (rankChange < 0) {
      return (
        <span className="flex items-center gap-0.5 text-red-500 text-xs font-medium animate-rank-slide">
          <TrendingDown className="w-3 h-3" />
          {Math.abs(rankChange)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-slate-400 text-xs">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-100 transition-all ${
        onClick ? 'cursor-pointer hover:bg-slate-50 active:scale-98' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Rank */}
      <div className="flex flex-col items-center w-10">
        {currentRank === 1 ? (
          <Crown className="w-6 h-6 text-yellow-500" />
        ) : (
          <span className="text-lg font-bold text-slate-700">{currentRank}</span>
        )}
        {previousRank !== undefined && getRankChangeDisplay()}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 truncate">{name}</span>
          {dailyBonus && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
              MVP
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {wins}승 {losses}패
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <span className="text-lg font-bold text-blue-600 animate-score-bump">
          {totalPoints}
        </span>
        <span className="text-xs text-slate-400 ml-0.5">점</span>
      </div>
    </div>
  );
}
