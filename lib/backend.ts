// 앱이 서버(/api/league)와 이야기하는 가장 아래 계층.
// · 읽기는 누구나, 쓰기는 운영진 코드가 있어야 한다 (코드는 이 기기에만 저장)
// · NEXT_PUBLIC_DEMO=1 로 띄우면 서버 없이 예시 데이터만 보여준다 (화면 확인용 로컬 개발)

const ADMIN_CODE_KEY = 'lf-admin-code';

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO === '1';
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAdminCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ADMIN_CODE_KEY);
  } catch {
    return null;
  }
}

export function setAdminCode(code: string | null): void {
  try {
    if (code) localStorage.setItem(ADMIN_CODE_KEY, code);
    else localStorage.removeItem(ADMIN_CODE_KEY);
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 이번 접속 동안만 유지되지 않는다
  }
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new ApiError(body?.error ?? '서버 요청에 실패했습니다.', res.status);
  return body;
}

/** 읽기 요청 */
export async function apiGet<T>(view: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ view, ...params });
  return parse<T>(await fetch(`/api/league?${query}`, { cache: 'no-store' }));
}

/** 운영진 쓰기 요청. code 를 넘기면 저장된 코드 대신 그 값으로 보낸다 (코드 확인용) */
export async function apiPost<T = { ok: true }>(body: { op: string } & Record<string, unknown>, code?: string): Promise<T> {
  const adminCode = code ?? getAdminCode();
  if (!adminCode) throw new ApiError('운영진 코드가 필요합니다.', 401);
  return parse<T>(
    await fetch('/api/league', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-code': adminCode },
      body: JSON.stringify(body),
    })
  );
}
