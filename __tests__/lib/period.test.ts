import { inPeriod, listPeriods, periodOf, PERIOD_START } from '@/lib/period';

describe('period', () => {
  it('두 달 단위로 묶고 2026년 11월 전은 기간에 넣지 않는다', () => {
    expect(PERIOD_START).toBe('2026-11');
    expect(periodOf('2026-11-21')).toEqual({ key: '2026-11', label: '2026년 11~12월', from: '2026-11-01', to: '2027-01-01' });
    expect(periodOf('2026-12-31')?.key).toBe('2026-11');
    expect(periodOf('2027-02-28')).toMatchObject({ key: '2027-01', label: '2027년 1~2월', to: '2027-03-01' });
    expect(periodOf('2026-10-31')).toBeNull();
    expect(periodOf('2026-08-29')).toBeNull();
    expect(periodOf('')).toBeNull();
  });

  it('기간 안인지 경계까지 정확히 본다', () => {
    const p = periodOf('2026-11-01')!;
    expect(inPeriod('2026-11-01', p)).toBe(true);
    expect(inPeriod('2026-12-31', p)).toBe(true);
    expect(inPeriod('2027-01-01', p)).toBe(false);
    expect(inPeriod('2026-10-31', p)).toBe(false);
  });

  it('시작 기간부터 오늘 기간까지 최신 순으로 나열한다', () => {
    expect(listPeriods([], '2026-11-24').map((p) => p.key)).toEqual(['2026-11']);
    expect(listPeriods(['2026-08-01'], '2027-03-02').map((p) => p.key)).toEqual(['2027-03', '2027-01', '2026-11']);
    // 오늘보다 뒤 날짜의 경기가 있으면 그 기간까지
    expect(listPeriods(['2027-01-05'], '2026-11-24').map((p) => p.key)).toEqual(['2027-01', '2026-11']);
    // 기간을 세기 전이면 아무것도 없다
    expect(listPeriods([], '2026-10-01')).toEqual([]);
  });
});
