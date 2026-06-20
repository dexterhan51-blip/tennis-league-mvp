import { encode, PERSONA_SCHEMA_VERSION, type PersonaInputs } from '@/lib/personaCode';
import {
  parseRosterText,
  mergeRoster,
  buildRosterPersonas,
  computeCompatMatrix,
} from '@/lib/personaRoster';

function mkInputs(over: Partial<PersonaInputs>): PersonaInputs {
  return {
    schemaVersion: PERSONA_SCHEMA_VERSION,
    mbti: 'INTJ',
    gender: 'male',
    calendarType: 'solar',
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 9,
    ...over,
  };
}

describe('parseRosterText', () => {
  it('이름 - 코드 형식 파싱 (구분자 다양)', () => {
    const codeA = encode(mkInputs({ mbti: 'ENFP' }));
    const codeB = encode(mkInputs({ mbti: 'ISTJ', birthYear: 1988 }));
    const text = `지윤 - ${codeA}\n빛나 : ${codeB}\n\n빈 줄 무시`;
    const r = parseRosterText(text);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ name: '지윤', code: codeA });
    expect(r[1]).toEqual({ name: '빛나', code: codeB });
  });

  it('코드 없는 줄은 무시, 공백 구분도 허용', () => {
    const code = encode(mkInputs({}));
    const r = parseRosterText(`정민 ${code}\n그냥 텍스트`);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('정민');
  });
});

describe('mergeRoster', () => {
  it('같은 이름은 덮어쓰기', () => {
    const merged = mergeRoster(
      [{ name: '지윤', code: 'OLD' }],
      [{ name: '지윤', code: 'NEW' }, { name: '빛나', code: 'B' }],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((e) => e.name === '지윤')?.code).toBe('NEW');
  });
});

describe('buildRosterPersonas + computeCompatMatrix', () => {
  const roster = [
    { name: 'A', code: encode(mkInputs({ mbti: 'ENFP', birthYear: 1995 })) },
    { name: 'B', code: encode(mkInputs({ mbti: 'ISTJ', birthYear: 1988, birthMonth: 11 })) },
    { name: 'C', code: encode(mkInputs({ mbti: 'INFJ', birthYear: 1992, birthMonth: 3 })) },
  ];

  it('유효 코드는 페르소나 빌드, 잘못된 코드는 ok:false', () => {
    const withBad = [...roster, { name: 'X', code: 'SAJU1-AAAA-AAAA' }];
    const personas = buildRosterPersonas(withBad);
    expect(personas.filter((p) => p.ok)).toHaveLength(3);
    const bad = personas.find((p) => p.name === 'X');
    expect(bad?.ok).toBe(false);
    expect(bad?.error).toBeTruthy();
  });

  it('매트릭스는 nC2 쌍, 점수 0~100', () => {
    const valid = buildRosterPersonas(roster).filter((p) => p.ok);
    const edges = computeCompatMatrix(valid);
    expect(edges).toHaveLength(3); // 3C2
    for (const e of edges) {
      expect(e.total).toBeGreaterThanOrEqual(0);
      expect(e.total).toBeLessThanOrEqual(100);
      expect(e.total).toBe(e.breakdown.total);
    }
  });
});
