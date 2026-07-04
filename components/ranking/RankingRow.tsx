'use client';

import React from 'react';
import { Crown, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import type { PlayerWithRank } from '@/types';

interface RankingRowProps {
  player: PlayerWithRank;
  photo?: string;
  onClick?: () => void;
}

export default function RankingRow({ player, photo, onClick }: RankingRowProps) {
  const { currentRank, previousRank, rankChange, name, wins, draws, losses, totalPoints, gender, dailyBonus, peakRank, careerRank, mvpCount } = player;

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

      {/* Avatar */}
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
        />
      ) : (
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            gender === 'MALE' ? 'bg-blue-50' : 'bg-pink-50'
          }`}
        >
          <span className="text-base">{gender === 'MALE' ? '👨' : '👩'}</span>
        </div>
      )}

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 truncate">{name}</span>
          {careerRank !== undefined && (
            <span
              className="px-1.5 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded flex-shrink-0"
              title={`통산 랭킹 ${careerRank}위 (아카이브된 전체 시즌 누적 포인트 기준)`}
            >
              ATP {careerRank}
            </span>
          )}
          {dailyBonus && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
              MVP
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {wins}승 {draws > 0 ? `${draws}무 ` : ''}{losses}패
          </span>
          {(mvpCount ?? 0) > 0 && (
            <span className="text-xs text-yellow-600" title={`이번 시즌 MVP ${mvpCount}회`}>
              👑{mvpCount}
            </span>
          )}
          {peakRank !== undefined && (
            peakRank === currentRank ? (
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            ) : (
              <span className="text-xs text-amber-500">최고 {peakRank}위</span>
            )
          )}
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
