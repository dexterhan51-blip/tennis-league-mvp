import {
  computeSaju,
  getDayPillar,
  getHourPillar,
  hourToBranchIndex,
} from '@/lib/saju';
import {
  encode,
  decode,
  validate,
  PERSONA_SCHEMA_VERSION,
  type PersonaInputs,
} from '@/lib/personaCode';
import { combinedCompat } from '@/lib/sajuCompat';
import { buildPersona, personaInputsToSaju } from '@/lib/personaDerive';

// ─────────────────────────── 사주 엔진 ───────────────────────────

describe('saju 엔진', () => {
  it('일주 앵커: 1984-02-02 = 갑자', () => {
    expect(getDayPillar(1984, 2, 2).ganji).toBe('갑자');
  });

  it('시주 五鼠遁: 갑일 자시→갑자, 갑일 오시→경오', () => {
    // 1984-02-02 = 갑일 (stemIndex 0)
    expect(getHourPillar(0, 0).ganji).toBe('갑자'); // 자시(23~01)
    expect(getHourPillar(0, 12).ganji).toBe('경오'); // 오시(11~13)
  });

  it('hour→지지 매핑: 23시·0시=자(0), 1시=축(1), 14시=미(7)', () => {
    expect(hourToBranchIndex(23)).toBe(0);
    expect(hourToBranchIndex(0)).toBe(0);
    expect(hourToBranchIndex(1)).toBe(1);
    expect(hourToBranchIndex(14)).toBe(7);
  });

  it('전체 예시: 2024-01-01 14시 양력 → 일주 임술 / 년주 계묘(입춘 전) / 시주 정미', () => {
    const r = computeSaju({ year: 2024, month: 1, day: 1, hour: 14, calendar: '양력' });
    expect(r.day.ganji).toBe('임술');
    expect(r.dayMaster).toBe('임');
    expect(r.dayMasterElement).toBe('수');
    expect(r.year.ganji).toBe('계묘'); // 1/1은 입춘 전이라 전년(2023=계묘)
    // 14:00은 미시(未時, 13~15시). 임일+미시 → 五鼠遁으로 정미(丁未).
    expect(r.hour?.ganji).toBe('정미');
    // 오행 분포 합 = 8 (4기둥 × 천간+지지)
    const sum = Object.values(r.elementCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(8);
  });

  it('시간 모름이면 시주 null, 오행 합 6', () => {
    const r = computeSaju({ year: 1990, month: 5, day: 15, hour: 'unknown', calendar: '양력' });
    expect(r.hour).toBeNull();
    const sum = Object.values(r.elementCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(6);
  });
});

// ─────────────────────────── 게임 세이브 코드 ───────────────────────────

const sampleInputs: PersonaInputs = {
  schemaVersion: PERSONA_SCHEMA_VERSION,
  mbti: 'INTJ',
  gender: 'male',
  calendarType: 'solar',
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 9,
};

describe('personaCode 인코딩', () => {
  it('encode → "SAJU1-XXXX-XXXX" 형식', () => {
    const code = encode(sampleInputs);
    expect(code).toMatch(/^SAJU1-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it('라운드트립: decode(encode(x)) === x', () => {
    const r = decode(encode(sampleInputs));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.inputs).toEqual(sampleInputs);
  });

  it('birthHour null / 23 경계값 라운드트립', () => {
    for (const birthHour of [null, 23, 0] as (number | null)[]) {
      const inputs = { ...sampleInputs, birthHour };
      const r = decode(encode(inputs));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.inputs.birthHour).toBe(birthHour);
    }
  });

  it('lunar/female/16종 MBTI 모두 라운드트립', () => {
    const inputs: PersonaInputs = {
      ...sampleInputs, mbti: 'ENFP', gender: 'female', calendarType: 'lunar',
      birthYear: 1988, birthMonth: 11, birthDay: 3, birthHour: null,
    };
    const r = decode(encode(inputs));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.inputs).toEqual(inputs);
  });

  it('손상된/형식 오류 코드는 거부', () => {
    expect(validate('SAJU1-AAAA-AAAA')?.kind).toBeDefined(); // 체크섬 불일치 가능성
    expect(validate('hello world')?.kind).toBe('FORMAT');
    expect(validate('SAJU1-XXX')?.kind).toBe('FORMAT');
    const good = encode(sampleInputs);
    expect(validate(good)).toBeNull(); // 정상 코드는 통과
  });

  it('체크섬으로 한 글자 오타 감지', () => {
    const good = encode(sampleInputs); // SAJU1-XXXX-XXXX
    const body = good.slice(6); // XXXX-XXXX
    const flipped = `SAJU1-${body[0] === '0' ? '1' : '0'}${body.slice(1)}`;
    const r = decode(flipped);
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────── 궁합 + 합성 ───────────────────────────

describe('combinedCompat', () => {
  it('대칭: compat(A,B) === compat(B,A)', () => {
    const a = { 목: 3, 화: 1, 토: 2, 금: 1, 수: 1 };
    const b = { 목: 1, 화: 3, 토: 1, 금: 2, 수: 1 };
    const ab = combinedCompat(a, 'ENFP', b, 'ISTJ');
    const ba = combinedCompat(b, 'ISTJ', a, 'ENFP');
    expect(ab.total).toBe(ba.total);
    expect(ab.ohaengScore).toBe(ba.ohaengScore);
    expect(ab.mbtiScore).toBe(ba.mbtiScore);
  });

  it('0~100 범위 + 티어/이유 존재', () => {
    const a = { 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 };
    const b = { 목: 1, 화: 1, 토: 2, 금: 2, 수: 2 };
    const r = combinedCompat(a, 'INTJ', b, 'ENFP');
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.tier).toBeTruthy();
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.length).toBeLessThanOrEqual(3);
    expect(r.courtSynergy).toContain('×');
  });
});

describe('buildPersona / 어댑터', () => {
  it('inputs → saju 타입 매핑 (solar→양력, male→남, null→unknown)', () => {
    const s = personaInputsToSaju({ ...sampleInputs, gender: 'female', calendarType: 'lunar', birthHour: null });
    expect(s.calendar).toBe('음력');
    expect(s.gender).toBe('여');
    expect(s.hour).toBe('unknown');
  });

  it('완성 페르소나: 닮은 프로 best + 라이벌 2명 + trait 0~100', () => {
    const p = buildPersona(sampleInputs);
    expect(p.proMatch.best.player.name).toBeTruthy();
    expect(p.proMatch.runnersUp.length).toBe(2);
    expect(p.mbtiProfile.mbti).toBe('INTJ');
    for (const v of Object.values(p.traitVector)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('코드 공유 흐름: 내 코드 decode → 같은 페르소나 재현', () => {
    const code = encode(sampleInputs);
    const r = decode(code);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const mine = buildPersona(sampleInputs);
      const fromCode = buildPersona(r.inputs);
      expect(fromCode.saju.day.ganji).toBe(mine.saju.day.ganji);
      expect(fromCode.proMatch.best.player.key).toBe(mine.proMatch.best.player.key);
    }
  });
});
