'use client';

import { Trophy, Crown } from 'lucide-react';
import type { Player, PlayerStat } from '@/types';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';

interface LiveRankingProps {
  rankings: PlayerStat[];
  players?: Player[];
}

export function LiveRanking({ rankings, players }: LiveRankingProps) {
  const photoOf = new Map((players ?? []).map(p => [p.id, p.photo]));

  if (rankings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold text-slate-900">현재 랭킹</h2>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">아직 등록된 선수가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <h2 className="text-sm font-bold text-slate-900">현재 랭킹</h2>
      </div>

      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2rem_3rem_3rem] gap-1 text-xs font-medium text-slate-400 px-2 pb-1 border-b border-slate-100">
        <span>#</span>
        <span>이름</span>
        <span className="text-center">승</span>
        <span className="text-center">무</span>
        <span className="text-center">패</span>
        <span className="text-center">승률</span>
        <span className="text-right">점수</span>
      </div>

      {/* 랭킹 목록 */}
      <div className="divide-y divide-slate-50">
        {rankings.map((stat, idx) => {
          const rank = idx + 1;
          const isTop3 = rank <= 3;
          const winRatePercent = Math.round(stat.winRate);

          return (
            <div
              key={stat.playerId}
              className={`grid grid-cols-[2rem_1fr_2rem_2rem_2rem_3rem_3rem] gap-1 items-center px-2 py-2.5 ${
                isTop3 ? 'bg-yellow-50/50' : ''
              }`}
            >
              <span className="text-sm font-bold text-slate-500">
                {rank === 1 && <Crown className="w-4 h-4 text-yellow-500 inline" />}
                {rank !== 1 && rank}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <PlayerAvatar
                  photo={photoOf.get(stat.playerId)}
                  gender={stat.gender}
                  name={stat.name}
                />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-900 truncate block">{stat.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {stat.gender === 'MALE' ? '남' : '여'} · {stat.matchesPlayed}경기
                    {(stat.mvpCount ?? 0) > 0 && <span className="text-yellow-600"> · 👑{stat.mvpCount}</span>}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-clay-600 text-center">{stat.wins}</span>
              <span className="text-sm text-slate-400 text-center">{stat.draws}</span>
              <span className="text-sm text-slate-500 text-center">{stat.losses}</span>
              <span className="text-xs font-medium text-slate-600 text-center">{winRatePercent}%</span>
              <span className="text-sm font-black text-slate-900 text-right">{stat.totalPoints}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
