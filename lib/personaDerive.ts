// lib/personaDerive.ts
// 글루(adapter) 모듈 — 세 엔진(saju / mbtiProfiles / proPlayerMatch)을 한 사람의
// "페르소나"로 합성하는 유일한 지점. 순수 함수, React/스토리지 비의존.
//
// 타입 표현이 모듈마다 다르다(의도된 분리):
//   personaCode.Gender = 'male'|'female'   (저장/코드 표현)
//   saju.Gender        = '남'|'여'          (엔진 표현)
//   saju.Element       = '목'|'화'|'토'|'금'|'수'
// personaInputsToSaju 가 그 사이를 잇는 SINGLE mapping point다.

import {
  computeSaju,
  type SajuInput,
  type SajuResult,
  type Element,
} from '@/lib/saju';
import { getMbtiProfile, type MbtiTennisProfile } from '@/lib/mbtiProfiles';
import {
  matchProPlayer,
  normalizeTraits,
  type TraitVector,
  type ProMatchResult,
} from '@/lib/proPlayerMatch';
import type { PersonaInputs } from '@/lib/personaCode';

/** 한 사람의 완성된 페르소나 (me / friend 양쪽에 동일하게 사용). */
export interface Persona {
  saju: SajuResult;
  mbtiProfile: MbtiTennisProfile;
  traitVector: TraitVector;
  proMatch: ProMatchResult;
}

/** 오행 고정 순서 (동률 tie-break 결정론적). saju.elementCounts 키와 일치. */
const ELEMENT_ORDER: Element[] = ['목', '화', '토', '금', '수'];

/**
 * 오행 dominant → 5차원 trait 미세 보정(±6). MBTI를 주(主)로 두고 사주가 살짝 흔든다.
 *   화 → +공격성 / 수 → +창의 / 토 → +일관성 / 금 → +멘탈 / 목 → +복식케미
 */
const ELEMENT_NUDGE: Record<Element, Partial<TraitVector>> = {
  화: { aggression: 6 },
  수: { creativity: 6 },
  토: { consistency: 6 },
  금: { mentalToughness: 6 },
  목: { teamChemistry: 6 },
};

/** elementCounts에서 우세 원소(동률은 ELEMENT_ORDER 순서로 결정). */
export function dominantElement(counts: Record<Element, number>): Element {
  return ELEMENT_ORDER.reduce(
    (best, e) => ((counts[e] ?? 0) > (counts[best] ?? 0) ? e : best),
    ELEMENT_ORDER[0],
  );
}

/**
 * personaCode.PersonaInputs → saju.SajuInput.
 * calendarType solar→'양력'/lunar→'음력', gender male→'남'/female→'여',
 * birthHour null→'unknown'. (이곳이 유일한 타입 변환 지점)
 */
export function personaInputsToSaju(inputs: PersonaInputs): SajuInput {
  return {
    year: inputs.birthYear,
    month: inputs.birthMonth,
    day: inputs.birthDay,
    hour: inputs.birthHour === null ? 'unknown' : inputs.birthHour,
    calendar: inputs.calendarType === 'lunar' ? '음력' : '양력',
    gender: inputs.gender === 'female' ? '여' : '남',
  };
}

/**
 * MBTI 프로필 trait를 key-by-key로 복제(키 누락 시 컴파일 에러)한 뒤,
 * 사주 오행 dominant 보정을 더해 0..100으로 clamp한 TraitVector를 반환.
 */
export function deriveTraitVector(
  mbtiProfile: MbtiTennisProfile,
  saju: SajuResult,
): TraitVector {
  const t = mbtiProfile.traits;
  const dom = dominantElement(saju.elementCounts);
  const nudge = ELEMENT_NUDGE[dom];
  const nudged: TraitVector = {
    aggression: t.aggression + (nudge.aggression ?? 0),
    consistency: t.consistency + (nudge.consistency ?? 0),
    creativity: t.creativity + (nudge.creativity ?? 0),
    mentalToughness: t.mentalToughness + (nudge.mentalToughness ?? 0),
    teamChemistry: t.teamChemistry + (nudge.teamChemistry ?? 0),
  };
  return normalizeTraits(nudged);
}

/**
 * 한 사람의 inputs → 완성 페르소나.
 * computeSaju → getMbtiProfile → deriveTraitVector → matchProPlayer 를 한 번에 합성.
 * me / friend(decode 결과) 양쪽에 동일하게 쓴다.
 */
export function buildPersona(inputs: PersonaInputs): Persona {
  const saju = computeSaju(personaInputsToSaju(inputs));
  const mbtiProfile = getMbtiProfile(inputs.mbti);
  if (!mbtiProfile) {
    // PersonaInputs.mbti 는 16종 중 하나이므로 정상 흐름에선 도달하지 않음.
    throw new Error(`[personaDerive] 알 수 없는 MBTI: ${inputs.mbti}`);
  }
  const traitVector = deriveTraitVector(mbtiProfile, saju);
  const proMatch = matchProPlayer(traitVector);
  return { saju, mbtiProfile, traitVector, proMatch };
}
