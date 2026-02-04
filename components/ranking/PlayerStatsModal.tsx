'use client';

import React, { useMemo } from 'react';
import { X, Trophy, Target, TrendingUp, Flame } from 'lucide-react';
import type { Player, Match, PlayerStat } from '@/types';
import { GUEST_M_ID, GUEST_F_ID } from '@/utils/tennisLogic';

interface PlayerStatsModalProps {
  isOpen: boolean;
  player: Player | null;
  matches: Match[];
  stats: PlayerStat | null;
  onClose: () => void;
}

export default function PlayerStatsModal({
  isOpen,
  player,
  matches,
  stats,
  onClose,
}: PlayerStatsModalProps) {
  // Calculate recent form (last 5 matches)
  const recentMatches = useMemo(() => {
    if (!player) return [];

    return matches
      .filter((m) => {
        if (!m.isFinished) return false;
        const isInTeamA =
          m.teamA.man.id === player.id || m.teamA.woman.id === player.id;
        const isInTeamB =
          m.teamB.man.id === player.id || m.teamB.woman.id === player.id;
        return isInTeamA || isInTeamB;
      })
      .slice(-5)
      .reverse()
      .map((m) => {
        const isInTeamA =
          m.teamA.man.id === player.id || m.teamA.woman.id === player.id;
        const won = isInTeamA
          ? m.scoreA > m.scoreB
          : m.scoreB > m.scoreA;
        const myScore = isInTeamA ? m.scoreA : m.scoreB;
        const oppScore = isInTeamA ? m.scoreB : m.scoreA;
        return { match: m, won, myScore, oppScore };
      });
  }, [player, matches]);

  // Calculate average points per match
  const avgPointsPerMatch = useMemo(() => {
    if (!player || recentMatches.length === 0) return 0;
    const total = recentMatches.reduce((sum, r) => sum + r.myScore, 0);
    return (total / recentMatches.length).toFixed(1);
  }, [player, recentMatches]);

  // Calculate winning streak
  const winStreak = useMemo(() => {
    let streak = 0;
    for (const r of recentMatches) {
      if (r.won) streak++;
      else break;
    }
    return streak;
  }, [recentMatches]);

  if (!isOpen || !player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-stats-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          <div className="flex items-center gap-4">
            {player.photo ? (
              <img
                src={player.photo}
                alt={player.name}
                className="w-16 h-16 rounded-full object-cover border-4 border-slate-200"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  player.gender === 'MALE' ? 'bg-blue-100' : 'bg-pink-100'
                }`}
              >
                <span className="text-2xl">
                  {player.gender === 'MALE' ? '👨' : '👩'}
                </span>
              </div>
            )}
            <div>
              <h2 id="player-stats-title" className="text-xl font-bold text-slate-900">
                {player.name}
              </h2>
              <p className="text-sm text-slate-500">
                {player.gender === 'MALE' ? '남성' : '여성'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">총 경기</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {stats.matchesPlayed}
                </span>
              </div>

              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600">승률</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {stats.winRate.toFixed(0)}%
                </span>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">평균 득점</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {avgPointsPerMatch}
                </span>
              </div>

              <div className="p-4 bg-orange-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600">연승</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {winStreak}
                </span>
              </div>
            </div>

            {/* Win/Loss */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">승/패</span>
                <span className="text-sm font-bold text-slate-900">
                  {stats.wins}승 {stats.losses}패
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Matches */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">최근 5경기</h3>
          {recentMatches.length > 0 ? (
            <div className="flex gap-2">
              {recentMatches.map((r, i) => (
                <div
                  key={i}
                  className={`flex-1 p-3 rounded-xl text-center ${
                    r.won ? 'bg-blue-100' : 'bg-red-100'
                  }`}
                >
                  <div
                    className={`text-xs font-bold mb-1 ${
                      r.won ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {r.won ? '승' : '패'}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {r.myScore}-{r.oppScore}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">
              경기 기록이 없습니다
            </p>
          )}
        </div>

        {/* Total Points */}
        {stats && (
          <div className="px-6 pb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium opacity-90">총 점수</span>
                <span className="text-3xl font-bold">{stats.totalPoints}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
