/** 이 기기 시간대 기준 오늘 날짜 'YYYY-MM-DD' (toISOString 은 UTC 라 한국 아침에는 어제가 나온다) */
export function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** '2026-10-04' → '10.4' */
export function shortDate(date: string): string {
  const [, m, d] = (date || '').split('-');
  return m && d ? `${Number(m)}.${Number(d)}` : date;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-10-04' → '10월 4일 (일)' */
export function longDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}
