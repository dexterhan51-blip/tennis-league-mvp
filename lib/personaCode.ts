// lib/personaCode.ts
// Dependency-free "game save" code for persona engine inputs.
// 40-bit value = 32-bit payload + 8-bit CRC-8 checksum, rendered as
// 8 Crockford Base32 chars with a branded, version-tagged prefix.

/* ─────────────────────────── Types ─────────────────────────── */

export const PERSONA_SCHEMA_VERSION = 1 as const;

/** All 16 MBTI types, index 0..15 == [E/I][S/N][T/F][J/P] bit order. */
export const MBTI_TYPES = [
  "ESTJ", "ESTP", "ESFJ", "ESFP",
  "ENTJ", "ENTP", "ENFJ", "ENFP",
  "ISTJ", "ISTP", "ISFJ", "ISFP",
  "INTJ", "INTP", "INFJ", "INFP",
] as const;
export type Mbti = (typeof MBTI_TYPES)[number];

export type Gender = "male" | "female";
export type CalendarType = "solar" | "lunar";

/** birthHour is 0..23, or null = "unknown" (시간 모름). */
export interface PersonaInputs {
  schemaVersion: number; // 1..15
  mbti: Mbti;
  gender: Gender;
  calendarType: CalendarType;
  birthYear: number;     // 1920..2100
  birthMonth: number;    // 1..12
  birthDay: number;      // 1..31
  birthHour: number | null; // 0..23 or null (unknown)
}

/** Typed, discriminated decode/validate errors. */
export type PersonaCodeError =
  | { kind: "FORMAT"; message: string }       // not a SAJU code / wrong length / bad chars
  | { kind: "CHECKSUM"; message: string }      // checksum mismatch → likely a typo
  | { kind: "UNKNOWN_VERSION"; message: string; version: number; supported: number }
  | { kind: "RANGE"; message: string; field: keyof PersonaInputs };

export type DecodeResult =
  | { ok: true; inputs: PersonaInputs }
  | { ok: false; error: PersonaCodeError };

/* ───────────────────────── Constants ───────────────────────── */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX = "SAJU";
const CODE_CHARS = 8;            // 40 bits / 5
const YEAR_BASE = 1920;
const YEAR_MAX = 2100;
const HOUR_UNKNOWN = 31;         // sentinel inside the 5-bit hour field

const SUPPORTED_VERSIONS = new Set<number>([1]); // bump as you ship new versions

// Decode-time char canonicalization (Crockford-friendly look-alikes).
const DECODE_MAP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < CROCKFORD.length; i++) m[CROCKFORD[i]] = i;
  m["I"] = m["L"] = 1; // I, L → 1
  m["O"] = 0;          // O → 0
  return m;
})();

/* ───────────────────────── CRC-8 ───────────────────────────── */
// poly 0x07, init 0x00 — standard CRC-8/SMBUS table-free loop.
function crc8(bytes: number[]): number {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b & 0xff;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc & 0xff;
}

/* ──────────────────── Bit pack / unpack ─────────────────────── */

// Pack the 32-bit payload as a bigint (MSB-first field order).
function packPayload(i: PersonaInputs): bigint {
  const mbtiIdx = MBTI_TYPES.indexOf(i.mbti as Mbti);
  const hourField = i.birthHour === null ? HOUR_UNKNOWN : i.birthHour;

  let v = 0n;
  v = (v << 4n) | BigInt(i.schemaVersion & 0x0f);
  v = (v << 4n) | BigInt(mbtiIdx & 0x0f);
  v = (v << 1n) | BigInt(i.gender === "female" ? 1 : 0);
  v = (v << 1n) | BigInt(i.calendarType === "lunar" ? 1 : 0);
  v = (v << 8n) | BigInt((i.birthYear - YEAR_BASE) & 0xff);
  v = (v << 4n) | BigInt((i.birthMonth - 1) & 0x0f);
  v = (v << 5n) | BigInt((i.birthDay - 1) & 0x1f);
  v = (v << 5n) | BigInt(hourField & 0x1f);
  return v; // 32-bit value held in a bigint
}

// Split a 32-bit payload bigint into 4 big-endian bytes (for CRC).
function payloadBytes(payload: bigint): number[] {
  return [
    Number((payload >> 24n) & 0xffn),
    Number((payload >> 16n) & 0xffn),
    Number((payload >> 8n) & 0xffn),
    Number(payload & 0xffn),
  ];
}

// Render a 40-bit bigint as 8 Crockford chars (MSB-first).
function toBase32(value40: bigint): string {
  let out = "";
  for (let i = CODE_CHARS - 1; i >= 0; i--) {
    const idx = Number((value40 >> BigInt(i * 5)) & 0x1fn);
    out += CROCKFORD[idx];
  }
  return out;
}

/* ─────────────────────────── encode ────────────────────────── */

export function encode(inputs: PersonaInputs): string {
  // Defensive range validation up front (encode of bad data is a programmer error).
  assertRange(inputs);

  const payload = packPayload(inputs);          // 32 bits
  const cksum = crc8(payloadBytes(payload));    // 8 bits
  const value40 = (payload << 8n) | BigInt(cksum);

  const body = toBase32(value40);               // 8 chars
  const grouped = `${body.slice(0, 4)}-${body.slice(4, 8)}`;
  return `${PREFIX}${inputs.schemaVersion}-${grouped}`; // SAJU1-XXXX-XXXX
}

/* ─────────────────────────── decode ────────────────────────── */

export function decode(code: string): DecodeResult {
  // 1) Normalize: uppercase, strip spaces & dashes, drop the prefix.
  const cleaned = code.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!cleaned.startsWith(PREFIX)) {
    return fail({ kind: "FORMAT", message: "코드 형식이 올바르지 않습니다. (SAJU 코드가 아님)" });
  }
  // After "SAJU" there is a version digit, then 8 body chars.
  const afterPrefix = cleaned.slice(PREFIX.length); // e.g. "1XXXXXXXX"
  const prefixVersion = Number(afterPrefix[0]);
  const body = afterPrefix.slice(1);

  if (!Number.isInteger(prefixVersion) || body.length !== CODE_CHARS) {
    return fail({ kind: "FORMAT", message: "코드 길이가 올바르지 않습니다." });
  }

  // 2) Base32 → 40-bit bigint (with look-alike canonicalization).
  let value40 = 0n;
  for (const ch of body) {
    const d = DECODE_MAP[ch];
    if (d === undefined) {
      return fail({ kind: "FORMAT", message: `코드에 사용할 수 없는 문자(${ch})가 있습니다.` });
    }
    value40 = (value40 << 5n) | BigInt(d);
  }

  // 3) Split payload / checksum and verify.
  const cksum = Number(value40 & 0xffn);
  const payload = value40 >> 8n;
  const expected = crc8(payloadBytes(payload));
  if (cksum !== expected) {
    return fail({
      kind: "CHECKSUM",
      message: "코드가 손상되었거나 잘못 입력되었습니다. 다시 확인해 주세요.",
    });
  }

  // 4) Unpack fields.
  const get = (shift: bigint, mask: bigint) => Number((payload >> shift) & mask);
  const schemaVersion = get(28n, 0x0fn);
  const mbtiIdx       = get(24n, 0x0fn);
  const genderBit     = get(23n, 0x01n);
  const calBit        = get(22n, 0x01n);
  const yearRaw       = get(14n, 0xffn);
  const monthRaw      = get(10n, 0x0fn);
  const dayRaw        = get(5n,  0x1fn);
  const hourRaw       = get(0n,  0x1fn);

  // 5) Version gate — reject unknown FUTURE versions with a friendly error.
  if (!SUPPORTED_VERSIONS.has(schemaVersion)) {
    return fail({
      kind: "UNKNOWN_VERSION",
      version: schemaVersion,
      supported: PERSONA_SCHEMA_VERSION,
      message:
        `이 코드는 더 최신 버전(v${schemaVersion})으로 만들어졌어요. ` +
        `앱을 업데이트한 뒤 다시 시도해 주세요.`,
    });
  }

  // 6) Materialize inputs + final range sanity.
  const inputs: PersonaInputs = {
    schemaVersion,
    mbti: MBTI_TYPES[mbtiIdx],
    gender: genderBit === 1 ? "female" : "male",
    calendarType: calBit === 1 ? "lunar" : "solar",
    birthYear: yearRaw + YEAR_BASE,
    birthMonth: monthRaw + 1,
    birthDay: dayRaw + 1,
    birthHour: hourRaw === HOUR_UNKNOWN ? null : hourRaw,
  };

  const rangeErr = rangeError(inputs);
  if (rangeErr) return fail(rangeErr);

  return { ok: true, inputs };
}

/* ─────────────────────────── validate ──────────────────────── */
// Thin wrapper that returns the typed error (or null when OK) — handy for
// form UIs that only want to know "is this code usable?".
export function validate(code: string): PersonaCodeError | null {
  const r = decode(code);
  return r.ok ? null : r.error;
}

/* ─────────────────────── range helpers ─────────────────────── */

function rangeError(i: PersonaInputs): PersonaCodeError | null {
  const bad = (field: keyof PersonaInputs, message: string): PersonaCodeError => ({
    kind: "RANGE", field, message,
  });
  if (i.birthYear < YEAR_BASE || i.birthYear > YEAR_MAX)
    return bad("birthYear", `출생연도 범위(${YEAR_BASE}–${YEAR_MAX})를 벗어났습니다.`);
  if (i.birthMonth < 1 || i.birthMonth > 12)
    return bad("birthMonth", "출생월이 올바르지 않습니다.");
  if (i.birthDay < 1 || i.birthDay > 31)
    return bad("birthDay", "출생일이 올바르지 않습니다.");
  if (i.birthHour !== null && (i.birthHour < 0 || i.birthHour > 23))
    return bad("birthHour", "출생시가 올바르지 않습니다.");
  if (MBTI_TYPES.indexOf(i.mbti as Mbti) < 0)
    return bad("mbti", "MBTI 값이 올바르지 않습니다.");
  return null;
}

function assertRange(i: PersonaInputs): void {
  const e = rangeError(i);
  if (e) throw new Error(`[personaCode.encode] ${e.message} (${e.kind}:${"field" in e ? e.field : ""})`);
}

function fail(error: PersonaCodeError): DecodeResult {
  return { ok: false, error };
}
