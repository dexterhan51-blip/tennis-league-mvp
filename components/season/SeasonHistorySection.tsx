'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import type { SeasonRecord } from '@/types';

interface SeasonHistorySectionProps {
  seasonHistory: SeasonRecord[];
}

export default function SeasonHistorySection({ seasonHistory }: SeasonHistorySectionProps) {
  if (seasonHistory.length === 0) return null;

  // Show most recent first
  const sorted = [...seasonHistory].reverse();

  return (
    <div className="px-6 pb-4">
      <h3 className="text-sm font-semibold text-ink tracking-tight mb-3 flex items-center gap-1.5">
        <Trophy className="w-4 h-4 text-amber-400" />
        시즌 기록
      </h3>
      <div className="space-y-2">
        {sorted.map((record) => (
          <div
            key={record.seasonId}
            className="flex items-center justify-between p-3 bg-card-soft rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-ink truncate">
                  {record.leagueName}
                </span>
                {record.finalRank === 1 && (
                  <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="text-xs text-ink-mute tabular-nums">
                {record.seasonEnd} | {record.wins}승 {record.draws}무 {record.losses}패
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-sm font-bold tabular-nums ${record.finalRank === 1 ? 'text-amber-500' : 'text-ink-soft'}`}>
                {record.finalRank}위
              </span>
              <span className="text-sm font-bold text-accent tabular-nums">
                {record.totalPoints}점
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
