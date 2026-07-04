'use client';

import React, { useMemo } from 'react';
import { X, Trophy, Target, TrendingUp, Flame, Star, Crown, Swords, Sparkles, Skull, Zap } from 'lucide-react';
import type { Player, Match, PlayerStat, PlayerCareerStats, PlayerWithRank } from '@/types';
import { GUEST_M_ID, GUEST_F_ID, isGuestPlayer } from '@/utils/tennisLogic';
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

    const records = new Map<string, { name: string; wins: number; draws: number; losses: number }>();

    matches.forEach((m) => {
      if (!m.isFinished || m.isExhibition) return;
      const teamPlayers = (team: Match['teamA']) =>
        team.man.id === team.woman.id ? [team.man] : [team.man, team.woman];

      const inA = teamPlayers(m.teamA).some(p => p.id === player.id);
      const inB = teamPlayers(m.teamB).some(p => p.id === player.id);
      if (!inA && !inB) return;

      const opponents = teamPlayers(inA ? m.teamB : m.teamA).filter(p => !isGuestPlayer(p.id));
      const myScore = inA ? m.scoreA : m.scoreB;
      const oppScore = inA ? m.scoreB : m.scoreA;

      opponents.forEach(opp => {
        const rec = records.get(opp.id) || { name: opp.name, wins: 0, draws: 0, losses: 0 };
        if (myScore > oppScore) rec.wins++;
        else if (myScore < oppScore) rec.losses++;
        else rec.draws++;
        records.set(opp.id, rec);
      });
    });

    return Array.from(records.values())
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

        {/* Character Section (시즌 데이터 기반 별명/플레이스타일/천적) */}
        {character && (
          <div className="px-6 pb-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-4 text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-lime-300 uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> 캐릭터
                </div>
                <div className="text-xl font-black leading-tight">{character.nickname}</div>
                {character.proPlayer && (
                  <div className="text-sm font-bold text-lime-300 mt-0.5">“{character.proPlayer}”</div>
                )}
                <div className="text-xs text-slate-300 mt-1.5">{character.tagline}</div>
              </div>
              <div className="bg-white p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Zap className="w-4 h-4 text-clay-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-clay-600 mb-0.5">플레이스타일</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{character.style}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Skull className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-red-500 mb-0.5">천적 / 약점</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{character.nemesis}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Flame className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-orange-500 mb-0.5">강점 / 케미</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{character.edge}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Career Section */}
        {(careerStats || currentRank) && (
          <div className="px-6 pb-4">
            <div className="p-4 bg-amber-50 rounded-xl space-y-2">
              <h3 className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                <Crown className="w-4 h-4" /> 커리어
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {currentRank && (
                  <div>
                    <div className="text-xs text-slate-500">현재 순위</div>
                    <div className="text-lg font-bold text-slate-900">{currentRank}위</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-500">최고 순위</div>
                  <div className="text-lg font-bold text-amber-600">
                    {careerStats ? `${careerStats.peakRank}위` : currentRank ? `${currentRank}위` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">시즌 우승</div>
                  <div className="text-lg font-bold text-slate-900">
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
              <div className="p-4 bg-clay-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-clay-600" />
                  <span className="text-xs font-medium text-clay-600">총 경기</span>
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

            {/* Win/Draw/Loss */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">승/무/패</span>
                <span className="text-sm font-bold text-slate-900">
                  {stats.wins}승 {stats.draws}무 {stats.losses}패
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-clay-500 transition-all"
                  style={{
                    width: `${stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0}%`,
                  }}
                />
                <div
                  className="h-full bg-slate-400 transition-all"
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
          <h3 className="text-sm font-bold text-slate-700 mb-3">최근 5경기</h3>
          {recentMatches.length > 0 ? (
            <div className="flex gap-2">
              {recentMatches.map((r, i) => (
                <div
                  key={i}
                  className={`flex-1 p-3 rounded-xl text-center ${
                    r.won ? 'bg-clay-100' : r.draw ? 'bg-slate-100' : 'bg-red-100'
                  }`}
                >
                  <div
                    className={`text-xs font-bold mb-1 ${
                      r.won ? 'text-clay-600' : r.draw ? 'text-slate-500' : 'text-red-600'
                    }`}
                  >
                    {r.won ? '승' : r.draw ? '무' : '패'}
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

        {/* Head-to-Head */}
        {headToHead.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-slate-500" /> 상대 전적
            </h3>
            <div className="space-y-1.5">
              {headToHead.map((r) => {
                const total = r.wins + r.draws + r.losses;
                const dominant = r.wins > r.losses;
                return (
                  <div
                    key={r.name}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-slate-800 truncate">vs {r.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-bold ${dominant ? 'text-clay-600' : r.wins < r.losses ? 'text-red-500' : 'text-slate-600'}`}>
                        {r.wins}승{r.draws > 0 ? ` ${r.draws}무` : ''} {r.losses}패
                      </span>
                      <span className="text-xs text-slate-400">({total}경기)</span>
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
            <div className="p-4 bg-gradient-to-r from-clay-500 to-clay-600 rounded-xl text-white">
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
