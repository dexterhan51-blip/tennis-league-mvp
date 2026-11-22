import type { Match } from '@/types';
import { teamMembers } from '@/utils/playerInsights';

export interface ImportCandidate { match: Match; seasonId: string | null; flipped: boolean }
const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
/** 같은 대진의 재대결은 번호로 분리. 번호 없는 옛 기록은 사용자가 명시적으로 고른다. */
export function importCandidates(rows: { match: Match; seasonId: string | null }[], date: string, a: string[], b: string[]): ImportCandidate[] {
  return rows.flatMap<ImportCandidate>((row) => {
    if (row.match.date !== date) return [];
    const ma = teamMembers(row.match.teamA).map((p) => p.id);
    const mb = teamMembers(row.match.teamB).map((p) => p.id);
    if (same(ma, a) && same(mb, b)) return [{ ...row, flipped: false }];
    if (same(ma, b) && same(mb, a)) return [{ ...row, flipped: true }];
    return [];
  });
}
