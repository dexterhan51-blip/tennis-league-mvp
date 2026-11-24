// 랭킹 기간: 두 달 단위(1~2월, 3~4월, …, 11~12월). 2026년 11월부터 센다.
// 그 이전 경기(시즌 1~5)는 기간 랭킹에 들어가지 않고 「통산」에만 쌓인다.

import { todayLocal } from './date';

/** 기간 랭킹을 세기 시작하는 달 'YYYY-MM' (2026-11-24 한피디 결정) */
export const PERIOD_START = '2026-11';

export interface Period {
  /** 'YYYY-MM' — 기간 첫 달 */
  key: string;
  /** 예: '2026년 11~12월' */
  label: string;
  /** 'YYYY-MM-DD' 포함 */
  from: string;
  /** 'YYYY-MM-DD' 미포함 (다음 기간 첫날) */
  to: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function periodFromYearMonth(year: number, month: number): Period {
  const first = month % 2 === 1 ? month : month - 1; // 홀수 달에서 시작
  const nextYear = first === 11 ? year + 1 : year;
  const nextMonth = first === 11 ? 1 : first + 2;
  return {
    key: `${year}-${pad(first)}`,
    label: `${year}년 ${first}~${first + 1}월`,
    from: `${year}-${pad(first)}-01`,
    to: `${nextYear}-${pad(nextMonth)}-01`,
  };
}

/** 날짜가 속한 기간. 기간을 세기 전(2026-11 이전)이거나 날짜가 이상하면 null */
export function periodOf(date: string): Period | null {
  const m = (date || '').match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const p = periodFromYearMonth(Number(m[1]), Number(m[2]));
  return p.key >= PERIOD_START ? p : null;
}

export function inPeriod(date: string, period: Period): boolean {
  return !!date && date >= period.from && date < period.to;
}

/**
 * 기간 탭 목록 (최신 먼저): 기간을 세기 시작한 때부터 오늘이 속한 기간까지.
 * 미래 날짜로 잘못 넣은 경기가 있어도 그 기간까지는 보여준다.
 */
export function listPeriods(dates: string[], today = todayLocal()): Period[] {
  const last = [today, ...dates]
    .map(periodOf)
    .filter((p): p is Period => p !== null)
    .reduce<Period | null>((a, b) => (!a || b.key > a.key ? b : a), null);
  const start = periodOf(`${PERIOD_START}-01`);
  if (!last || !start) return [];
  const out: Period[] = [];
  for (let p = start; p.key <= last.key; p = periodOf(p.to) as Period) out.push(p);
  return out.reverse();
}
