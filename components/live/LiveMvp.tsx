'use client';

import { Crown } from 'lucide-react';
import type { Player, Match } from '@/types';
import { calculateDailyMvp } from '@/utils/tennisLogic';

interface LiveMvpProps {
  players: Player[];
  matches: Match[];
  date: string;
}

export function LiveMvp({ players, matches, date }: LiveMvpProps) {
  let maleMvp = null;
  let femaleMvp = null;
  try {
    const result = calculateDailyMvp(players, matches, date);
    maleMvp = result.maleMvp;
    femaleMvp = result.femaleMvp;
  } catch (e) {
    console.warn('[live] MVP calculation error:', e);
  }

  if (!maleMvp && !femaleMvp) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-yellow-500" />
        <h2 className="text-sm font-bold text-slate-900">오늘의 MVP</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {maleMvp && (
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-400 font-medium mb-1">남자 MVP</p>
            <p className="text-sm font-black text-blue-700">{maleMvp.name}</p>
            <p className="text-xs text-blue-500 mt-0.5">
              승률 {Math.round(maleMvp.winRate * 100)}%
            </p>
          </div>
        )}
        {femaleMvp && (
          <div className="bg-pink-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-pink-400 font-medium mb-1">여자 MVP</p>
            <p className="text-sm font-black text-pink-700">{femaleMvp.name}</p>
            <p className="text-xs text-pink-500 mt-0.5">
              승률 {Math.round(femaleMvp.winRate * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
