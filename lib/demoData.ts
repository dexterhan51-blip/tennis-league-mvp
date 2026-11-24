// 예시 데이터 — Supabase 환경변수가 없는 로컬 개발 환경에서만 쓰인다 (화면 확인용).
// 서버가 설정된 실제 앱에서는 절대 섞이지 않는다. 이름은 전부 가상 인물.

import type { Match, Player, SeasonRow, ScheduleItem } from '@/types';

const MEN = ['한씨', '회장님', '손과장', '박대리', '최프로'];
const WOMEN = ['김주사', '공주', '이대리', '정사원', '윤인턴'];

export const DEMO_PLAYERS: Player[] = [
  ...MEN.map((name, i): Player => ({ id: `demo-m${i + 1}`, name, gender: 'MALE', mvpCount: i === 0 ? 2 : 0 })),
  ...WOMEN.map((name, i): Player => ({ id: `demo-f${i + 1}`, name, gender: 'FEMALE', mvpCount: i === 1 ? 3 : 0 })),
];

/** 예시 화면에서 "나"로 삼는 선수 */
export const DEMO_MY_PLAYER_ID = 'demo-m1';

// 고정 시드 난수 — 새로고침해도 같은 예시가 나온다
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildMatches(): Match[] {
  const rand = seeded(40);
  const dates = ['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31', '2026-11-07', '2026-11-14'];
  const men = DEMO_PLAYERS.filter((p) => p.gender === 'MALE');
  const women = DEMO_PLAYERS.filter((p) => p.gender === 'FEMALE');
  // 선수별 실력 가중치 (앞쪽일수록 조금 강함)
  const skill = new Map(DEMO_PLAYERS.map((p, i) => [p.id, 1 - (i % 5) * 0.12]));
  const matches: Match[] = [];

  dates.forEach((date, d) => {
    for (let k = 0; k < 5; k++) {
      const m1 = men[(d + k) % 5];
      const m2 = men[(d + k + 1 + (k % 3)) % 5];
      const w1 = women[(d * 2 + k) % 5];
      const w2 = women[(d * 2 + k + 2 + (k % 2)) % 5];
      if (m1.id === m2.id || w1.id === w2.id) continue;
      const a = (skill.get(m1.id) ?? 0.5) + (skill.get(w1.id) ?? 0.5);
      const b = (skill.get(m2.id) ?? 0.5) + (skill.get(w2.id) ?? 0.5);
      const aWins = rand() < a / (a + b);
      const loser = Math.floor(rand() * 6);
      matches.push({
        id: `demo-${date}-${k}`,
        date,
        teamA: { id: `demo-ta-${d}-${k}`, man: m1, woman: w1 },
        teamB: { id: `demo-tb-${d}-${k}`, man: m2, woman: w2 },
        scoreA: aWins ? 6 : loser,
        scoreB: aWins ? loser : 6,
        isFinished: true,
        videoUrl: k < 2 && d >= 4 ? 'https://www.youtube.com/watch?v=demo0000000' : undefined,
      });
    }
  });
  return matches;
}

export const DEMO_MATCHES: Match[] = buildMatches();

/** 예시 일정 — 화면 확인용 (오늘 기준 다음 주말들) */
function demoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DEMO_SCHEDULE: ScheduleItem[] = [
  { id: 'demo-s1', date: demoDate(4), time: '14:00', place: '평촌 3번 코트', memo: '2면' },
  { id: 'demo-s2', date: demoDate(11), time: '19:00', place: '의왕 실내 코트' },
];

export const DEMO_SEASON: SeasonRow = {
  id: 'demo-season',
  season_no: 5,
  name: '2026 시즌 5 (예시)',
  status: 'live',
  players: DEMO_PLAYERS,
  starts_on: '2026-10-10',
  ends_on: null,
  final_rankings: null,
  champion_player_id: null,
  created_at: '2026-10-10T00:00:00Z',
  updated_at: '2026-11-14T00:00:00Z',
};
