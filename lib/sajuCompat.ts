// lib/sajuCompat.ts
// 오행 × MBTI 궁합 엔진. 순수 함수, 결정론적(deterministic), 대칭(symmetric).

/** 오행 5원소 고정 순서. 모든 분포 배열/인덱싱은 이 순서를 따른다. */
export const ELEMENTS = ['목', '화', '토', '금', '수'] as const;
export type Element = (typeof ELEMENTS)[number]; // 목木 화火 토土 금金 수水

/** 사주에서 추출한 오행 개수 분포(보통 8글자 → 합 8 근처지만 합은 자유). */
export type OhaengDist = Record<Element, number>;

/** MBTI 4축. 각 글자는 두 극(pole) 중 하나. */
export type MBTI = string; // 'ENFP' 등 4글자. 검증은 parseMBTI에서.

export interface CompatBreakdown {
  ohaengScore: number;   // 0..100
  mbtiScore: number;     // 0..100
  total: number;         // 0..100 (가중 결합)
  tier: Tier;
  reasons: string[];     // 2~3개 한글 불릿 (오행+MBTI 모두 언급)
  courtSynergy: string;  // "코트 위 시너지" 한 줄
}

export type Tier =
  | '천생연분'    // 92-100
  | '찰떡궁합'    // 80-91
  | '좋은짝'      // 68-79
  | '무난'        // 52-67
  | '도전적'      // 38-51
  | '상극주의';   // 0-37

// ── 1a. 사이클을 "다음 원소" 맵으로 표현 (방향성 있는 링) ──────────────
// 상생(generating): 목→화→토→금→수→목  (A가 B를 生함 = A는 B의 모친)
const SAENG_NEXT: Record<Element, Element> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
};
// 상극(overcoming): 목→토→수→화→금→목  (A가 B를 克함)
const GEUK_NEXT: Record<Element, Element> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

/** a가 b를 生하는가 (상생 방향). */
function generates(a: Element, b: Element): boolean { return SAENG_NEXT[a] === b; }
/** a가 b를 克하는가 (상극 방향). */
function overcomes(a: Element, b: Element): boolean { return GEUK_NEXT[a] === b; }

/**
 * 두 원소 간 관계 점수 (방향 무시, 대칭화).
 * 상생 관계(어느 방향이든)면 +, 상극 관계면 -, 같으면 약한 + (동기),
 * 무관계면 0.
 */
const PAIR_W = {
  saeng: +1.0,   // 상생: 서로 북돋움
  same:  +0.35,  // 동일 원소: 통하지만 과잉 위험(아래 균형항에서 상쇄)
  none:  0.0,    // 무관계: 중립
  geuk:  -1.0,   // 상극: 마찰
} as const;

function elementRelation(a: Element, b: Element): number {
  if (a === b) return PAIR_W.same;
  if (generates(a, b) || generates(b, a)) return PAIR_W.saeng;
  if (overcomes(a, b) || overcomes(b, a)) return PAIR_W.geuk;
  return PAIR_W.none;
}

// ── 1b. 분포 → 정규화(비율) 유틸 ──────────────────────────────────────
function totalCount(d: OhaengDist): number {
  return ELEMENTS.reduce((s, e) => s + Math.max(0, d[e] ?? 0), 0);
}
/** 합이 0이면 균등분포로 폴백(빈 사주 방어). 합=1로 정규화. */
function normalize(d: OhaengDist): Record<Element, number> {
  const t = totalCount(d);
  if (t === 0) return Object.fromEntries(ELEMENTS.map(e => [e, 1 / 5])) as Record<Element, number>;
  return Object.fromEntries(ELEMENTS.map(e => [e, Math.max(0, d[e] ?? 0) / t])) as Record<Element, number>;
}

/** 한 사람의 오행이 얼마나 고른지: 1=완전균형, 0=한 원소 몰빵. */
function balanceOf(d: OhaengDist): number {
  const p = normalize(d);
  // 균등분포(0.2씩)로부터의 L1 거리. max 거리 = 1.6 → 0..1로 반전 정규화.
  const l1 = ELEMENTS.reduce((s, e) => s + Math.abs(p[e] - 0.2), 0);
  return 1 - l1 / 1.6;
}

// ── 1c. 페어 오행 점수 (0..100) ───────────────────────────────────────
/**
 * 세 가지 신호를 합성:
 *  (R) 관계항: 두 분포의 원소들을 비율 가중으로 교차해 상생/상극 합산.
 *      reward 상생, penalize 상극.  Σ_i Σ_j pA[i]*pB[j]*relation(i,j)
 *  (B) 균형항: 두 사람의 오행 균형 평균 (한쪽이라도 몰빵이면 감점).
 *  (C) 보완항(상보): 한쪽이 약한 원소를 다른 쪽이 메우면 가점.
 *      penalize "둘 다 같은 원소 과잉"(excess) → 상보가 낮아짐.
 * 모든 항은 (A,B) 교환에 대칭.
 */
export function ohaengPairScore(a: OhaengDist, b: OhaengDist): number {
  const pA = normalize(a);
  const pB = normalize(b);

  // (R) 관계항: -1..+1 범위 (가중평균이므로 relation의 min/max에 갇힘)
  let R = 0;
  for (const i of ELEMENTS)
    for (const j of ELEMENTS)
      R += pA[i] * pB[j] * elementRelation(i, j);
  // R: 대칭 (i,j ↔ j,i 와 pA↔pB swap 모두 동일 합)

  // (B) 균형항: 0..1
  const B = (balanceOf(a) + balanceOf(b)) / 2;

  // (C) 상보항: 합쳐서 균등에 가까워질수록 ↑ → 부족분을 서로 메움.
  //     동시에 "같은 원소 과잉"은 합 분포를 한쪽으로 쏠리게 해 자동 감점됨.
  const merged = Object.fromEntries(
    ELEMENTS.map(e => [e, (pA[e] + pB[e]) / 2]),
  ) as Record<Element, number>;
  const C = 1 - ELEMENTS.reduce((s, e) => s + Math.abs(merged[e] - 0.2), 0) / 1.6;

  // ── 합성 가중치 (합 1.0) ──
  // 관계항을 0..1로 매핑: (R+1)/2
  const Rn = (R + 1) / 2;
  const raw = 0.55 * Rn + 0.20 * B + 0.25 * C; // 0..1

  // 살짝 S커브로 가운데를 넓혀 변별력↑ (결정론적)
  const score = 100 * smoothstep(raw);
  return clamp(Math.round(score), 0, 100);
}

// 보조
function clamp(x: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, x)); }
function smoothstep(t: number) { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); }

// ── 2a. 축 파싱 ───────────────────────────────────────────────────────
type Axis = 'EI' | 'SN' | 'TF' | 'JP';
const POLES: Record<Axis, [string, string]> = {
  EI: ['E', 'I'], SN: ['S', 'N'], TF: ['T', 'F'], JP: ['J', 'P'],
};
const AXIS_INDEX: Record<Axis, number> = { EI: 0, SN: 1, TF: 2, JP: 3 };

export function parseMBTI(t: MBTI): Record<Axis, string> | null {
  const s = t.trim().toUpperCase();
  if (s.length !== 4) return null;
  const out = {} as Record<Axis, string>;
  for (const ax of Object.keys(POLES) as Axis[]) {
    const ch = s[AXIS_INDEX[ax]];
    if (!POLES[ax].includes(ch)) return null;
    out[ax] = ch;
  }
  return out;
}

// ── 2b. 축별 휴리스틱 가중치 ───────────────────────────────────────────
// mode: 'same' = 같을수록 가점, 'complement' = 다를수록(보완) 가점.
// 통속 'MBTI 궁합' 휴리스틱:
//   E/I: 보완 선호(외향-내향이 페이스 보완) → complement
//   S/N: 같음 선호(세계관/대화코드 공유가 중요) → same   ← 충돌 시 마찰 큼
//   T/F: 보완 선호(이성-감성 균형) → complement
//   J/P: 약한 보완 선호(계획-즉흥 보완) → complement (가중 낮춤)
const MBTI_AXIS_RULES: Record<Axis, { mode: 'same' | 'complement'; weight: number }> = {
  EI: { mode: 'complement', weight: 1.0 },
  SN: { mode: 'same',       weight: 1.4 }, // 세계관 공유 = 가장 무겁게
  TF: { mode: 'complement', weight: 1.1 },
  JP: { mode: 'complement', weight: 0.8 },
};

/**
 * 0..100. 각 축에서 규칙 만족 시 +weight, 위반 시 0(=감점 효과).
 * 정규화: Σ(만족 weight) / Σ(weight).
 * 같은 글자/다른 글자 비교만 쓰므로 (A,B) 대칭.
 */
export function mbtiPairScore(a: MBTI, b: MBTI): number {
  const pa = parseMBTI(a);
  const pb = parseMBTI(b);
  if (!pa || !pb) return 50; // 미입력/오류 → 중립

  let got = 0, max = 0;
  for (const ax of Object.keys(MBTI_AXIS_RULES) as Axis[]) {
    const { mode, weight } = MBTI_AXIS_RULES[ax];
    max += weight;
    const same = pa[ax] === pb[ax];
    const satisfied = mode === 'same' ? same : !same;
    if (satisfied) got += weight;
    else got += weight * 0.15; // 위반도 0이 아닌 소폭 — 너무 극단값 방지
  }
  // 핵심 보너스: S/N 공유 + (T/F 또는 E/I 보완) 동시 충족 = 통속 '천생' 신호
  const snShared = pa.SN === pb.SN;
  const tfComp = pa.TF !== pb.TF;
  const eiComp = pa.EI !== pb.EI;
  let bonus = 0;
  if (snShared && tfComp) bonus += 0.06;
  if (snShared && eiComp) bonus += 0.04;

  const raw = clamp(got / max + bonus, 0, 1);
  return clamp(Math.round(100 * smoothstep(raw)), 0, 100);
}

// ── 3a. 가중 결합 ─────────────────────────────────────────────────────
// 기본 50/50: 사주는 '기질 궁합', MBTI는 '소통 궁합' — 동등 비중이 가장 방어적.
// 한쪽 데이터 결측이면 그쪽 비중을 0으로 재정규화(결정론적).
export const COMPAT_WEIGHTS = { ohaeng: 0.5, mbti: 0.5 } as const;

export function combinedCompat(
  aDist: OhaengDist, aMbti: MBTI | undefined,
  bDist: OhaengDist, bMbti: MBTI | undefined,
): CompatBreakdown {
  const ohaengScore = ohaengPairScore(aDist, bDist);

  const haveMbti = !!parseMBTI(aMbti ?? '') && !!parseMBTI(bMbti ?? '');
  const mbtiScore = haveMbti ? mbtiPairScore(aMbti!, bMbti!) : 50;

  const wO = COMPAT_WEIGHTS.ohaeng;
  const wM = haveMbti ? COMPAT_WEIGHTS.mbti : 0;
  const wSum = wO + wM;
  const total = clamp(Math.round((ohaengScore * wO + mbtiScore * wM) / wSum), 0, 100);

  const tier = toTier(total);
  const reasons = buildReasons(aDist, bDist, aMbti, bMbti, ohaengScore, mbtiScore, haveMbti);
  const courtSynergy = buildCourtSynergy(tier, dominantElement(aDist), dominantElement(bDist));

  return { ohaengScore, mbtiScore, total, tier, reasons, courtSynergy };
}

function toTier(total: number): Tier {
  if (total >= 92) return '천생연분';
  if (total >= 80) return '찰떡궁합';
  if (total >= 68) return '좋은짝';
  if (total >= 52) return '무난';
  if (total >= 38) return '도전적';
  return '상극주의';
}

function dominantElement(d: OhaengDist): Element {
  // 동률은 ELEMENTS 순서로 결정 → 결정론적
  return ELEMENTS.reduce((best, e) => ((d[e] ?? 0) > (d[best] ?? 0) ? e : best), ELEMENTS[0]);
}

// ── 3b. 한글 이유 불릿 (오행 + MBTI 모두 언급, 2~3개) ──────────────────
function buildReasons(
  a: OhaengDist, b: OhaengDist,
  aMbti: MBTI | undefined, bMbti: MBTI | undefined,
  oScore: number, mScore: number, haveMbti: boolean,
): string[] {
  const out: string[] = [];
  const eA = dominantElement(a), eB = dominantElement(b);

  // (1) 오행 관계 한 줄 — 결정론적 분기
  if (generates(eA, eB) || generates(eB, eA)) {
    out.push(`${eA}·${eB} 기운이 상생(相生)으로 흘러 서로를 북돋아 줘요.`);
  } else if (overcomes(eA, eB) || overcomes(eB, eA)) {
    out.push(`${eA}·${eB}이(가) 상극(相剋) 라인이라 템포 조절이 필요한 조합이에요.`);
  } else if (eA === eB) {
    out.push(`둘 다 ${eA} 기운이 강해 코드는 잘 맞지만 한쪽으로 쏠리지 않게 균형을!`);
  } else {
    out.push(`${eA}·${eB} 기운이 부족한 부분을 서로 메워 주는 보완형이에요.`);
  }

  // (2) MBTI 한 줄
  if (haveMbti) {
    const pa = parseMBTI(aMbti!)!, pb = parseMBTI(bMbti!)!;
    if (pa.SN === pb.SN) out.push(`${aMbti}·${bMbti}는 같은 ${pa.SN} 성향이라 대화 코드와 세계관이 잘 통해요.`);
    else out.push(`${aMbti}·${bMbti}는 인식(S/N) 방식이 달라 처음엔 낯설어도 서로 시야를 넓혀 줘요.`);
    if (pa.TF !== pb.TF) out.push(`이성(T)·감성(F)이 보완돼 결정과 케어의 밸런스가 좋아요.`);
  } else {
    out.push(`MBTI를 입력하면 소통 궁합까지 더해 더 정밀하게 봐 드릴게요.`);
  }

  // (3) 종합 한 줄 (점수 격차 언급) — 최대 3개로 컷
  if (out.length < 3) {
    out.push(oScore >= mScore
      ? `기질(사주) 궁합 ${oScore}점이 이 조합의 강점이에요.`
      : `소통(MBTI) 궁합 ${mScore}점이 이 조합을 끌어올려요.`);
  }
  return out.slice(0, 3);
}

// ── 3c. "코트 위 시너지" 한 줄 ─────────────────────────────────────────
function buildCourtSynergy(tier: Tier, eA: Element, eB: Element): string {
  const byTier: Record<Tier, string> = {
    천생연분: `눈빛만 봐도 포치 타이밍이 맞는 환상의 복식조 🎾`,
    찰떡궁합: `랠리가 길어질수록 강해지는 안정 듀오 — 듀스에서 빛나요.`,
    좋은짝:   `손발이 척척, 위기에서 서로를 커버하는 믿음직한 짝.`,
    무난:     `무난하게 합을 맞춰가는 사이 — 연습 세트로 케미를 끌어올려 봐요.`,
    도전적:   `스타일이 달라 초반엔 삐걱, 작전 회의 한 번이면 반전 가능!`,
    상극주의: `서로 코트를 양보 못 하는 라이벌 기질 — 단식에서 더 불타올라요 🔥`,
  };
  // 원소 메타포 살짝 가미 (결정론적): 화=공격, 수=수비, 목=성장, 금=정교, 토=안정
  const meta: Record<Element, string> = {
    목: '성장형 스트로크', 화: '폭발적 발리', 토: '단단한 수비',
    금: '정교한 코스', 수: '유연한 리시브',
  };
  return `${byTier[tier]} (${meta[eA]} × ${meta[eB]})`;
}
