// lib/personaRoster.ts
// 리그 멤버 페르소나 코드 명단(로스터) 관리 + 궁합 매트릭스 계산.
// 저장/파싱은 순수, 페르소나 빌드는 기존 엔진 재사용.

import { safeGetJSON, safeSetJSON, safeRemove } from '@/lib/storage';
import { PersonaRosterSchema } from '@/lib/schemas';
import { decode, type PersonaInputs } from '@/lib/personaCode';
import { buildPersona, dominantElement, type Persona } from '@/lib/personaDerive';
import { combinedCompat, type CompatBreakdown } from '@/lib/sajuCompat';
import type { Element } from '@/lib/saju';

export interface RosterEntry {
  name: string;
  code: string;
}

const ROSTER_KEY = 'tennis-app-persona-roster'; // 전역, kebab + tennis-app- prefix

export function getRoster(): RosterEntry[] {
  const stored = safeGetJSON(ROSTER_KEY, PersonaRosterSchema) ?? [];
  return mergeRoster([], stored); // 저장본도 이름 기준 중복 제거
}
export function saveRoster(roster: RosterEntry[]): boolean {
  return safeSetJSON(ROSTER_KEY, roster);
}
export function clearRoster(): boolean {
  return safeRemove(ROSTER_KEY);
}

/**
 * "이름 - SAJU1-XXXX-XXXX" 형태의 여러 줄 텍스트를 파싱.
 * 구분자(-, :, ·, =) 또는 공백 모두 허용. 코드가 없는 줄은 무시.
 */
export function parseRosterText(text: string): RosterEntry[] {
  const out: RosterEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // SAJU + 버전숫자 + (선택 대시) 4자 + (선택 대시) 4자 — 길이를 고정해 뒤 텍스트로 새지 않게
    const codeMatch = line.match(/SAJU\d+-?[0-9A-Za-z]{4}-?[0-9A-Za-z]{4}/);
    if (!codeMatch || codeMatch.index === undefined) continue;
    const code = codeMatch[0].toUpperCase();
    let name = line.slice(0, codeMatch.index).trim();
    name = name.replace(/[-:·=]+\s*$/, '').trim();
    if (!name) name = code;
    out.push({ name, code });
  }
  return out;
}

/** 이름 기준(대소문자 무시) 병합 — 같은 이름은 새 항목으로 덮어쓴다. */
export function mergeRoster(current: RosterEntry[], incoming: RosterEntry[]): RosterEntry[] {
  const map = new Map<string, RosterEntry>();
  for (const e of current) map.set(e.name.toLowerCase(), e);
  for (const e of incoming) map.set(e.name.toLowerCase(), e);
  return Array.from(map.values());
}

export interface RosterPersona {
  name: string;
  code: string;
  ok: boolean;
  error?: string;
  mbti?: string;
  persona?: Persona;
  dominant?: Element;
}

/** 로스터 항목들을 디코드해 페르소나로 변환. 잘못된 코드는 ok:false. */
export function buildRosterPersonas(entries: RosterEntry[]): RosterPersona[] {
  return entries.map((e) => {
    const r = decode(e.code);
    if (!r.ok) {
      return { name: e.name, code: e.code, ok: false, error: r.error.message };
    }
    const persona = buildPersona(r.inputs);
    return {
      name: e.name,
      code: e.code,
      ok: true,
      mbti: r.inputs.mbti,
      persona,
      dominant: dominantElement(persona.saju.elementCounts),
    };
  });
}

export interface CompatEdge {
  i: number; // valid 배열 인덱스
  j: number;
  total: number;
  breakdown: CompatBreakdown;
}

/** 유효한 페르소나들의 모든 쌍 궁합 (i<j). */
export function computeCompatMatrix(valid: RosterPersona[]): CompatEdge[] {
  const edges: CompatEdge[] = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const A = valid[i];
      const B = valid[j];
      if (!A.persona || !B.persona) continue;
      const breakdown = combinedCompat(
        A.persona.saju.elementCounts,
        A.mbti,
        B.persona.saju.elementCounts,
        B.mbti,
      );
      edges.push({ i, j, total: breakdown.total, breakdown });
    }
  }
  return edges;
}

// 의도적으로 PersonaInputs 재노출 (호출부 타입 편의)
export type { PersonaInputs };
