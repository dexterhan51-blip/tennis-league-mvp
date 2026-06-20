// lib/liveScoring.ts
// 실시간 점수(한 게임) 채점 엔진. 순수 함수, 결정론적.
// 규칙: 노애드(no-ad) = winPoints 먼저 도달하면 승 (40-40에서 다음 득점 팀 승, 골든포인트).
//       듀스(deuce)   = winPoints 이상 + 2점차로 승.
// 점수는 raw 정수(0,1,2,3,4...)로 보관하고, 표시(0/15/30/40/AD)는 별도 변환.

import type { ScoringRule } from '@/types';

export type { ScoringRule };

export interface ScoringConfig {
  rule: ScoringRule;
  winPoints: number; // 한 게임 목표 점수 (기본 4 = "4점까지")
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = { rule: 'no-ad', winPoints: 4 };

export interface GamePoints {
  a: number;
  b: number;
}

/** 승자 판정. 아직 끝나지 않았으면 null. */
export function gameWinner(p: GamePoints, cfg: ScoringConfig): 'A' | 'B' | null {
  const { a, b } = p;
  const max = Math.max(a, b);
  if (a === b) return null;
  if (cfg.rule === 'no-ad') {
    // winPoints에 먼저 도달하면 승 (3-3 이후 4-3도 승)
    return max >= cfg.winPoints ? (a > b ? 'A' : 'B') : null;
  }
  // deuce: winPoints 이상 + 2점차
  if (max >= cfg.winPoints && Math.abs(a - b) >= 2) return a > b ? 'A' : 'B';
  return null;
}

export function isGameOver(p: GamePoints, cfg: ScoringConfig): boolean {
  return gameWinner(p, cfg) !== null;
}

/** 듀스 모드에서 듀스(동점, threshold 이상) 상태인가 */
export function isDeuce(p: GamePoints, cfg: ScoringConfig): boolean {
  if (cfg.rule !== 'deuce') return false;
  const t = cfg.winPoints - 1;
  return p.a >= t && p.b >= t && p.a === p.b;
}

/** 노애드 모드에서 골든포인트(40-40, 다음 득점이 승부) 상태인가 */
export function isGoldenPoint(p: GamePoints, cfg: ScoringConfig): boolean {
  if (cfg.rule !== 'no-ad') return false;
  const t = cfg.winPoints - 1;
  return p.a === t && p.b === t;
}

/** 한 포인트 추가 (게임 종료 후엔 무시). */
export function addPoint(p: GamePoints, team: 'A' | 'B', cfg: ScoringConfig): GamePoints {
  if (isGameOver(p, cfg)) return p;
  return team === 'A' ? { a: p.a + 1, b: p.b } : { a: p.a, b: p.b + 1 };
}

const TENNIS_LADDER = ['0', '15', '30', '40'];

/**
 * 한 팀의 표시 점수.
 * 표준 4점 게임(winPoints=4)은 테니스 표기(0/15/30/40, 듀스 모드 우위 시 AD).
 * 그 외 목표 점수는 raw 정수로 표시.
 */
export function displayPoint(mine: number, theirs: number, cfg: ScoringConfig): string {
  if (cfg.winPoints === 4) {
    const t = 3; // 40
    if (cfg.rule === 'deuce' && mine >= t && theirs >= t) {
      if (mine === theirs) return '40';        // 듀스
      return mine > theirs ? 'AD' : '40';      // 우위 / 상대 우위
    }
    return TENNIS_LADDER[Math.min(mine, 3)];
  }
  // 비표준 목표 점수: 듀스 우위만 AD로, 나머지는 raw
  if (cfg.rule === 'deuce') {
    const t = cfg.winPoints - 1;
    if (mine >= t && theirs >= t && mine > theirs) return 'AD';
  }
  return String(mine);
}

/** 양 팀 표시 점수 한 번에 */
export function displayScore(p: GamePoints, cfg: ScoringConfig): { a: string; b: string } {
  return {
    a: displayPoint(p.a, p.b, cfg),
    b: displayPoint(p.b, p.a, cfg),
  };
}
