// lib/proPlayerMatch.ts
// "닮은 프로 매칭" — 기질/플레이스타일 5차원 벡터로 실존 프로 테니스 선수를 매칭한다.
// 벡터 출처: MBTI + 사주 오행 파생 (각 0~100).
// 톤/네이밍은 lib/playerCharacters.ts(로컬 선수 → 프로 비유)와 맞춘다.

/** 매칭에 쓰는 5차원 트레잇. 각 0~100. */
export interface TraitVector {
  /** 공격성 — 먼저 때리고 위너를 노리는 성향 */
  aggression: number;
  /** 일관성 — 기복 없이 꾸준한 정도 (언포스드 에러를 줄이는 안정감) */
  consistency: number;
  /** 창의성 — 변칙·쇼맨십·각도/드롭샷 등 예측 불가능성 */
  creativity: number;
  /** 멘탈 — 접전·역경에서의 강함, 클러치 능력 */
  mentalToughness: number;
  /** 복식 케미 — 파트너와 함께일 때 시너지/소통 */
  teamChemistry: number;
}

/** 차원별 가중치 (매칭에서 중요도). 합이 1일 필요는 없다. */
export type TraitWeights = TraitVector;

export type TraitKey = keyof TraitVector;

export const TRAIT_KEYS: TraitKey[] = [
  'aggression',
  'consistency',
  'creativity',
  'mentalToughness',
  'teamChemistry',
];

/** 각 차원의 한국어 라벨 — "왜 닮았나" 문장 생성에 사용 */
export const TRAIT_LABELS: Record<TraitKey, string> = {
  aggression: '공격성',
  consistency: '일관성',
  creativity: '창의성',
  mentalToughness: '멘탈',
  teamChemistry: '복식 케미',
};

/** 닮은 프로 1명의 카드 데이터 */
export interface ProPlayer {
  /** 매칭 키 (짧은/대표 이름) e.g. "조코비치" */
  key: string;
  /** 풀 표기 이름 */
  name: string;
  /** 성별 — 라벨/통계용 (매칭엔 영향 없음) */
  gender: 'M' | 'W';
  /** 활동 시기 구분 — legend(레전드) / current(현역) */
  era: 'legend' | 'current';
  /** 5차원 트레잇 벡터 */
  traits: TraitVector;
  /** 플레이스타일 한 줄 */
  playstyle: string;
  /** 한국어 캐릭터 태그 (해시태그 느낌) */
  tags: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// 로스터 — 레전드 & 현역, 남녀, 다양한 스타일 (14명)
// 벡터는 각 선수의 실제 캐릭터에 근거해 "구분되고 변호 가능한" 값으로 설정.
// ──────────────────────────────────────────────────────────────────────────
export const PRO_PLAYERS: ProPlayer[] = [
  {
    key: '조코비치',
    name: '노박 조코비치',
    gender: 'M',
    era: 'current',
    traits: { aggression: 78, consistency: 98, creativity: 70, mentalToughness: 99, teamChemistry: 62 },
    playstyle: '빈틈없는 리턴과 신축 같은 수비로 상대를 갈아버리는 완성형 지배자.',
    tags: ['#완성형', '#철벽리턴', '#클러치괴물', '#GOAT'],
  },
  {
    key: '나달',
    name: '라파엘 나달',
    gender: 'M',
    era: 'legend',
    traits: { aggression: 88, consistency: 95, creativity: 60, mentalToughness: 100, teamChemistry: 70 },
    playstyle: '한 포인트도 그냥 안 주는 고집·근성·헤비 톱스핀. 클레이 위의 황소.',
    tags: ['#투지', '#멘탈최상', '#일관성', '#클레이의왕'],
  },
  {
    key: '페더러',
    name: '로저 페더러',
    gender: 'M',
    era: 'legend',
    traits: { aggression: 80, consistency: 88, creativity: 92, mentalToughness: 85, teamChemistry: 72 },
    playstyle: '물 흐르듯 우아한 올라운드. 어떤 샷도 예술이 되는 효율의 미학.',
    tags: ['#올라운더', '#우아함', '#효율', '#레전드'],
  },
  {
    key: '알카라스',
    name: '카를로스 알카라스',
    gender: 'M',
    era: 'current',
    traits: { aggression: 90, consistency: 82, creativity: 95, mentalToughness: 88, teamChemistry: 75 },
    playstyle: '파워와 드롭샷·각도가 공존하는 차세대 만능형. 즐기며 때린다.',
    tags: ['#차세대', '#창의폭발', '#하이라이트제조기', '#에너지'],
  },
  {
    key: '신네르',
    name: '야니크 신네르',
    gender: 'M',
    era: 'current',
    traits: { aggression: 92, consistency: 94, creativity: 68, mentalToughness: 90, teamChemistry: 58 },
    playstyle: '레이저처럼 깊고 빠른 클린 볼. 감정 없이 기계적으로 코너를 때린다.',
    tags: ['#클린히터', '#냉정', '#일관성', '#베이스라인폭격'],
  },
  {
    key: '즈베레프',
    name: '알렉산더 즈베레프',
    gender: 'M',
    era: 'current',
    traits: { aggression: 82, consistency: 80, creativity: 64, mentalToughness: 70, teamChemistry: 60 },
    playstyle: '큰 키에서 내리꽂는 서브와 긴 랠리. 강자 앞에선 가끔 흔들린다.',
    tags: ['#빅서버', '#피지컬', '#큰무대긴장'],
  },
  {
    key: '치치파스',
    name: '스테파노스 치치파스',
    gender: 'M',
    era: 'current',
    traits: { aggression: 80, consistency: 74, creativity: 82, mentalToughness: 66, teamChemistry: 64 },
    playstyle: '원핸드 백핸드의 낭만과 공격적 네트 플레이. 멘탈이 변수.',
    tags: ['#원핸드백핸드', '#낭만파', '#기복', '#공격본능'],
  },
  {
    key: '키리오스',
    name: '닉 키리오스',
    gender: 'M',
    era: 'current',
    traits: { aggression: 95, consistency: 50, creativity: 99, mentalToughness: 60, teamChemistry: 55 },
    playstyle: '언더암 서브에 트윈샷까지, 천재성과 기복이 공존하는 쇼맨.',
    tags: ['#천재', '#기복', '#쇼맨십', '#예측불가'],
  },
  {
    key: '라오니치',
    name: '밀로스 라오니치',
    gender: 'M',
    era: 'legend',
    traits: { aggression: 86, consistency: 76, creativity: 52, mentalToughness: 68, teamChemistry: 56 },
    playstyle: '한 방의 폭탄 서브로 게임을 끝낸다. 단순하지만 무서운 한 방.',
    tags: ['#서브머신', '#한방', '#에이스장인'],
  },
  {
    key: '세레나',
    name: '세레나 윌리엄스',
    gender: 'W',
    era: 'legend',
    traits: { aggression: 96, consistency: 88, creativity: 72, mentalToughness: 98, teamChemistry: 80 },
    playstyle: '여자 테니스의 패러다임을 바꾼 압도적 파워와 승부욕의 화신.',
    tags: ['#여제', '#파워하우스', '#불굴의멘탈', '#GOAT'],
  },
  {
    key: '시비옹테크',
    name: '이가 시비옹테크',
    gender: 'W',
    era: 'current',
    traits: { aggression: 87, consistency: 96, creativity: 74, mentalToughness: 92, teamChemistry: 66 },
    playstyle: '헤비 포핸드와 풋워크로 코트를 지배. 클레이에선 거의 무결점.',
    tags: ['#클레이여왕', '#일관성', '#집중력', '#포핸드'],
  },
  {
    key: '사발렌카',
    name: '아리나 사발렌카',
    gender: 'W',
    era: 'current',
    traits: { aggression: 98, consistency: 78, creativity: 60, mentalToughness: 82, teamChemistry: 64 },
    playstyle: '코트가 부서질 듯한 풀스윙. 들어가면 끝, 안 들어가면 더블폴트.',
    tags: ['#파워풀스윙', '#하이리스크', '#멘탈성장', '#포효'],
  },
  {
    key: '가우프',
    name: '코코 가우프',
    gender: 'W',
    era: 'current',
    traits: { aggression: 78, consistency: 85, creativity: 76, mentalToughness: 90, teamChemistry: 78 },
    playstyle: '발 빠른 수비와 끈질김, 큰 무대일수록 강해지는 영건.',
    tags: ['#스피드', '#끈기', '#빅매치강함', '#영건'],
  },
  {
    key: '정현',
    name: '정현',
    gender: 'M',
    era: 'legend',
    traits: { aggression: 74, consistency: 90, creativity: 66, mentalToughness: 84, teamChemistry: 72 },
    playstyle: '지치지 않는 풋워크와 끈질긴 리턴. 한국 테니스의 자존심.',
    tags: ['#그라운드스트로크', '#끈기', '#리턴', '#국가대표'],
  },
];

// ──────────────────────────────────────────────────────────────────────────
// 거리/유사도 함수
// ──────────────────────────────────────────────────────────────────────────

/** 기본 가중치 — 멘탈/일관성을 살짝 더 무겁게(성향 판별에 변별력이 크다) */
export const DEFAULT_WEIGHTS: TraitWeights = {
  aggression: 1.0,
  consistency: 1.2,
  creativity: 1.0,
  mentalToughness: 1.2,
  teamChemistry: 0.8,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/** 입력 벡터를 0~100으로 안전 보정 */
export function normalizeTraits(v: TraitVector): TraitVector {
  return {
    aggression: clamp(v.aggression),
    consistency: clamp(v.consistency),
    creativity: clamp(v.creativity),
    mentalToughness: clamp(v.mentalToughness),
    teamChemistry: clamp(v.teamChemistry),
  };
}

/** 가중 유클리드 거리 (작을수록 닮음) */
export function weightedEuclidean(
  a: TraitVector,
  b: TraitVector,
  w: TraitWeights = DEFAULT_WEIGHTS,
): number {
  let sum = 0;
  for (const k of TRAIT_KEYS) {
    const d = a[k] - b[k];
    sum += w[k] * d * d;
  }
  return Math.sqrt(sum);
}

/** 코사인 유사도 (-1~1, 클수록 닮음) — 동률 타이브레이커/대안용 */
export function cosineSimilarity(a: TraitVector, b: TraitVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of TRAIT_KEYS) {
    dot += a[k] * b[k];
    na += a[k] * a[k];
    nb += b[k] * b[k];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * 가중 유클리드 거리를 0~100 "닮음 점수"로 환산.
 * 이론상 최대 거리(모든 축 100 차이)를 기준으로 정규화.
 */
function distanceToScore(distance: number, w: TraitWeights): number {
  let maxSq = 0;
  for (const k of TRAIT_KEYS) maxSq += w[k] * 100 * 100;
  const maxDist = Math.sqrt(maxSq);
  const score = (1 - distance / maxDist) * 100;
  return Math.round(clamp(score));
}

// ──────────────────────────────────────────────────────────────────────────
// "왜 닮았나" 설명 생성
// ──────────────────────────────────────────────────────────────────────────

/** 0~100 값을 한국어 강도 표현으로 */
function intensityWord(value: number): string {
  if (value >= 90) return '최상급';
  if (value >= 78) return '높은';
  if (value >= 55) return '준수한';
  if (value >= 35) return '무난한';
  return '낮은';
}

/**
 * 두 벡터에서 "가장 잘 맞는(차이가 작은) 차원" 상위 N개를 뽑아
 * 한국어 "왜 닮았나" 문장을 만든다.
 */
export function explainMatch(
  user: TraitVector,
  pro: ProPlayer,
  topN = 2,
): string {
  // 차원별 (가중) 차이가 작은 순으로 정렬 → 가장 닮은 축
  const ranked = TRAIT_KEYS.map((k) => ({
    key: k,
    label: TRAIT_LABELS[k],
    diff: Math.abs(user[k] - pro.traits[k]) * DEFAULT_WEIGHTS[k],
    shared: Math.round((user[k] + pro.traits[k]) / 2),
  })).sort((p, q) => p.diff - q.diff);

  const top = ranked.slice(0, topN);
  const phrases = top.map(
    (t) => `${t.label} ${intensityWord(t.shared)}(${t.shared})`,
  );

  const joined = phrases.join(' · ');
  return `당신과 ${pro.name}는 ${joined} 코드가 똑 닮았어요. ${pro.playstyle}`;
}

// ──────────────────────────────────────────────────────────────────────────
// 매칭 메인 API
// ──────────────────────────────────────────────────────────────────────────

export interface ProMatch {
  player: ProPlayer;
  /** 가중 유클리드 거리 (작을수록 닮음) */
  distance: number;
  /** 0~100 닮음 점수 (클수록 닮음) */
  score: number;
  /** 코사인 유사도 (타이브레이커/참고) */
  cosine: number;
}

export interface ProMatchResult {
  /** 최고 매치 */
  best: ProMatch;
  /** 라이벌 후보 2명 (2~3위) */
  runnersUp: ProMatch[];
  /** "왜 닮았나" 한국어 설명 (best 기준) */
  reason: string;
}

/**
 * 사용자 트레잇 벡터로 가장 닮은 프로를 찾는다.
 * 가중 유클리드 거리로 정렬, 동률 시 코사인 유사도로 타이브레이크.
 * @returns 최고 매치 + 라이벌 후보 2명 + "왜 닮았나" 설명
 */
export function matchProPlayer(
  userTraits: TraitVector,
  options?: { weights?: TraitWeights; roster?: ProPlayer[] },
): ProMatchResult {
  const weights = options?.weights ?? DEFAULT_WEIGHTS;
  const roster = options?.roster ?? PRO_PLAYERS;
  const user = normalizeTraits(userTraits);

  const ranked: ProMatch[] = roster
    .map((player) => {
      const distance = weightedEuclidean(user, player.traits, weights);
      return {
        player,
        distance,
        score: distanceToScore(distance, weights),
        cosine: cosineSimilarity(user, player.traits),
      };
    })
    .sort((a, b) => {
      // 1차: 거리 오름차순. 2차(동률): 코사인 내림차순.
      if (Math.abs(a.distance - b.distance) > 1e-9) return a.distance - b.distance;
      return b.cosine - a.cosine;
    });

  const best = ranked[0];
  const runnersUp = ranked.slice(1, 3);

  return {
    best,
    runnersUp,
    reason: explainMatch(user, best.player, 2),
  };
}

/** 키로 프로 단건 조회 (lib/playerCharacters.ts의 getPlayerCharacter와 동일한 느낌) */
export function getProPlayer(key: string | undefined): ProPlayer | null {
  if (!key) return null;
  const trimmed = key.trim();
  return (
    PRO_PLAYERS.find(
      (p) => trimmed === p.key || p.name.includes(trimmed) || trimmed.includes(p.key),
    ) ?? null
  );
}
