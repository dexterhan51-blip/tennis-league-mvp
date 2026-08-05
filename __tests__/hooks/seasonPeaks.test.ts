import { calculateSeasonPeaks } from '@/hooks/useLeagueRankings';
import type { Player, Match } from '@/types';

const player = (id: string, name: string, gender: 'MALE' | 'FEMALE'): Player => ({
  id,
  name,
  gender,
});

const match = (
  id: string,
  date: string,
  teamA: [Player, Player],
  teamB: [Player, Player],
  scoreA: number,
  scoreB: number,
): Match => ({
  id,
  date,
  teamA: { id: `${id}-a`, man: teamA[0], woman: teamA[1] },
  teamB: { id: `${id}-b`, man: teamB[0], woman: teamB[1] },
  scoreA,
  scoreB,
  isFinished: true,
});

describe('calculateSeasonPeaks', () => {
  const m1 = player('m1', 'M1', 'MALE');
  const m2 = player('m2', 'M2', 'MALE');
  const w1 = player('w1', 'W1', 'FEMALE');
  const w2 = player('w2', 'W2', 'FEMALE');
  const idle = player('idle', 'Idle', 'MALE'); // 시즌 내내 미출전

  it('경기가 없으면 아무 피크도 기록되지 않는다', () => {
    expect(calculateSeasonPeaks([m1, m2, w1, w2], []).size).toBe(0);
  });

  it('미출전 로스터 선수는 피크를 얻지 않는다 (0경기 1~2위 오염 방지)', () => {
    const matches = [match('g1', '2026-01-01', [m1, w1], [m2, w2], 6, 3)];
    const peaks = calculateSeasonPeaks([idle, m1, m2, w1, w2], matches);
    expect(peaks.has('idle')).toBe(false);
    // 명단 맨 앞의 idle이 아닌, 실제 승리 팀이 1위 피크를 가진다
    expect(peaks.get('m1')).toBe(1);
  });

  it('날짜별 리플레이로 최고 순위를 기록한다', () => {
    const matches = [
      // 1일차: m1+w1 승 → m1, w1이 상위
      match('g1', '2026-01-01', [m1, w1], [m2, w2], 6, 2),
      // 2일차: m2+w2가 두 번 승 → m2, w2가 역전해도 m1의 1일차 피크는 유지
      match('g2', '2026-01-08', [m2, w2], [m1, w1], 6, 1),
      match('g3', '2026-01-08', [m2, w2], [m1, w1], 6, 0),
    ];
    const peaks = calculateSeasonPeaks([m1, m2, w1, w2], matches);
    // 1일차 시점 승자였던 m1은 피크 1위 보존
    expect(peaks.get('m1')).toBe(1);
    // 2일차에 역전한 m2도 피크 1위
    expect(peaks.get('m2')).toBe(1);
  });

  it('미완료 경기만 있는 날짜는 무시한다', () => {
    const pending: Match = {
      ...match('g1', '2026-01-01', [m1, w1], [m2, w2], 0, 0),
      isFinished: false,
    };
    expect(calculateSeasonPeaks([m1, m2, w1, w2], [pending]).size).toBe(0);
  });
});
