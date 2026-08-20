// 서버 쓰기 대기열 — 코트 현장에서 네트워크가 끊겨도 입력이 유실되지 않게 한다.
// 원본은 항상 서버(seasons/league_matches)이고, 이 대기열은 잠깐의 완충재일 뿐이다.
// · 입력 즉시 UI에 반영(낙관적) → 백그라운드 전송 → 실패 시 보관 후 재시도
// · 같은 경기의 연속 수정은 마지막 상태 하나로 합쳐 전송한다

import type { Match, Player } from '@/types';
import {
  upsertLeagueMatch,
  deleteLeagueMatch,
  upsertFriendlyMatch,
  deleteFriendlyMatch,
  updateSeasonPlayers,
  renameSeason,
} from '@/lib/seasonApi';

export type WriteOp =
  | { kind: 'match-upsert'; seasonId: string; match: Match }
  | { kind: 'match-delete'; matchId: string }
  | { kind: 'friendly-upsert'; match: Match }
  | { kind: 'friendly-delete'; matchId: string }
  | { kind: 'season-players'; seasonId: string; players: Player[] }
  | { kind: 'season-rename'; seasonId: string; name: string };

const QUEUE_KEY = 'season-write-queue';
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;

let queue: WriteOp[] = [];
let loaded = false;
let flushing = false;
let retryMs = RETRY_BASE_MS;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(pending: number) => void>();

function isBrowser() {
  return typeof window !== 'undefined';
}

function load() {
  if (loaded || !isBrowser()) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) queue = JSON.parse(raw) as WriteOp[];
  } catch {
    queue = [];
  }
  if (queue.length > 0) scheduleRetry(0);
  window.addEventListener('online', () => void flush());
}

function persist() {
  if (!isBrowser()) return;
  try {
    if (queue.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[writeQueue] Failed to persist queue:', e);
  }
}

function notify() {
  for (const fn of listeners) fn(queue.length);
}

function scheduleRetry(delay = retryMs) {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void flush(), delay);
}

async function runOp(op: WriteOp): Promise<void> {
  switch (op.kind) {
    case 'match-upsert':
      return upsertLeagueMatch(op.seasonId, op.match);
    case 'match-delete':
      return deleteLeagueMatch(op.matchId);
    case 'friendly-upsert':
      return upsertFriendlyMatch(op.match);
    case 'friendly-delete':
      return deleteFriendlyMatch(op.matchId);
    case 'season-players':
      return updateSeasonPlayers(op.seasonId, op.players);
    case 'season-rename':
      return renameSeason(op.seasonId, op.name);
  }
}

/** 대기열의 앞에서부터 순서대로 전송. 실패하면 중단하고 재시도 예약. */
export async function flush(): Promise<boolean> {
  load();
  if (flushing) return queue.length === 0;
  flushing = true;
  try {
    while (queue.length > 0) {
      const op = queue[0];
      try {
        await runOp(op);
      } catch (e) {
        console.warn('[writeQueue] Op failed, will retry:', op.kind, e);
        retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
        scheduleRetry();
        return false;
      }
      queue.shift();
      persist();
      notify();
    }
    retryMs = RETRY_BASE_MS;
    return true;
  } finally {
    flushing = false;
  }
}

/** 같은 대상의 이전 작업과 합쳐서 대기열에 넣고 즉시 전송을 시도한다. */
export function enqueue(op: WriteOp): void {
  load();
  if (op.kind === 'match-upsert' || op.kind === 'friendly-upsert') {
    const idx = queue.findIndex(
      (q) => q.kind === op.kind && q.match.id === op.match.id
    );
    if (idx >= 0) queue[idx] = op;
    else queue.push(op);
  } else if (op.kind === 'match-delete' || op.kind === 'friendly-delete') {
    // 아직 전송 안 된 upsert는 지우고 delete만 남긴다
    const upsertKind = op.kind === 'match-delete' ? 'match-upsert' : 'friendly-upsert';
    queue = queue.filter(
      (q) => !(q.kind === upsertKind && q.match.id === op.matchId)
    );
    if (!queue.some((q) => q.kind === op.kind && q.matchId === op.matchId)) {
      queue.push(op);
    }
  } else {
    // season-players / season-rename: 같은 종류는 마지막 것만 유효
    const idx = queue.findIndex((q) => q.kind === op.kind);
    if (idx >= 0) queue[idx] = op;
    else queue.push(op);
  }
  persist();
  notify();
  void flush();
}

/** 남은 작업 수 구독 (UI 배지용). 반환값 호출로 해제. */
export function subscribePending(fn: (pending: number) => void): () => void {
  load();
  listeners.add(fn);
  fn(queue.length);
  return () => {
    listeners.delete(fn);
  };
}

export function pendingCount(): number {
  load();
  return queue.length;
}

/** 시즌 종료 등 반드시 서버 반영이 선행돼야 하는 작업 전에 호출 */
export async function flushOrThrow(): Promise<void> {
  const ok = await flush();
  if (!ok) {
    throw new Error('전송하지 못한 기록이 남아 있습니다. 네트워크 연결 후 다시 시도해주세요.');
  }
}
