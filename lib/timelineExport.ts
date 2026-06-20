// lib/timelineExport.ts
// 그날 경기들의 포인트 타임라인을 텍스트로 내보내기 (영상 편집 참고용).
// pointLog가 있는 완료 경기만 대상으로 한다.

import type { Match, Player, PointLogEntry } from '@/types';

function teamLabel(m: Match, team: 'A' | 'B'): string {
  const t = team === 'A' ? m.teamA : m.teamB;
  return t.man.id === t.woman.id ? t.man.name : `${t.man.name} & ${t.woman.name}`;
}

function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function nameOf(players: Player[], id?: string): string | undefined {
  if (!id) return undefined;
  return players.find((p) => p.id === id)?.name;
}

/** 한 경기의 타임라인 블록 */
function matchBlock(m: Match, idx: number, players: Player[]): string {
  const lines: string[] = [];
  const a = teamLabel(m, 'A');
  const b = teamLabel(m, 'B');
  const ruleLabel = m.scoringRule === 'deuce' ? '듀스' : '노애드';
  const winner = m.scoreA > m.scoreB ? 'A팀 승' : m.scoreB > m.scoreA ? 'B팀 승' : '무승부';

  lines.push(`GAME ${idx + 1}: ${a} vs ${b}`);
  lines.push(`최종 ${m.scoreA} : ${m.scoreB} 게임 (${winner}, ${ruleLabel})`);

  if (m.serveOrder && m.serveOrder.length > 0) {
    const order = m.serveOrder.map((id) => nameOf(players, id) ?? '?').join(' → ');
    lines.push(`서브 순서: ${order}`);
  }

  if (m.videoUrl) lines.push(`영상: ${m.videoUrl}`);

  if (m.pointLog && m.pointLog.length > 0) {
    lines.push('--- 포인트 타임라인 ---');
    m.pointLog.forEach((pt: PointLogEntry) => {
      const who = pt.winner === 'A' ? a : b;
      const server = nameOf(players, pt.serverId);
      const serverTag = server ? ` [서브 ${server}]` : '';
      if (pt.gameWon) {
        const gw = pt.gameWon === 'A' ? a : b;
        lines.push(
          `${mmss(pt.t)}  ★ ${gw} 게임 획득! (포인트 ${pt.pointA}:${pt.pointB}) → 게임 ${pt.gameA}:${pt.gameB}${serverTag}`,
        );
      } else {
        lines.push(`${mmss(pt.t)}  ● ${who} 득점  포인트 ${pt.pointA}:${pt.pointB}${serverTag}`);
      }
    });
  }

  return lines.join('\n');
}

/**
 * 특정 날짜의, pointLog가 있는 완료 경기들의 타임라인 텍스트.
 * 대상 경기가 없으면 빈 문자열.
 */
export function generateTimelineText(
  leagueName: string,
  matchDate: string,
  matches: Match[],
  players: Player[],
): string {
  const target = matches.filter(
    (m) => m.date === matchDate && m.isFinished && m.pointLog && m.pointLog.length > 0,
  );
  if (target.length === 0) return '';

  const out: string[] = [];
  out.push(`[러브포티 테니스 - ${leagueName}]`);
  out.push(`${matchDate} 경기 타임라인 (영상 편집용)`);
  out.push('');
  target.forEach((m, i) => {
    out.push(matchBlock(m, i, players));
    out.push('');
  });
  out.push('러브포티 테니스 리그 매니저');
  return out.join('\n');
}

/** 해당 날짜에 내보낼 타임라인(완료 + pointLog)이 있는지 */
export function hasTimelineData(matchDate: string, matches: Match[]): boolean {
  return matches.some(
    (m) => m.date === matchDate && m.isFinished && m.pointLog && m.pointLog.length > 0,
  );
}
