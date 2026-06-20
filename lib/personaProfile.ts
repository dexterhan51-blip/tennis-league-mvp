// lib/personaProfile.ts
// 사용자 본인의 페르소나 seed(PersonaInputs)를 localStorage 한 줄로 보관.
// 파생 결과(saju/match/trait)와 코드 문자열은 encode()/buildPersona()로 재계산 가능하므로
// 저장하지 않는다. (storage-schema 컨벤션: 소형 단일 값 → 동기 localStorage + Zod)

import { safeGetJSON, safeSetJSON, safeRemove } from '@/lib/storage';
import { PersonaInputsSchema } from '@/lib/schemas';
import type { PersonaInputs } from '@/lib/personaCode';

const PROFILE_KEY = 'tennis-app-persona-inputs'; // kebab + 전역 prefix(tennis-app-)

export function getPersonaInputs(): PersonaInputs | undefined {
  // PersonaInputsSchema 는 PersonaInputs 와 구조 동일 → 안전 캐스팅.
  return safeGetJSON(PROFILE_KEY, PersonaInputsSchema) as PersonaInputs | undefined;
}

export function savePersonaInputs(inputs: PersonaInputs): boolean {
  return safeSetJSON(PROFILE_KEY, inputs);
}

export function clearPersonaInputs(): boolean {
  return safeRemove(PROFILE_KEY);
}
