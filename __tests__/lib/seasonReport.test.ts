import { generateSeasonReportText } from '@/lib/seasonReport';
import type { Match, Player, PlayerStat, SeasonArchive, Team } from '@/types';

function player(id: string, name: string, gender: Player['gender'] = 'MALE'): Player {
  return { id, name, gender };
}

const 정민 = player('p1', '정민');
const 진아 = player('p2', '진아', 'FEMALE');
const 성종 = player('p3', '성종');
const 재경 = player('p4', '재경', 'FEMALE');

function team(man: Player, woman: Player): Team {
  return { id: `${man.id}-${woman.id}`, man, woman };
}

function match(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    date: '2026-07-01',
    teamA: team(정민, 진아),
    teamB: team(성종, 재경),
    scoreA: 6,
    scoreB: 4,
    isFinished: true,
    ...overrides,
  };
}

function stat(p: Player, overrides: Partial<PlayerStat>): PlayerStat {
  return {
    playerId: p.id,
    name: p.name,
    gender: p.gender,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    totalPoints: 0,
    winRate: 0,
    avgPoints: 0,
    dailyBonus: false,
    ...overrides,
  };
}

function archive(matches: Match[], finalRankings: PlayerStat[]): SeasonArchive {
  return {
    id: 'season-1',
    leagueName: '테스트 리그',
    slotIndex: 1,
    players: [정민, 진아, 성종, 재경],
    matches,
    finalRankings,
    championPlayerId: finalRankings[0]?.playerId,
    seasonStart: '2026-05-01',
    seasonEnd: '2026-06-30',
    totalMatchDays: 2,
    totalMatches: matches.filter(m => m.isFinished && !m.isExhibition).length,
  };
}

describe('generateSeasonReportText', () => {
  it('시즌 개요, 우승자, 최종 순위를 포함한다', () => {
    const text = generateSeasonReportText(
      archive(
        [match({})],
        [
          stat(정민, { wins: 1, totalPoints: 3, winRate: 1, matchesPlayed: 1 }),
          stat(성종, { losses: 1, totalPoints: 0, winRate: 0, matchesPlayed: 1 }),
        ]
      )
    );
    expect(text).toContain('[시즌 리포트] 테스트 리그');
    expect(text).toContain('2026-05-01 ~ 2026-06-30');
    expect(text).toContain('우승: 정민');
    expect(text).toContain('1위 정민 | 1승 0패 | 3점 | 승률 100%');
    expect(text).toContain('2위 성종 | 0승 1패 | 0점 | 승률 0%');
  });

  it('파트너별 성적과 상대 전적을 집계한다', () => {
    const matches = [
      // 정민&진아 vs 성종&재경 — A팀 승 x2
      match({ id: 'm1', scoreA: 6, scoreB: 4 }),
      match({ id: 'm2', scoreA: 6, scoreB: 2 }),
      // 정민&재경 vs 성종&진아 — B팀 승
      match({ id: 'm3', teamA: team(정민, 재경), teamB: team(성종, 진아), scoreA: 3, scoreB: 6 }),
    ];
    const text = generateSeasonReportText(
      archive(matches, [stat(정민, { wins: 2, losses: 1, matchesPlayed: 3, winRate: 2 / 3, totalPoints: 6 })])
    );
    expect(text).toContain('파트너별: 진아와 2승 0패, 재경과 0승 1패');
    // 성종은 3경기 모두 상대 (2패 후 1승 → 정민 시점에서 2승 1패)
    expect(text).toContain('성종 상대 2승 1패');
    // 진아는 2번 파트너, 1번 상대(m3에서 패)
    expect(text).toContain('진아 상대 0승 1패');
  });

  it('미완료 경기와 이벤트 경기는 집계에서 제외한다', () => {
    const matches = [
      match({ id: 'm1', isFinished: false }),
      match({ id: 'm2', isExhibition: true }),
    ];
    const text = generateSeasonReportText(
      archive(matches, [stat(정민, {})])
    );
    expect(text).not.toContain('파트너별');
    expect(text).not.toContain('상대 전적');
  });

  it('단식 경기는 파트너 없이 상대 전적만 집계한다', () => {
    const singles = match({
      id: 'm1',
      teamA: team(정민, 정민),
      teamB: team(성종, 성종),
      scoreA: 6,
      scoreB: 3,
    });
    const text = generateSeasonReportText(
      archive([singles], [stat(정민, { wins: 1, matchesPlayed: 1, winRate: 1, totalPoints: 3 })])
    );
    expect(text).not.toContain('파트너별');
    expect(text).toContain('성종 상대 1승 0패');
  });
});
