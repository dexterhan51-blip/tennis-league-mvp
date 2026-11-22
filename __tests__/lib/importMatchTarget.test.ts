import { importCandidates } from '@/lib/importMatchTarget';
import type { Match, Player } from '@/types';
const player = (id: string): Player => ({ id, name: id, gender: 'MALE' });
const match: Match = { id: 'old', date: '2026-11-21', teamA: { id: 'a', man: player('a'), woman: player('b') }, teamB: { id: 'b', man: player('c'), woman: player('d') }, scoreA: 0, scoreB: 0, isFinished: false };
it('재대결 후보를 보존하고 반대 순서의 팀도 연결한다', () => {
  const rows = [match, { ...match, id: 'rematch', matchNumber: 2 }].map((match) => ({ match, seasonId: null }));
  expect(importCandidates(rows, match.date, ['c','d'], ['b','a']).map((c) => [c.match.id, c.flipped])).toEqual([['old', true], ['rematch', true]]);
  expect(importCandidates(rows, '2026-11-22', ['a','b'], ['c','d'])).toEqual([]);
  expect(importCandidates(rows, match.date, ['a','c'], ['b','d'])).toEqual([]);
});
