// pull(서버 데이터로 로컬 교체) 시 이 기기에만 있는 경기가 조용히 사라지지 않도록,
// 서버 데이터를 기준으로 로컬 전용 경기(id 기준)와 그 경기에 출전한 비게스트
// 선수를 보존해 합치는 병합 로직.

import { Player, Match } from '@/types';
import { isGuestPlayer } from './tennisLogic';

export interface LeagueSnapshot {
  players: Player[];
  matches: Match[];
}

export interface MergeResult extends LeagueSnapshot {
  /** 서버에 없어서 보존 대상이 된 로컬 경기 수 */
  localOnlyMatchCount: number;
}

function matchPlayerIds(m: Match): string[] {
  const ids: string[] = [];
  [m.teamA, m.teamB].forEach((team) => {
    if (team?.man?.id) ids.push(team.man.id);
    if (team?.woman?.id) ids.push(team.woman.id);
  });
  return ids;
}

export function mergeLocalOnlyIntoServer(
  server: LeagueSnapshot,
  local: LeagueSnapshot
): MergeResult {
  const serverMatchIds = new Set(server.matches.map((m) => m.id));
  const localOnly = local.matches.filter((m) => !serverMatchIds.has(m.id));
  if (localOnly.length === 0) {
    return { players: server.players, matches: server.matches, localOnlyMatchCount: 0 };
  }

  // 날짜 기준 안정 정렬 — 같은 날짜 안에서는 기존(경기 생성) 순서 유지
  const matches = [...server.matches, ...localOnly].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '')
  );

  // 보존한 경기에 출전한 선수 중 서버 로스터에 없는 비게스트 선수도 함께 보존
  const rosterIds = new Set(server.players.map((p) => p.id));
  const neededIds = new Set(localOnly.flatMap(matchPlayerIds));
  const extraPlayers = local.players.filter(
    (p) => neededIds.has(p.id) && !rosterIds.has(p.id) && !isGuestPlayer(p.id)
  );

  return {
    players: [...server.players, ...extraPlayers],
    matches,
    localOnlyMatchCount: localOnly.length,
  };
}
