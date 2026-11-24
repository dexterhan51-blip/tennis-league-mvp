import { countableMatches, currentScope, knownGuests, rankedPlayers, type ClubData } from '@/lib/clubView';
import { calculateRanking, createNamedGuest } from '@/utils/tennisLogic';
import type { Match, Player, SeasonRow } from '@/types';

const p = (id: string, gender: 'MALE' | 'FEMALE' = 'MALE'): Player => ({ id, name: id, gender });
const a = p('a');
const b = p('b');
const c = p('c', 'FEMALE');
const d = p('d', 'FEMALE');
const guest = createNamedGuest('손님', 'MALE');
const former = createNamedGuest('탈퇴한 멤버', 'MALE');

let n = 0;
const match = (date: string, t1: [Player, Player], t2: [Player, Player], sa: number, sb: number, extra: Partial<Match> = {}): Match => ({
  id: `m${n++}`, date,
  teamA: { id: 'ta', man: t1[0], woman: t1[1] },
  teamB: { id: 'tb', man: t2[0], woman: t2[1] },
  scoreA: sa, scoreB: sb, isFinished: true, ...extra,
});
const season = (status: SeasonRow['status'], players: Player[]): SeasonRow => ({
  id: 's1', season_no: 1, name: '시즌 1', status, players,
  starts_on: '2025-03-01', ends_on: null, final_rankings: null, champion_player_id: null, created_at: '', updated_at: '',
});

const leagueMatch = match('2025-03-01', [a, c], [b, d], 4, 2);
const daily1 = match('2026-10-04', [a, c], [guest, d], 4, 1);
const daily2 = match('2026-10-04', [b, c], [former, d], 2, 4);
const data = (status: SeasonRow['status']): ClubData => ({
  seasons: [{ season: season(status, [a, b, c, d]), matches: [leagueMatch] }],
  friendly: [
    { id: daily1.id, match_date: daily1.date, match: daily1 },
    { id: daily2.id, match_date: daily2.date, match: { ...daily2, isFriendly: true } },
  ],
  members: [a, b, c, d],
});

describe('clubView', () => {
  it('그날 경기도 순위에 들어가도록 친선 표시를 떼고 날짜순으로 합친다', () => {
    const all = countableMatches(data('archived'));
    expect(all.map((m) => m.date)).toEqual(['2025-03-01', '2026-10-04', '2026-10-04']);
    expect(all.every((m) => !m.isFriendly)).toBe(true);
  });

  it('기간(2026년 11월~)에 든 경기가 없으면 통산으로 본다', () => {
    const scope = currentScope(data('archived'), '2026-11-24');
    expect(scope).toMatchObject({ kind: 'all', label: '통산' });
    expect(scope?.matches).toHaveLength(3);
  });

  it('진행 중 시즌이 없으면 두 달 기간으로 본다 — 지금 기간이 비었으면 경기가 있는 최근 기간', () => {
    const nov = match('2026-11-21', [a, c], [guest, d], 4, 1);
    const novFormer = match('2026-11-21', [b, c], [former, d], 2, 4);
    const withNov: ClubData = {
      ...data('archived'),
      friendly: [...data('archived').friendly, { id: nov.id, match_date: nov.date, match: nov }, { id: novFormer.id, match_date: novFormer.date, match: novFormer }],
    };
    const scope = currentScope(withNov, '2027-01-03');
    expect(scope).toMatchObject({ kind: 'period', label: '2026년 11~12월' });
    expect(scope?.matches.map((m) => m.date)).toEqual(['2026-11-21', '2026-11-21']);
    // 참석 1점 + 승리 1점: a 2점, c 2점(1승 1패), d 2점(1승 1패), b 1점. 게스트·탈퇴 회원은 순위에 없다
    const table = calculateRanking(scope!.players, scope!.matches);
    expect(table.map((s) => s.playerId).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(table.find((s) => s.playerId === 'a')?.totalPoints).toBe(2);
    expect(table.find((s) => s.playerId === 'b')?.totalPoints).toBe(1);
  });

  it('진행 중 시즌이 있으면 그 시즌을 보여준다', () => {
    expect(currentScope(data('live'))).toMatchObject({ kind: 'season', label: '시즌 1' });
  });

  it('기록이 하나도 없으면 null', () => {
    expect(currentScope({ seasons: [], friendly: [], members: [a] })).toBeNull();
  });

  it('이름 게스트 목록에 탈퇴 회원은 넣지 않는다', () => {
    expect(knownGuests(data('archived')).map((g) => g.name)).toEqual(['손님']);
  });

  it('명단에 없어도 경기에 나온 비게스트 선수는 순위 대상에 넣는다', () => {
    const extra = p('z');
    const m = match('2026-11-01', [extra, c], [a, d], 4, 0);
    expect(rankedPlayers({ seasons: [], friendly: [], members: [a] }, [m]).map((x) => x.id).sort()).toEqual(['a', 'c', 'd', 'z']);
  });
});
