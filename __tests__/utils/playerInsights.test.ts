import { Match, Player } from '@/types';
import {
  matchesOf,
  opponentRecords,
  outcomeFor,
  partnerRecords,
  rankTimeline,
  recentForm,
  standingOf,
} from '@/utils/playerInsights';

const p = (id: string, gender: 'MALE' | 'FEMALE' = 'MALE'): Player => ({ id, name: id.toUpperCase(), gender });
const a = p('a');
const b = p('b');
const c = p('c', 'FEMALE');
const d = p('d', 'FEMALE');
const players = [a, b, c, d];

let seq = 0;
const match = (date: string, t1: [Player, Player], t2: [Player, Player], sa: number, sb: number, extra: Partial<Match> = {}): Match => ({
  id: `m${seq++}`,
  date,
  teamA: { id: 'ta', man: t1[0], woman: t1[1] },
  teamB: { id: 'tb', man: t2[0], woman: t2[1] },
  scoreA: sa,
  scoreB: sb,
  isFinished: true,
  ...extra,
});

const matches: Match[] = [
  match('2026-01-03', [a, c], [b, d], 6, 2), // a·c 승
  match('2026-01-03', [a, d], [b, c], 3, 6), // b·c 승
  match('2026-01-10', [a, c], [b, d], 6, 4), // a·c 승
  match('2026-01-10', [a, c], [b, d], 1, 0, { isFinished: false }),
];

describe('playerInsights', () => {
  it('선수 기준 승패를 판정하고 미완료 경기는 제외한다', () => {
    expect(outcomeFor(matches[0], 'a')).toBe('W');
    expect(outcomeFor(matches[0], 'b')).toBe('L');
    expect(outcomeFor(matches[3], 'a')).toBeNull();
    expect(outcomeFor(matches[0], 'zzz')).toBeNull();
    expect(matchesOf(matches, 'a')).toHaveLength(3);
    expect(matchesOf(matches, 'a')[0].date).toBe('2026-01-10');
  });

  it('최근 흐름은 오래된 것부터 최신 순', () => {
    expect(recentForm(matches, 'a')).toEqual(['W', 'L', 'W']);
  });

  it('파트너·상대 전적을 집계한다', () => {
    const partners = partnerRecords(matches, 'a');
    expect(partners[0]).toMatchObject({ playerId: 'c', played: 2, wins: 2, winRate: 100 });
    expect(partners[1]).toMatchObject({ playerId: 'd', played: 1, losses: 1, winRate: 0 });
    const opponents = opponentRecords(matches, 'a');
    expect(opponents.find((o) => o.playerId === 'b')).toMatchObject({ played: 3, wins: 2, losses: 1 });
  });

  it('이름 없는 공용 게스트는 전적에 묶지 않는다', () => {
    const guest: Player = { id: 'guest-female', name: '게스트', gender: 'FEMALE' };
    const named: Player = { id: 'guest-named-kim', name: '김', gender: 'FEMALE' };
    const ms = [match('2026-02-01', [a, guest], [b, named], 6, 0)];
    expect(partnerRecords(ms, 'a')).toHaveLength(0);
    expect(opponentRecords(ms, 'a').map((o) => o.playerId)).toEqual(['b', 'guest-named-kim']);
  });

  it('순위 흐름과 현재 순위·변동·점수 차를 계산한다', () => {
    // 1/3: a 2점(참석1+1승), b 2점, c 3점(2승), d 1점 → c 1위
    // 1/10: a 4점, c 5점, b 3점, d 2점
    const timeline = rankTimeline(players, matches, 'a');
    expect(timeline.map((t) => t.date)).toEqual(['2026-01-03', '2026-01-10']);
    expect(timeline[1]).toMatchObject({ rank: 2, points: 4 });

    const standing = standingOf(players, matches, 'a');
    expect(standing.rank).toBe(2);
    expect(standing.gapAbove).toBe(1);
    expect(standing.change).toBe(timeline[0].rank - 2);
    expect(standingOf(players, matches, null).rank).toBeNull();
    expect(standingOf(players, matches, 'nobody').rank).toBeNull();
  });
});
