'use client';

import React, { useMemo } from 'react';
import { X, Trophy, Target, TrendingUp, Flame, Star, Crown, Swords, Sparkles, Skull, Zap } from 'lucide-react';
import type { Player, Match, PlayerStat, PlayerCareerStats, PlayerWithRank } from '@/types';
import { GUEST_M_ID, GUEST_F_ID, isGuestPlayer, isNamedGuest } from '@/utils/tennisLogic';
import { getPlayerCharacter } from '@/lib/playerCharacters';
import SeasonHistorySection from '@/components/season/SeasonHistorySection';

interface PlayerStatsModalProps {
  isOpen: boolean;
  player: Player | null;
  matches: Match[];
  stats: PlayerStat | null;
  onClose: () => void;
  careerStats?: PlayerCareerStats | null;
  currentRank?: number;
}

export default function PlayerStatsModal({
  isOpen,
  player,
  matches,
  stats,
  onClose,
  careerStats,
  currentRank,
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
        const myScore = isInTeamA ? m.scoreA : m.scoreB;
        const oppScore = isInTeamA ? m.scoreB : m.scoreA;
        const won = myScore > oppScore;
        const draw = myScore === oppScore;
        return { match: m, won, draw, myScore, oppScore };
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

  // 상대 전적: 상대팀으로 만난 선수별 승/무/패
  const headToHead = useMemo(() => {
    if (!player) return [];

    const records = new Map<string, { name: string; isGuest: boolean; wins: number; draws: number; losses: number }>();

    matches.forEach((m) => {
      if (!m.isFinished || m.isExhibition) return;
      const teamPlayers = (team: Match['teamA']) =>
        team.man.id === team.woman.id ? [team.man] : [team.man, team.woman];

      const inA = teamPlayers(m.teamA).some(p => p.id === player.id);
      const inB = teamPlayers(m.teamB).some(p => p.id === player.id);
      if (!inA && !inB) return;

      // 익명 게스트(게스트(남)1 등)는 제외, 이름 있는 게스트는 개인기록에 포함
      const opponents = teamPlayers(inA ? m.teamB : m.teamA)
        .filter(p => !isGuestPlayer(p.id) || isNamedGuest(p.id));
      const myScore = inA ? m.scoreA : m.scoreB;
      const oppScore = inA ? m.scoreB : m.scoreA;

      opponents.forEach(opp => {
        const rec = records.get(opp.id) || { name: opp.name, isGuest: isNamedGuest(opp.id), wins: 0, draws: 0, losses: 0 };
        if (myScore > oppScore) rec.wins++;
        else if (myScore < oppScore) rec.losses++;
        else rec.draws++;
        records.set(opp.id, rec);
      });
    });

    return Array.from(records.entries())
      .map(([id, rec]) => ({ id, ...rec }))
      .sort((a, b) => (b.wins + b.draws + b.losses) - (a.wins + a.draws + a.losses));
  }, [player, matches]);

  const character = getPlayerCharacter(player?.name);

  if (!isOpen || !player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-stats-title"
    >
      <div className="bg-card border border-line rounded-2xl shadow-xl max-w-sm w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-card-soft rounded-full transition-colors touch-target"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-ink-faint" />
          </button>

          <div className="flex items-center gap-4">
            {player.photo ? (
              <img
                src={player.photo}
                alt={player.name}
                className="w-16 h-16 rounded-full object-cover border border-line-strong"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  player.gender === 'MALE' ? 'bg-tint-m-bg text-tint-m-fg' : 'bg-tint-f-bg text-tint-f-fg'
                }`}
              >
                <span className="text-2xl font-bold">
                  {player.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h2 id="player-stats-title" className="text-xl font-bold text-ink tracking-tight">
                {player.name}
              </h2>
              <p className="text-sm text-ink-mute">
                {player.gender === 'MALE' ? '남성' : '여성'}
              </p>
            </div>
          </div>
        </div>

        {/* Character Section (시즌 데이터 기반 별명/플레이스타일/천적) */}
        {character && (
          <div className="px-6 pb-4">
            <div className="rounded-2xl overflow-hidden border border-line">
              <div className="bg-clay-900 px-4 py-4 text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-clay-300 uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> 캐릭터
                </div>
                <div className="text-xl font-black leading-tight">{character.nickname}</div>
                {character.proPlayer && (
                  <div className="text-sm font-bold text-clay-300 mt-0.5">“{character.proPlayer}”</div>
                )}
                <div className="text-xs text-white/60 mt-1.5">{character.tagline}</div>
              </div>
              <div className="bg-card p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-accent mb-0.5">플레이스타일</div>
                    <p className="text-sm text-ink-soft leading-relaxed">{character.style}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Skull className="w-4 h-4 text-down flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-down mb-0.5">천적 / 약점</div>
                    <p className="text-sm text-ink-soft leading-relaxed">{character.nemesis}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Flame className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-500 mb-0.5">강점 / 케미</div>
                    <p className="text-sm text-ink-soft leading-relaxed">{character.edge}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Career Section */}
        {(careerStats || currentRank) && (
          <div className="px-6 pb-4">
            <div className="p-4 bg-accent-soft rounded-xl space-y-2">
              <h3 className="text-sm font-semibold text-accent tracking-tight flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> 커리어
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {currentRank && (
                  <div>
                    <div className="text-xs text-ink-mute">현재 순위</div>
                    <div className="text-lg font-bold text-ink tabular-nums">{currentRank}위</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-ink-mute">최고 순위</div>
                  <div className="text-lg font-bold text-amber-500 tabular-nums">
                    {careerStats ? `${careerStats.peakRank}위` : currentRank ? `${currentRank}위` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-mute">시즌 우승</div>
                  <div className="text-lg font-bold text-ink tabular-nums">
                    {careerStats?.championships ?? 0}회
                    {(careerStats?.championships ?? 0) > 0 && (
                      <span className="ml-0.5">
                        {Array.from({ length: Math.min(careerStats?.championships ?? 0, 5) }).map((_, i) => (
                          <Trophy key={i} className="w-3 h-3 text-amber-500 inline" />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-accent-soft rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium text-accent">총 경기</span>
                </div>
                <span className="text-2xl font-bold text-ink tabular-nums">
                  {stats.matchesPlayed}
                </span>
              </div>

              <div className="p-4 bg-up/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-up" />
                  <span className="text-xs font-medium text-up">승률</span>
                </div>
                <span className="text-2xl font-bold text-ink tabular-nums">
                  {stats.winRate.toFixed(0)}%
                </span>
              </div>

              <div className="p-4 bg-card-soft rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-ink-mute" />
                  <span className="text-xs font-medium text-ink-mute">평균 득점</span>
                </div>
                <span className="text-2xl font-bold text-ink tabular-nums">
                  {avgPointsPerMatch}
                </span>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">연승</span>
                </div>
                <span className="text-2xl font-bold text-ink tabular-nums">
                  {winStreak}
                </span>
              </div>
            </div>

            {/* Win/Draw/Loss */}
            <div className="mt-4 p-4 bg-card-soft rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink-soft">승/무/패</span>
                <span className="text-sm font-bold text-ink tabular-nums">
                  {stats.wins}승 {stats.draws}무 {stats.losses}패
                </span>
              </div>
              <div className="h-2 bg-line rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-accent transition-all"
                  style={{
                    width: `${stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0}%`,
                  }}
                />
                <div
                  className="h-full bg-ink-faint transition-all"
                  style={{
                    width: `${stats.matchesPlayed > 0 ? (stats.draws / stats.matchesPlayed) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Matches */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-ink tracking-tight mb-3">최근 5경기</h3>
          {recentMatches.length > 0 ? (
            <div className="flex gap-2">
              {recentMatches.map((r, i) => (
                <div
                  key={i}
                  className={`flex-1 p-3 rounded-xl text-center ${
                    r.won ? 'bg-up/10' : r.draw ? 'bg-card-soft' : 'bg-down/10'
                  }`}
                >
                  <div
                    className={`text-xs font-bold mb-1 ${
                      r.won ? 'text-up' : r.draw ? 'text-ink-mute' : 'text-down'
                    }`}
                  >
                    {r.won ? '승' : r.draw ? '무' : '패'}
                  </div>
                  <div className="text-sm font-medium text-ink tabular-nums">
                    {r.myScore}-{r.oppScore}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-mute text-center py-4">
              경기 기록이 없습니다
            </p>
          )}
        </div>

        {/* Head-to-Head */}
        {headToHead.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-semibold text-ink tracking-tight mb-3 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-ink-mute" /> 상대 전적
            </h3>
            <div className="space-y-1.5">
              {headToHead.map((r) => {
                const total = r.wins + r.draws + r.losses;
                const dominant = r.wins > r.losses;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 bg-card-soft rounded-lg"
                  >
                    <span className="text-sm font-medium text-ink truncate">
                      vs {r.name}
                      {r.isGuest && <span className="ml-1 text-[10px] font-bold text-ink-faint align-middle">게스트</span>}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-bold tabular-nums ${dominant ? 'text-up' : r.wins < r.losses ? 'text-down' : 'text-ink-mute'}`}>
                        {r.wins}승{r.draws > 0 ? ` ${r.draws}무` : ''} {r.losses}패
                      </span>
                      <span className="text-xs text-ink-faint tabular-nums">({total}경기)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Season History */}
        {careerStats && careerStats.seasonHistory.length > 0 && (
          <SeasonHistorySection seasonHistory={careerStats.seasonHistory} />
        )}

        {/* Total Points */}
        {stats && (
          <div className="px-6 pb-6">
            <div className="p-4 bg-accent rounded-xl text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium opacity-90">총 점수</span>
                <span className="text-3xl font-bold tabular-nums">{stats.totalPoints}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
