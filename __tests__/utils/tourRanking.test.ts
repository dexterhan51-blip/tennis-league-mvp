import { Player, Match, FriendlyMatchRow } from '@/types';
import { calculateRanking } from '@/utils/tennisLogic';
import {
  calculateTourRanking,
  collectYears,
  collectAllPlayers,
  TourLeagueSource,
} from '@/utils/tourRanking';

// --- Helper factories ---

const P = (id: string, name: string, gender: 'MALE' | 'FEMALE' = 'MALE', bonusPoints?: number): Player => ({
  id,
  name,
  gender,
  ...(bonusPoints !== undefined ? { bonusPoints } : {}),
});

let matchSeq = 0;
const M = (date: string, a: [Player, Player], b: [Player, Player], scoreA: number, scoreB: number, extra: Partial<Match> = {}): Match => ({
  id: `m-${++matchSeq}`,
  date,
  teamA: { id: `ta-${matchSeq}`, man: a[0], woman: a[1] },
  teamB: { id: `tb-${matchSeq}`, man: b[0], woman: b[1] },
  scoreA,
  scoreB,
  isFinished: true,
  ...extra,
});

// 단식: man === woman
const S = (date: string, a: Player, b: Player, scoreA: number, scoreB: number): Match =>
  M(date, [a, a], [b, b], scoreA, scoreB);

const m1 = P('p1', '성종');
const m2 = P('p2', '민수');
const w1 = P('w1', '지윤', 'FEMALE');
const w2 = P('w2', '유진', 'FEMALE');

const league = (id: string, name: string, players: Player[], matches: Match[]): TourLeagueSource => ({
  id, name, players, matches,
});

const friendlyRow = (match: Match): FriendlyMatchRow => ({
  id: match.id,
  match_date: match.date,
  match,
});

describe('calculateTourRanking', () => {
  it('두 리그 합산이 각 리그 calculateRanking totalPoints 합과 일치한다', () => {
    const matchesA = [M('2026-03-01', [m1, w1], [m2, w2], 6, 3)];
    const matchesB = [M('2026-07-04', [m1, w2], [m2, w1], 2, 6)];
    const lA = league('a', '3월 리그', [m1, m2, w1, w2], matchesA);
    const lB = league('b', '7월 리그', [m1, m2, w1, w2], matchesB);

    const tour = calculateTourRanking([lA, lB], []);
    const rankA = calculateRanking(lA.players, matchesA);
    const rankB = calculateRanking(lB.players, matchesB);

    const expected = (pid: string) =>
      (rankA.find(s => s.playerId === pid)?.totalPoints ?? 0) +
      (rankB.find(s => s.playerId === pid)?.totalPoints ?? 0);

    ['p1', 'p2', 'w1', 'w2'].forEach(pid => {
      const entry = tour.find(e => e.playerId === pid);
      expect(entry?.totalPoints).toBe(expected(pid));
    });
    // 대회별 내역이 2건씩 기록된다
    expect(tour.find(e => e.playerId === 'p1')?.perLeague).toHaveLength(2);
  });

  it('연말에 걸친 리그가 연도별로 분할되고(출석 점수 포함) 통산은 두 연도의 합이다', () => {
    const dec = M('2026-12-30', [m1, w1], [m2, w2], 6, 0); // m1 승
    const jan = M('2027-01-02', [m1, w1], [m2, w2], 0, 6); // m1 패
    const l = league('x', '연말 리그', [m1, m2, w1, w2], [dec, jan]);

    const y2026 = calculateTourRanking([l], [], 2026);
    const y2027 = calculateTourRanking([l], [], 2027);
    const total = calculateTourRanking([l], []);

    const p1_2026 = y2026.find(e => e.playerId === 'p1')!;
    const p1_2027 = y2027.find(e => e.playerId === 'p1')!;
    const p1_total = total.find(e => e.playerId === 'p1')!;

    expect(p1_2026.totalPoints).toBe(2); // 출석 1 + 승리 1
    expect(p1_2027.totalPoints).toBe(1); // 출석 1
    expect(p1_total.totalPoints).toBe(p1_2026.totalPoints + p1_2027.totalPoints);
  });

  it('친선경기는 참석 1점 + 승리 1점 규칙으로 friendlyPoints에 집계된다', () => {
    const f = friendlyRow(S('2026-05-05', m1, m2, 6, 4)); // m1 단식 승
    const tour = calculateTourRanking([], [f]);

    const winner = tour.find(e => e.playerId === 'p1')!;
    const loser = tour.find(e => e.playerId === 'p2')!;
    expect(winner.totalPoints).toBe(2);
    expect(winner.friendlyPoints).toBe(2);
    expect(winner.friendlyWins).toBe(1);
    expect(winner.matchesPlayed).toBe(1); // 단식 = 1명 처리
    expect(loser.totalPoints).toBe(1); // 출석만
    expect(loser.friendlyPoints).toBe(1);
    expect(winner.perLeague).toHaveLength(0);
  });

  it('리그 점수와 친선 점수가 같은 선수에게 합산된다', () => {
    const l = league('a', '리그', [m1, m2, w1, w2], [M('2026-03-01', [m1, w1], [m2, w2], 6, 3)]);
    const f = friendlyRow(S('2026-05-05', m1, m2, 6, 4));
    const tour = calculateTourRanking([l], [f]);

    const p1 = tour.find(e => e.playerId === 'p1')!;
    expect(p1.totalPoints).toBe(4); // 리그(출석1+승1) + 친선(출석1+승1)
    expect(p1.friendlyPoints).toBe(2);
    expect(p1.perLeague).toHaveLength(1);
  });

  it('게스트는 제외되고, bonusPoints는 투어 집계에 반영되지 않는다', () => {
    const guest = P('guest-male-1', '게스트(남)');
    const bonusPlayer = P('p1', '성종', 'MALE', 50); // 구 시즌 보너스 50점
    const l = league('a', '리그', [bonusPlayer, m2, w1, w2], [
      M('2026-03-01', [bonusPlayer, w1], [guest, w2], 6, 3),
    ]);
    const tour = calculateTourRanking([l], []);

    expect(tour.find(e => e.playerId === 'guest-male-1')).toBeUndefined();
    expect(tour.find(e => e.playerId === 'p1')?.totalPoints).toBe(2); // 보너스 50 미반영
  });

  it('미출전(0점·0경기) 로스터 선수는 목록에 나오지 않는다', () => {
    const bench = P('bench', '벤치');
    const l = league('a', '리그', [m1, m2, w1, w2, bench], [M('2026-03-01', [m1, w1], [m2, w2], 6, 3)]);
    const tour = calculateTourRanking([l], []);
    expect(tour.find(e => e.playerId === 'bench')).toBeUndefined();
  });

  it('미완료·시범 경기는 집계되지 않는다', () => {
    const l = league('a', '리그', [m1, m2, w1, w2], [
      M('2026-03-01', [m1, w1], [m2, w2], 6, 3, { isFinished: false }),
      M('2026-03-08', [m1, w1], [m2, w2], 6, 3, { isExhibition: true }),
    ]);
    expect(calculateTourRanking([l], [])).toHaveLength(0);
  });
});

describe('collectYears / collectAllPlayers', () => {
  it('리그·친선의 경기 날짜에서 연도를 내림차순 수집한다', () => {
    const l = league('a', '리그', [m1, m2, w1, w2], [
      M('2025-11-01', [m1, w1], [m2, w2], 6, 3),
      M('2026-01-05', [m1, w1], [m2, w2], 6, 3),
    ]);
    const f = friendlyRow(S('2027-02-01', m1, m2, 6, 4));
    expect(collectYears([l], [f])).toEqual([2027, 2026, 2025]);
  });

  it('로스터+친선 스냅샷에서 비게스트 선수를 중복 없이 수집한다', () => {
    const guest = P('guest-male-1', '게스트(남)');
    const extra = P('p9', '외부인');
    const l = league('a', '리그', [m1, m2, guest], []);
    const f = friendlyRow(S('2026-05-05', m1, extra, 6, 4));
    const players = collectAllPlayers([l], [f]);
    const ids = players.map(p => p.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).toContain('p9');
    expect(ids).not.toContain('guest-male-1');
    expect(ids.filter(id => id === 'p1')).toHaveLength(1);
  });
});
