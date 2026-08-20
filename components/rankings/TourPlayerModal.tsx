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
        className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-xl animate-scale-in max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-line p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink tracking-tight">
              {entry.name} <span className="text-accent text-sm font-bold tabular-nums">#{rank}</span>
            </h3>
            <p className="text-xs text-ink-mute tabular-nums">
              총 {entry.totalPoints}점 · {entry.wins}승 {entry.draws > 0 ? `${entry.draws}무 ` : ''}
              {entry.losses}패 · 승률 {Math.round(entry.winRate)}%
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-card-soft rounded-full touch-target" aria-label="닫기">
            <X size={20} className="text-ink-faint" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* 대회별 기여 */}
          <section>
            <h4 className="text-xs font-medium text-ink-mute mb-2 flex items-center gap-1">
              <Trophy size={13} className="text-accent" /> 대회별 득점
            </h4>
            {entry.perLeague.length === 0 ? (
              <p className="text-xs text-ink-mute">대회 출전 기록이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {entry.perLeague.map((b) => (
                  <div
                    key={b.leagueId}
                    className="flex items-center justify-between bg-card-soft rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-ink-soft min-w-0 truncate">{b.leagueName}</span>
                    <span className="shrink-0 text-xs text-ink-mute ml-2 tabular-nums">
                      {b.wins}승/{b.matchesPlayed}경기
                    </span>
                    <span className="shrink-0 font-bold text-accent ml-3 tabular-nums">{b.points}점</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 친선 전적 */}
          <section>
            <h4 className="text-xs font-medium text-ink-mute mb-2 flex items-center gap-1">
              <Handshake size={13} className="text-up" /> 친선경기 ({entry.friendlyPoints}점)
            </h4>
            {myFriendly.length === 0 ? (
              <p className="text-xs text-ink-mute">친선경기 기록이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {myFriendly.map((f) => {
                  const won = playerWon(f.match, entry.playerId);
                  return (
                    <div key={f.id} className="bg-card-soft rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="min-w-0 truncate text-ink-soft">
                          {teamLabel(f.match, 'A')}
                          <span className="mx-1 font-bold text-accent tabular-nums">
                            {f.match.scoreA}:{f.match.scoreB}
                          </span>
                          {teamLabel(f.match, 'B')}
                        </span>
                        <span
                          className={`shrink-0 ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            won === null
                              ? 'bg-line text-ink-mute'
                              : won
                              ? 'bg-up/10 text-up'
                              : 'bg-down/10 text-down'
                          }`}
                        >
                          {won === null ? '무' : won ? '승' : '패'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] text-ink-faint tabular-nums">{f.match_date}</span>
                        {f.match.videoUrl && (
                          <a
                            href={f.match.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-bold text-down"
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
