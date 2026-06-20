import {
  addPoint,
  gameWinner,
  isGameOver,
  isDeuce,
  isGoldenPoint,
  displayScore,
  type GamePoints,
  type ScoringConfig,
} from '@/lib/liveScoring';
import { generateTimelineText, hasTimelineData } from '@/lib/timelineExport';
import type { Match, Player } from '@/types';

const NO_AD: ScoringConfig = { rule: 'no-ad', winPoints: 4 };
const DEUCE: ScoringConfig = { rule: 'deuce', winPoints: 4 };

// 점수 시퀀스를 순서대로 적용
function play(seq: ('A' | 'B')[], cfg: ScoringConfig): GamePoints {
  return seq.reduce<GamePoints>((p, t) => addPoint(p, t, cfg), { a: 0, b: 0 });
}

describe('liveScoring — 노애드', () => {
  it('먼저 4점 도달 시 승 (4:2)', () => {
    const p = play(['A', 'A', 'B', 'A', 'B', 'A'], NO_AD);
    expect(p).toEqual({ a: 4, b: 2 });
    expect(gameWinner(p, NO_AD)).toBe('A');
    expect(isGameOver(p, NO_AD)).toBe(true);
  });

  it('3:3은 골든포인트(미종료), 다음 득점이 승부 (4:3)', () => {
    const tie = play(['A', 'A', 'A', 'B', 'B', 'B'], NO_AD);
    expect(tie).toEqual({ a: 3, b: 3 });
    expect(gameWinner(tie, NO_AD)).toBeNull();
    expect(isGoldenPoint(tie, NO_AD)).toBe(true);
    const done = addPoint(tie, 'B', NO_AD);
    expect(done).toEqual({ a: 3, b: 4 });
    expect(gameWinner(done, NO_AD)).toBe('B');
  });

  it('게임 종료 후 추가 포인트는 무시', () => {
    const p = play(['A', 'A', 'A', 'A'], NO_AD); // 4:0 종료
    expect(addPoint(p, 'B', NO_AD)).toEqual({ a: 4, b: 0 });
  });

  it('표시 점수 0/15/30/40', () => {
    expect(displayScore({ a: 0, b: 1 }, NO_AD)).toEqual({ a: '0', b: '15' });
    expect(displayScore({ a: 2, b: 3 }, NO_AD)).toEqual({ a: '30', b: '40' });
  });
});

describe('liveScoring — 듀스', () => {
  it('3:3은 듀스(미종료), 2점차로만 승 (5:3)', () => {
    const tie = play(['A', 'A', 'A', 'B', 'B', 'B'], DEUCE);
    expect(isDeuce(tie, DEUCE)).toBe(true);
    expect(gameWinner(tie, DEUCE)).toBeNull();
    const ad = addPoint(tie, 'A', DEUCE); // 4:3 (AD)
    expect(gameWinner(ad, DEUCE)).toBeNull();
    const win = addPoint(ad, 'A', DEUCE); // 5:3
    expect(gameWinner(win, DEUCE)).toBe('A');
  });

  it('AD 표시 (우위)', () => {
    const ad = { a: 4, b: 3 }; // 듀스 후 A 우위
    expect(displayScore(ad, DEUCE)).toEqual({ a: 'AD', b: '40' });
    expect(displayScore({ a: 3, b: 3 }, DEUCE)).toEqual({ a: '40', b: '40' });
  });
});

// ─────────────────────────── 타임라인 내보내기 ───────────────────────────

const mkPlayer = (id: string, name: string): Player => ({ id, name, gender: 'MALE' });

function mkMatch(over: Partial<Match> = {}): Match {
  const a1 = mkPlayer('a1', '민수');
  const a2 = mkPlayer('a2', '지영');
  const b1 = mkPlayer('b1', '철수');
  const b2 = mkPlayer('b2', '영희');
  return {
    id: 'm1',
    date: '2026-06-20',
    teamA: { id: 'tA', man: a1, woman: a2 },
    teamB: { id: 'tB', man: b1, woman: b2 },
    scoreA: 4,
    scoreB: 2,
    isFinished: true,
    scoringRule: 'no-ad',
    serveOrder: ['a1', 'b1', 'a2', 'b2'],
    pointLog: [
      { t: 0, winner: 'A', pointA: 1, pointB: 0, gameA: 0, gameB: 0, serverId: 'a1' },
      { t: 65, winner: 'B', pointA: 1, pointB: 1, gameA: 0, gameB: 0, serverId: 'a1' },
      { t: 130, winner: 'A', pointA: 4, pointB: 1, gameA: 1, gameB: 0, gameWon: 'A', serverId: 'a1' },
    ],
    ...over,
  };
}

describe('timelineExport', () => {
  const players = [mkPlayer('a1', '민수'), mkPlayer('a2', '지영'), mkPlayer('b1', '철수'), mkPlayer('b2', '영희')];

  it('pointLog가 있으면 타임라인 텍스트 생성', () => {
    const text = generateTimelineText('테스트리그', '2026-06-20', [mkMatch()], players);
    expect(text).toContain('GAME 1');
    expect(text).toContain('최종 4 : 2');
    expect(text).toContain('서브 순서: 민수 → 철수 → 지영 → 영희');
    expect(text).toContain('1:05'); // t=65초 → 1:05
    expect(text).toContain('게임 획득'); // 게임 따낸 포인트 표시
    expect(text).toContain('민수 & 지영'); // 팀 A 라벨
  });

  it('pointLog 없으면 빈 문자열 + hasTimelineData false', () => {
    const noLog = mkMatch({ pointLog: undefined });
    expect(generateTimelineText('L', '2026-06-20', [noLog], players)).toBe('');
    expect(hasTimelineData('2026-06-20', [noLog])).toBe(false);
    expect(hasTimelineData('2026-06-20', [mkMatch()])).toBe(true);
  });
});
