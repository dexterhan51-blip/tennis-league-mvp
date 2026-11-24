import { latestStrip, leaders, recentMeetings, topRanked, upcomingSchedule } from '@/lib/clubHome';
import type { ClubData, Scope } from '@/lib/clubView';
import type { Match, Player } from '@/types';

const p = (id: string, gender: 'MALE' | 'FEMALE' = 'MALE'): Player => ({ id, name: id.toUpperCase(), gender });
const a = p('a');
const b = p('b');
const c = p('c', 'FEMALE');
const d = p('d', 'FEMALE');
let n = 0;
const match = (date: string, t1: [Player, Player], t2: [Player, Player], sa: number, sb: number, extra: Partial<Match> = {}): Match => ({
  id: `m${n++}`, date,
  teamA: { id: 'ta', man: t1[0], woman: t1[1] },
  teamB: { id: 'tb', man: t2[0], woman: t2[1] },
  scoreA: sa, scoreB: sb, isFinished: true, ...extra,
});

const day1 = [match('2026-11-14', [a, c], [b, d], 4, 1), match('2026-11-14', [a, d], [b, c], 4, 2)];
const day2 = [
  match('2026-11-21', [a, c], [b, d], 1, 4, { detail: { source: 'fcpxml', importedAt: '', events: [], place: '평촌' } }),
  match('2026-11-21', [b, c], [a, d], 4, 3, { videoUrl: 'https://youtu.be/x' }),
  match('2026-11-21', [a, c], [b, d], 0, 0, { isFinished: false }),
];
const data: ClubData = {
  seasons: [],
  friendly: [...day1, ...day2].map((m) => ({ id: m.id, match_date: m.date, match: { ...m, isFriendly: true } })),
  members: [a, b, c, d],
  schedule: [
    { id: 's2', date: '2026-11-29', time: '19:00', place: '의왕' },
    { id: 's0', date: '2026-11-20', time: '14:00', place: '지난 곳' },
    { id: 's1', date: '2026-11-28', time: '', place: '평촌' },
  ],
};
const scope: Scope = { kind: 'period', label: '2026년 11~12월', name: '', players: [a, b, c, d], matches: [...day1, ...day2] };

describe('clubHome', () => {
  it('점수 띠는 가장 마지막 모임의 끝난 경기, 마지막 경기부터', () => {
    const strip = latestStrip(data)!;
    expect(strip.date).toBe('2026-11-21');
    expect(strip.matches.map((x) => x.no)).toEqual([2, 1]);
  });

  it('최근 모임은 최신 먼저, 장소·영상·인원을 모은다', () => {
    const [last, prev] = recentMeetings(data, 3);
    expect(last).toMatchObject({ date: '2026-11-21', place: '평촌', videos: 1, people: 4 });
    expect(last.matches).toHaveLength(2);
    expect(prev.date).toBe('2026-11-14');
    // 11-14: a 2승 → 남자 MVP, c·d 1승 1패 → 득실로 c(+3+(-2)=... ) vs d
    expect(prev.mvps.map((x) => x.id)).toContain('a');
  });

  it('다음 모임은 오늘 포함 이후만, 가까운 순', () => {
    expect(upcomingSchedule(data, '2026-11-24').map((s) => s.id)).toEqual(['s1', 's2']);
    expect(upcomingSchedule(data, '2026-11-28', 1).map((s) => s.id)).toEqual(['s1']);
  });

  it('상위 3과 직전 모임 대비 순위 변화', () => {
    const top = topRanked(scope, 3);
    expect(top).toHaveLength(3);
    expect(top.map((r) => r.rank)).toEqual([1, 2, 3]);
    // 11-14 뒤에는 a 가 1위였다
    const aRow = top.find((r) => r.stat.playerId === 'a');
    expect(aRow?.change ?? 0).toBeLessThanOrEqual(0);
  });

  it('기록 리더: 최다 승·최고 승률·최다 출석', () => {
    const list = leaders(scope);
    expect(list.map((l) => l.key)).toEqual(['wins', 'winRate', 'attendance']);
    expect(list[2].value).toBe('2번');
  });

  it('경기가 없으면 리더도 없다', () => {
    expect(leaders({ ...scope, matches: [] })).toEqual([]);
    expect(latestStrip({ ...data, friendly: [] })).toBeNull();
  });
});
