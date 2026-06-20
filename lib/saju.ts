// lib/saju.ts
// Self-contained Korean Saju (사주팔자 / Four Pillars) calculator.
// Zero dependencies, zero network. Day & hour pillars exact; year/month
// solar-term boundaries are ±1 day approximations (entertainment app).

// ─────────────────────────────────────────────────────────────────────────
// LOOKUP TABLES
// ─────────────────────────────────────────────────────────────────────────

/** 천간 (10 Heavenly Stems) — index 0..9 */
export const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
//                              甲    乙    丙    丁    戊    己    庚    辛    壬    癸

/** 지지 (12 Earthly Branches) — index 0..11, starting at 자 */
export const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
//                                子    丑    寅    卯    辰    巳    午    未    申    酉    戌    亥

/** 오행 (Five Elements) */
export type Element = '목' | '화' | '토' | '금' | '수'; // 木 火 土 金 水

/** 천간 → 오행. 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수 */
export const STEM_ELEMENT: Element[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];

/** 지지 → 오행. 인묘=목, 사오=화, 진술축미=토, 신유=금, 해자=수 */
export const BRANCH_ELEMENT: Element[] = [
  // 자    축    인    묘    진    사    오    미    신    유    술    해
  '수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수',
];

/**
 * 五鼠遁 (five-rats) table: day-stem index → 천간 index of the 자시(子) hour.
 * 甲己日→甲子시 / 乙庚日→丙子 / 丙辛日→戊子 / 丁壬日→庚子 / 戊癸日→壬子.
 * Then each later hour-branch increments the stem by 1 (mod 10).
 */
export const HOUR_STEM_START: number[] = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
//   dayStem:                            갑  을  병  정  무  기  경  신  임  계
//   자시 stem:                          甲  丙  戊  庚  壬  甲  丙  戊  庚  壬

/**
 * 五虎遁 (five-tigers) table: year-stem index → 천간 index of the 인월(寅, 첫 달) stem.
 * 甲己年→丙寅월 / 乙庚→戊寅 / 丙辛→庚寅 / 丁壬→壬寅 / 戊癸→甲寅.
 * Month order in saju starts at 인(寅) = 1st month (입춘~경칩), branch index fixed.
 */
export const MONTH_STEM_START: number[] = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
//   yearStem:                            갑  을  병  정  무  기  경  신  임  계
//   인월 stem:                           丙  戊  庚  壬  甲  丙  戊  庚  壬  甲

/**
 * 절기 month-boundary approximate Gregorian dates (±1 day; entertainment-grade).
 * Each entry = the solar term that STARTS a saju-month and its earthly-branch index.
 * The saju year/month begins at 입춘 (인월). `from` = [month, day] the period begins.
 * A birthdate falls in the LAST period whose `from` is <= the date.
 */
export const SOLAR_TERM_MONTHS: { term: string; from: [number, number]; branch: number }[] = [
  { term: '입춘', from: [2, 4],  branch: 2 },  // 寅 인월 (1월: 호랑이)
  { term: '경칩', from: [3, 6],  branch: 3 },  // 卯 묘월 (2월)
  { term: '청명', from: [4, 5],  branch: 4 },  // 辰 진월 (3월)
  { term: '입하', from: [5, 6],  branch: 5 },  // 巳 사월 (4월)
  { term: '망종', from: [6, 6],  branch: 6 },  // 午 오월 (5월)
  { term: '소서', from: [7, 7],  branch: 7 },  // 未 미월 (6월)
  { term: '입추', from: [8, 8],  branch: 8 },  // 申 신월 (7월)
  { term: '백로', from: [9, 8],  branch: 9 },  // 酉 유월 (8월)
  { term: '한로', from: [10, 8], branch: 10 }, // 戌 술월 (9월)
  { term: '입동', from: [11, 7], branch: 11 }, // 亥 해월 (10월)
  { term: '대설', from: [12, 7], branch: 0 },  // 子 자월 (11월)
  { term: '소한', from: [1, 6],  branch: 1 },  // 丑 축월 (12월) — belongs to PREVIOUS saju-year
];

// ─────────────────────────────────────────────────────────────────────────
// CORE: Julian Day Number (integer, Fliegel–Van Flandern)
// ─────────────────────────────────────────────────────────────────────────

/** Gregorian (proleptic) calendar date → Julian Day Number. Pure integer math. */
export function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

export type CalendarType = '양력' | '음력';
export type Gender = '남' | '여';

export interface Pillar {
  stem: string;        // 천간
  branch: string;      // 지지
  stemIndex: number;   // 0..9
  branchIndex: number; // 0..11
  ganji: string;       // e.g. "갑자"
}

export interface SajuResult {
  year: Pillar;   // 년주
  month: Pillar;  // 월주
  day: Pillar;    // 일주
  hour: Pillar | null; // 시주 (null when hour === 'unknown')
  dayMaster: string;   // 일간 (= day.stem)
  dayMasterElement: Element;
  elementCounts: Record<Element, number>; // 오행 분포
  notes: string[];     // disclaimers (음력 등)
}

// ─────────────────────────────────────────────────────────────────────────
// PILLAR BUILDERS
// ─────────────────────────────────────────────────────────────────────────

function makePillar(stemIndex: number, branchIndex: number): Pillar {
  const s = ((stemIndex % 10) + 10) % 10;
  const b = ((branchIndex % 12) + 12) % 12;
  return {
    stem: HEAVENLY_STEMS[s],
    branch: EARTHLY_BRANCHES[b],
    stemIndex: s,
    branchIndex: b,
    ganji: HEAVENLY_STEMS[s] + EARTHLY_BRANCHES[b],
  };
}

/** 일주 — EXACT. stem=(JDN+7)%10, branch=(JDN+11)%12. Anchor: 1984-02-02 = 갑자. */
export function getDayPillar(year: number, month: number, day: number): Pillar {
  const jdn = gregorianToJDN(year, month, day);
  return makePillar((jdn + 7) % 10, (jdn + 11) % 12);
}

/** hour (0..23) → 지지 branch index. 자시 = 23:00–00:59 (=0), 축시 = 01:00–02:59 (=1)... */
export function hourToBranchIndex(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

/** 시주 — EXACT (五鼠遁). dayStemIndex from the day pillar, plus hour. */
export function getHourPillar(dayStemIndex: number, hour: number): Pillar {
  const branchIndex = hourToBranchIndex(hour);
  const stemIndex = HOUR_STEM_START[dayStemIndex] + branchIndex;
  return makePillar(stemIndex, branchIndex);
}

/** Which saju-year does this Gregorian date belong to? Rolls over at 입춘 (~Feb 4). */
export function getSajuYear(year: number, month: number, day: number): number {
  // Before 입춘 (~Feb 4) → previous saju year.
  if (month < 2 || (month === 2 && day < 4)) return year - 1;
  return year;
}

/** 년주 — ±1 day at 입춘. 1984 = 갑자. stem=(y-4)%10, branch=(y-4)%12. */
export function getYearPillar(sajuYear: number): Pillar {
  return makePillar(sajuYear - 4, sajuYear - 4);
}

/**
 * 월주 — ±1 day at 절기 boundaries.
 * Find the saju-month (branch) by fixed solar-term dates, then derive 月干 via 五虎遁.
 */
export function getMonthPillar(year: number, month: number, day: number, yearStemIndex: number): Pillar {
  // Determine month-branch by scanning the fixed 절기 table.
  // Compare by (month, day); 소한(1월) belongs to the prior saju-year but its branch (축) is still valid.
  let branch = 1; // default 축 (소한 period, Jan before 입춘)
  // Build a comparable ordering starting at 입춘. We pick the term whose [m,d] is the
  // latest one <= the birth date within the saju-year cycle.
  const md = month * 100 + day;
  // Order terms by calendar within a year and find the active one.
  // Terms in calendar order (Jan→Dec):
  const calOrder = [...SOLAR_TERM_MONTHS].sort(
    (a, b) => a.from[0] * 100 + a.from[1] - (b.from[0] * 100 + b.from[1]),
  );
  for (const t of calOrder) {
    if (md >= t.from[0] * 100 + t.from[1]) branch = t.branch;
  }
  // If date is before the earliest term in the year (i.e. before 소한 Jan 6), it's still 축(12월) of prior year.
  if (md < calOrder[0].from[0] * 100 + calOrder[0].from[1]) branch = 1;

  // 月干 via 五虎遁: 인월(branch 2) stem = MONTH_STEM_START[yearStem]; increment per month from 인.
  // monthOrdinal: 인=0, 묘=1, ... (number of months past 인)
  const monthOrdinal = (branch - 2 + 12) % 12;
  const stemIndex = MONTH_STEM_START[yearStemIndex] + monthOrdinal;
  return makePillar(stemIndex, branch);
}

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────

export interface SajuInput {
  year: number;
  month: number;       // 1..12
  day: number;         // 1..31
  hour: number | 'unknown'; // 0..23 or 'unknown'
  calendar: CalendarType;   // '양력' | '음력'
  gender?: Gender;
}

export function computeSaju(input: SajuInput): SajuResult {
  const { year, month, day, hour, calendar } = input;
  const notes: string[] = [];

  if (calendar === '음력') {
    notes.push(
      '음력 입력은 정밀 변환 없이 근사 계산됩니다. 정확한 음력 변환은 외부 만세력을 참고하세요.',
    );
  }

  // Day pillar (EXACT)
  const dayP = getDayPillar(year, month, day);

  // Year pillar (입춘 boundary)
  const sajuYear = getSajuYear(year, month, day);
  const yearP = getYearPillar(sajuYear);

  // Month pillar (절기 boundary approximation)
  const monthP = getMonthPillar(year, month, day, yearP.stemIndex);

  // Hour pillar (EXACT, 五鼠遁). 야자시/조자시 convention: see notes below.
  let hourP: Pillar | null = null;
  if (hour !== 'unknown') {
    hourP = getHourPillar(dayP.stemIndex, hour);
    if (hour === 23) {
      notes.push(
        '23:00–23:59는 야자시(夜子時)로 보아 당일 일주를 사용했습니다(자정 넘김 미적용 — 단순 관습).',
      );
    }
  }

  // 오행 distribution across all available pillars
  const elementCounts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const pillars: (Pillar | null)[] = [yearP, monthP, dayP, hourP];
  for (const p of pillars) {
    if (!p) continue;
    elementCounts[STEM_ELEMENT[p.stemIndex]]++;
    elementCounts[BRANCH_ELEMENT[p.branchIndex]]++;
  }

  return {
    year: yearP,
    month: monthP,
    day: dayP,
    hour: hourP,
    dayMaster: dayP.stem,
    dayMasterElement: STEM_ELEMENT[dayP.stemIndex],
    elementCounts,
    notes,
  };
}
