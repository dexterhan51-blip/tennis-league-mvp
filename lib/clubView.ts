// 클럽 전체 데이터(시즌 + 그날그날 경기 + 회원 명단)를 화면이 쓰기 좋은 모양으로 바꾸는 순수 함수.
// 요즘은 시즌 없이 그날 모인 사람끼리 치고 기록하므로, 진행 중 시즌이 없으면 "올해 전체 경기"를 한 묶음으로 본다.

import type { FriendlyMatchRow, Match, Player, SeasonRow } from '@/types';
import { isGuestPlayer, isNamedGuest } from '@/utils/tennisLogic';
import { teamMembers } from '@/utils/playerInsights';

export interface ClubData {
  seasons: { season: SeasonRow; matches: Match[] }[];
  friendly: FriendlyMatchRow[];
  members: Player[];
}

/** 탈퇴 회원 표시용 이름 — 경기 기록에는 남지만 순위·개인 기록 대상은 아니다 */
export const FORMER_MEMBER_NAME = '탈퇴한 멤버';

/**
 * 모든 경기를 날짜순으로. 그날그날 경기(친선으로 저장됨)도 순위에 들어가도록 isFriendly 표시는 뗀다.
 * 시범 경기(isExhibition)는 표시를 유지해 집계에서 빠진다.
 */
export function countableMatches(data: ClubData): Match[] {
  const league = data.seasons.flatMap((s) => s.matches);
  const daily = data.friendly.map((f) => {
    const m = { ...f.match };
    delete m.isFriendly;
    return m;
  });
  // 날짜가 같으면 시즌 경기 → 그날 경기 순, 각 묶음 안에서는 서버가 준 순서를 지킨다
  return [...league, ...daily]
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.date || '').localeCompare(b.m.date || '') || a.i - b.i)
    .map((x) => x.m);
}

/** 순위·개인 기록의 대상이 되는 사람들: 회원 명단 + (명단에 없지만) 경기에 나온 비게스트 선수 */
export function rankedPlayers(data: ClubData, matches: Match[]): Player[] {
  const map = new Map<string, Player>(data.members.map((p) => [p.id, p]));
  for (const m of matches) {
    for (const p of [...teamMembers(m.teamA), ...teamMembers(m.teamB)]) {
      if (!isGuestPlayer(p.id) && !map.has(p.id)) map.set(p.id, p);
    }
  }
  return [...map.values()];
}

/** 지금까지 이름으로 기록된 게스트 (다시 올 때 고르기 쉽게) */
export function knownGuests(data: ClubData): Player[] {
  const map = new Map<string, Player>();
  for (const m of countableMatches(data)) {
    for (const p of [...teamMembers(m.teamA), ...teamMembers(m.teamB)]) {
      if (isNamedGuest(p.id) && p.name !== FORMER_MEMBER_NAME) map.set(p.id, p);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 선수 id → 최신 사진 (회원 명단이 우선) */
export function photoMap(data: ClubData): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  for (const s of data.seasons) for (const p of s.season.players ?? []) if (p.photo) map.set(p.id, p.photo);
  for (const p of data.members) map.set(p.id, p.photo);
  return map;
}

export interface Scope {
  kind: 'season' | 'year';
  /** 화면 위 작은 머리글 (예: '시즌 6', '2026 전체') */
  label: string;
  /** 큰 제목으로 쓸 이름 */
  name: string;
  players: Player[];
  matches: Match[];
}

/** 지금 보여 줄 기본 묶음: 진행 중 시즌이 있으면 그 시즌, 없으면 경기가 있는 가장 최근 해 전체 */
export function currentScope(data: ClubData): Scope | null {
  const live = data.seasons.find((s) => s.season.status === 'live');
  if (live) {
    return {
      kind: 'season',
      label: `시즌 ${live.season.season_no}`,
      name: live.season.name,
      players: live.season.players ?? [],
      matches: live.matches,
    };
  }
  const all = countableMatches(data);
  const years = [...new Set(all.map((m) => (m.date || '').slice(0, 4)).filter((y) => /^\d{4}$/.test(y)))].sort();
  const year = years[years.length - 1];
  if (!year) return null;
  const matches = all.filter((m) => (m.date || '').startsWith(`${year}-`));
  return { kind: 'year', label: `${year} 전체`, name: `${year}년 전체 경기`, players: rankedPlayers(data, matches), matches };
}
