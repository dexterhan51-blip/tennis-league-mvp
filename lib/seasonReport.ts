// lib/seasonReport.ts
// 아카이브된 시즌의 전적을 텍스트 리포트로 내보내기.
// 최종 순위 + 선수별 파트너 케미/상대 전적을 전수 집계한다.
// 캐릭터 카드(lib/playerCharacters.ts) 갱신 등 시즌 분석의 원본 데이터로 쓴다.

import type { Match, SeasonArchive, Team } from '@/types';

interface HeadToHead {
  wins: number;
  losses: number;
  draws: number;
}

function teamMemberIds(team: Team): string[] {
  return team.man.id === team.woman.id ? [team.man.id] : [team.man.id, team.woman.id];
}

function bump(map: Map<string, HeadToHead>, key: string, result: 'win' | 'loss' | 'draw') {
  const rec = map.get(key) ?? { wins: 0, losses: 0, draws: 0 };
  if (result === 'win') rec.wins++;
  else if (result === 'loss') rec.losses++;
  else rec.draws++;
  map.set(key, rec);
}

/** 이름 마지막 글자의 받침 유무에 따라 '와'/'과'를 붙인다 (한글 외 문자는 '와') */
function withParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasBatchim = isHangul && (last - 0xac00) % 28 > 0;
  return `${name}${hasBatchim ? '과' : '와'}`;
}

function recordLabel(rec: HeadToHead): string {
  return `${rec.wins}승${rec.draws > 0 ? ` ${rec.draws}무` : ''} ${rec.losses}패`;
}

function totalGames(rec: HeadToHead): number {
  return rec.wins + rec.losses + rec.draws;
}

/** 경기 수 많은 순 → 승수 많은 순으로 정렬한 [상대id, 전적] 목록 */
function sortedEntries(map: Map<string, HeadToHead>): [string, HeadToHead][] {
  return [...map.entries()].sort(
    (a, b) => totalGames(b[1]) - totalGames(a[1]) || b[1].wins - a[1].wins
  );
}

export function generateSeasonReportText(archive: SeasonArchive): string {
  const nameOf = new Map<string, string>();
  archive.players.forEach(p => nameOf.set(p.id, p.name));
  archive.finalRankings.forEach(r => nameOf.set(r.playerId, r.name));

  // 정규 완료 경기만 집계 (이벤트 경기 제외)
  const regularMatches = archive.matches.filter(m => m.isFinished && !m.isExhibition);

  // 선수별 파트너/상대 전적 집계
  const partnerRecords = new Map<string, Map<string, HeadToHead>>();
  const opponentRecords = new Map<string, Map<string, HeadToHead>>();

  const collect = (m: Match, myTeam: Team, otherTeam: Team, result: 'win' | 'loss' | 'draw') => {
    const myIds = teamMemberIds(myTeam);
    const oppIds = teamMemberIds(otherTeam);
    for (const id of myIds) {
      if (!partnerRecords.has(id)) partnerRecords.set(id, new Map());
      if (!opponentRecords.has(id)) opponentRecords.set(id, new Map());
      const partner = myIds.find(other => other !== id);
      if (partner) bump(partnerRecords.get(id)!, partner, result);
      for (const opp of oppIds) bump(opponentRecords.get(id)!, opp, result);
    }
  };

  for (const m of regularMatches) {
    const resultA: 'win' | 'loss' | 'draw' =
      m.scoreA > m.scoreB ? 'win' : m.scoreA < m.scoreB ? 'loss' : 'draw';
    const resultB: 'win' | 'loss' | 'draw' =
      resultA === 'win' ? 'loss' : resultA === 'loss' ? 'win' : 'draw';
    collect(m, m.teamA, m.teamB, resultA);
    collect(m, m.teamB, m.teamA, resultB);
  }

  const lines: string[] = [];

  // 시즌 개요
  lines.push(`[시즌 리포트] ${archive.leagueName}`);
  lines.push(`기간: ${archive.seasonStart} ~ ${archive.seasonEnd} (${archive.totalMatchDays}경기일 · 정규 ${archive.totalMatches}경기)`);
  const champion = archive.championPlayerId ? nameOf.get(archive.championPlayerId) : undefined;
  if (champion) lines.push(`우승: ${champion}`);
  lines.push('');

  // 최종 순위
  lines.push('=== 최종 순위 ===');
  archive.finalRankings.forEach((r, idx) => {
    const winRatePercent = Math.round(r.winRate * 100);
    const mvpLabel = (r.mvpCount ?? 0) > 0 ? ` | MVP ${r.mvpCount}회` : '';
    lines.push(
      `${idx + 1}위 ${r.name} | ${r.wins}승${r.draws > 0 ? ` ${r.draws}무` : ''} ${r.losses}패 | ${r.totalPoints}점 | 승률 ${winRatePercent}%${mvpLabel}`
    );
  });
  lines.push('');

  // 선수별 상세 (최종 순위 순)
  lines.push('=== 선수별 상세 ===');
  for (const r of archive.finalRankings) {
    lines.push(`[${r.name}]`);

    const partners = sortedEntries(partnerRecords.get(r.playerId) ?? new Map());
    if (partners.length > 0) {
      const parts = partners.map(
        ([id, rec]) => `${withParticle(nameOf.get(id) ?? '?')} ${recordLabel(rec)}`
      );
      lines.push(`- 파트너별: ${parts.join(', ')}`);
    }

    const opponents = sortedEntries(opponentRecords.get(r.playerId) ?? new Map());
    if (opponents.length > 0) {
      const parts = opponents.map(
        ([id, rec]) => `${nameOf.get(id) ?? '?'} 상대 ${recordLabel(rec)}`
      );
      lines.push(`- 상대 전적: ${parts.join(', ')}`);
    }

    lines.push('');
  }

  lines.push('러브포티 테니스 리그 매니저');

  return lines.join('\n');
}
