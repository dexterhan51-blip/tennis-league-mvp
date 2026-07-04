'use client';

import { Trophy, RefreshCw } from 'lucide-react';
import RankingRow from '@/components/ranking/RankingRow';
import type { Player, PlayerWithRank } from '@/types';

interface RankingSectionProps {
  rankings: PlayerWithRank[];
  players: Player[];
  showRecalculate: boolean;
  onRecalculateMvp: () => void;
  onPlayerClick: (playerId: string) => void;
  onOpenRegistration: () => void;
}

export default function RankingSection({
  rankings,
  players,
  showRecalculate,
  onRecalculateMvp,
  onPlayerClick,
  onOpenRegistration,
}: RankingSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-500 flex items-center gap-2">
          <Trophy size={16} /> 실시간 랭킹
        </h2>
        {showRecalculate && (
          <button
            onClick={onRecalculateMvp}
            className="text-xs text-slate-400 hover:text-clay-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-clay-50 transition-colors"
            title="MVP 횟수를 경기 기록 기반으로 재계산합니다"
          >
            <RefreshCw size={12} /> MVP 재계산
          </button>
        )}
      </div>
      <div className="space-y-2">
        {rankings.map((r) => (
          <RankingRow
            key={r.playerId}
            player={r}
            photo={players.find(p => p.id === r.playerId)?.photo}
            onClick={() => onPlayerClick(r.playerId)}
          />
        ))}
        {rankings.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Trophy size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm mb-3">아직 랭킹 데이터가 없습니다.</p>
            <button onClick={onOpenRegistration} className="text-sm text-clay-600 font-bold hover:underline cursor-pointer">
              + 게임 등록하기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
