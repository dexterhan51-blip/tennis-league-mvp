'use client';

import { X, Trophy, Handshake, Youtube } from 'lucide-react';
import type { TourRankingEntry, FriendlyMatchRow, Match } from '@/types';

interface TourPlayerModalProps {
  entry: TourRankingEntry;
  rank: number;
  friendly: FriendlyMatchRow[]; // 연도 필터가 적용된 친선경기 rows
  onClose: () => void;
}

function inMatch(m: Match, playerId: string): boolean {
  return [m.teamA?.man, m.teamA?.woman, m.teamB?.man, m.teamB?.woman].some((p) => p?.id === playerId);
}

function teamLabel(m: Match, side: 'A' | 'B'): string {
  const t = side === 'A' ? m.teamA : m.teamB;
  if (!t?.man) return '미정';
  return t.man.id === t.woman?.id ? t.man.name : [t.man?.name, t.woman?.name].filter(Boolean).join('·');
}

function playerWon(m: Match, playerId: string): boolean | null {
  if (m.scoreA === m.scoreB) return null;
  const inA = [m.teamA?.man, m.teamA?.woman].some((p) => p?.id === playerId);
  return inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
}

// 선수 상세: 대회별 기여 + 친선 전적
export default function TourPlayerModal({ entry, rank, friendly, onClose }: TourPlayerModalProps) {
  const myFriendly = friendly
    .filter((f) => f.match?.isFinished && inMatch(f.match, entry.playerId))
    .sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''));

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {entry.name} <span className="text-clay-600 text-sm font-black">#{rank}</span>
            </h3>
            <p className="text-xs text-slate-400">
              총 {entry.totalPoints}점 · {entry.wins}승 {entry.draws > 0 ? `${entry.draws}무 ` : ''}
              {entry.losses}패 · 승률 {Math.round(entry.winRate)}%
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full touch-target" aria-label="닫기">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* 대회별 기여 */}
          <section>
            <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
              <Trophy size={13} className="text-clay-500" /> 대회별 득점
            </h4>
            {entry.perLeague.length === 0 ? (
              <p className="text-xs text-slate-400">대회 출전 기록이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {entry.perLeague.map((b) => (
                  <div
                    key={b.leagueId}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700 min-w-0 truncate">{b.leagueName}</span>
                    <span className="shrink-0 text-xs text-slate-400 ml-2">
                      {b.wins}승/{b.matchesPlayed}경기
                    </span>
                    <span className="shrink-0 font-bold text-clay-600 ml-3">{b.points}점</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 친선 전적 */}
          <section>
            <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
              <Handshake size={13} className="text-green-600" /> 친선경기 ({entry.friendlyPoints}점)
            </h4>
            {myFriendly.length === 0 ? (
              <p className="text-xs text-slate-400">친선경기 기록이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {myFriendly.map((f) => {
                  const won = playerWon(f.match, entry.playerId);
                  return (
                    <div key={f.id} className="bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="min-w-0 truncate text-slate-700">
                          {teamLabel(f.match, 'A')}
                          <span className="mx-1 font-black text-clay-600">
                            {f.match.scoreA}:{f.match.scoreB}
                          </span>
                          {teamLabel(f.match, 'B')}
                        </span>
                        <span
                          className={`shrink-0 ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            won === null
                              ? 'bg-slate-200 text-slate-500'
                              : won
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-50 text-red-500'
                          }`}
                        >
                          {won === null ? '무' : won ? '승' : '패'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] text-slate-400">{f.match_date}</span>
                        {f.match.videoUrl && (
                          <a
                            href={f.match.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-bold text-red-600"
                          >
                            <Youtube size={12} /> 영상
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
