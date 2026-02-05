import { Match, PlayerWithRank } from '@/types';

/**
 * 경기 결과 공유용 텍스트 생성
 */
export function generateShareText(
  leagueName: string,
  matchDate: string,
  matches: Match[],
  rankings: PlayerWithRank[]
): string {
  const lines: string[] = [];

  // 헤더
  lines.push(`[러브포티 리그 - ${leagueName}]`);
  lines.push(`${matchDate} 경기 결과`);
  lines.push('');

  // 경기 결과
  const finishedMatches = matches.filter(m => m.date === matchDate && m.isFinished);

  if (finishedMatches.length > 0) {
    lines.push('=== 경기 결과 ===');
    finishedMatches.forEach((m, idx) => {
      const teamAPlayers = m.teamA.man.id === m.teamA.woman.id
        ? m.teamA.man.name
        : `${m.teamA.man.name} & ${m.teamA.woman.name}`;
      const teamBPlayers = m.teamB.man.id === m.teamB.woman.id
        ? m.teamB.man.name
        : `${m.teamB.man.name} & ${m.teamB.woman.name}`;

      const winner = m.scoreA > m.scoreB ? 'A팀 승' : (m.scoreB > m.scoreA ? 'B팀 승' : '무승부');

      lines.push(`GAME ${idx + 1}: ${teamAPlayers} vs ${teamBPlayers}`);
      lines.push(`결과: ${m.scoreA} : ${m.scoreB} (${winner})`);
      lines.push('');
    });
  } else {
    lines.push('완료된 경기가 없습니다.');
    lines.push('');
  }

  // 현재 랭킹 TOP 5
  const top5 = rankings.slice(0, 5);
  if (top5.length > 0) {
    lines.push('=== 현재 랭킹 TOP 5 ===');
    top5.forEach((r, idx) => {
      const winRatePercent = Math.round(r.winRate * 100);
      lines.push(`${idx + 1}위: ${r.name} (${r.totalPoints}점, 승률 ${winRatePercent}%)`);
    });
    lines.push('');
  }

  // 푸터
  lines.push('러브포티 리그 매니저');

  return lines.join('\n');
}

/**
 * Web Share API 지원 여부 확인
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // 폴백: textarea 사용
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * 경기 결과 공유 (Web Share API 또는 클립보드 복사)
 */
export async function shareMatchResults(
  leagueName: string,
  matchDate: string,
  matches: Match[],
  rankings: PlayerWithRank[]
): Promise<{ success: boolean; method: 'share' | 'clipboard'; error?: string }> {
  const text = generateShareText(leagueName, matchDate, matches, rankings);

  // Web Share API 사용 시도 (모바일)
  if (canShare()) {
    try {
      await navigator.share({
        title: `${leagueName} - ${matchDate} 경기 결과`,
        text: text,
      });
      return { success: true, method: 'share' };
    } catch (err: any) {
      // 사용자가 공유 취소한 경우
      if (err.name === 'AbortError') {
        return { success: false, method: 'share', error: '공유가 취소되었습니다.' };
      }
      // 다른 에러는 클립보드 폴백으로
    }
  }

  // 클립보드 복사 (데스크톱 또는 Share API 실패 시)
  const copied = await copyToClipboard(text);
  if (copied) {
    return { success: true, method: 'clipboard' };
  }

  return { success: false, method: 'clipboard', error: '공유에 실패했습니다.' };
}
