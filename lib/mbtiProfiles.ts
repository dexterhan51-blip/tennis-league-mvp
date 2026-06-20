// lib/mbtiProfiles.ts
// 16 MBTI → 혼합복식(혼복) 플레이스타일 & 기질 프로필
// 프로 선수 매칭 / 파트너 궁합 계산에 trait 벡터 사용

export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export type CourtRole =
  | '네트 플레이어'
  | '베이스라이너'
  | '올라운더'
  | '분위기메이커';

/** 0-100 trait 벡터. 4축(E/I·N/S·T/F·J/P)에서 파생. 프로 매칭·궁합 계산용. */
export interface MbtiTraitVector {
  aggression: number;       // 네트 적극성·공격성 (E, N, T, P가 올림)
  consistency: number;      // 안정성·범실 적음 (I, S, J가 올림)
  creativity: number;       // 전술·변칙·창의 (N, P가 올림)
  mentalToughness: number;  // 클로징·멘탈 (T, J가 올림)
  teamChemistry: number;    // 파트너 케미·분위기 (E, F가 올림)
}

export interface MbtiTennisProfile {
  mbti: MbtiType;
  nickname: string;          // 한국어 별명
  playstyle: string;         // 2-3문장, 혼복 맥락
  strength: string;          // 강점
  weakness: string;          // 약점
  courtRole: CourtRole;
  traits: MbtiTraitVector;
}

export const MBTI_TENNIS_PROFILES: MbtiTennisProfile[] = [
  // ─────────────── 분석가 (NT) ───────────────
  {
    mbti: 'INTJ',
    nickname: '코트 위의 설계자',
    playstyle:
      '베이스라인에서 상대 약점을 데이터처럼 읽고, 몇 수 앞을 내다보고 포인트를 설계합니다. 화려하진 않아도 매 게임 같은 함정을 정확히 반복해 파트너가 네트에서 마무리할 길을 깔아줍니다. 말은 적지만 사인 하나로 작전을 끝냅니다.',
    strength: '냉정한 패턴 분석과 흔들리지 않는 경기 운영',
    weakness: '계획이 어긋나면 융통성이 떨어지고 파트너와 거리감',
    courtRole: '베이스라이너',
    traits: { aggression: 52, consistency: 78, creativity: 70, mentalToughness: 82, teamChemistry: 44 },
  },
  {
    mbti: 'INTP',
    nickname: '변칙 실험실',
    playstyle:
      '교과서를 비틀어 매 포인트 다른 스핀과 각도를 시험하는 아이디어 뱅크입니다. 풀리면 천재적인 코스가 나오지만, 흐름을 너무 분석하다 결정적 순간을 흘리기도 합니다. 혼복에선 파트너가 루틴을 잡아줄 때 진가가 나옵니다.',
    strength: '예측 불가한 구질과 상황을 푸는 창의력',
    weakness: '집중력 기복과 클로징 타이밍 놓침',
    courtRole: '올라운더',
    traits: { aggression: 50, consistency: 48, creativity: 88, mentalToughness: 58, teamChemistry: 46 },
  },
  {
    mbti: 'ENTJ',
    nickname: '코트 지휘관',
    playstyle:
      '서브 순서부터 포메이션까지 한 팀을 통째로 지휘하는 리더형. 네트로 과감히 전진해 압박하고, 매치포인트에서 가장 강해지는 클로저입니다. 파트너를 강하게 끌고 가는 만큼 주도권을 쥐려는 욕심이 큽니다.',
    strength: '강한 추진력과 승부처에서의 결정력',
    weakness: '파트너를 몰아붙이는 과한 주도권 욕심',
    courtRole: '올라운더',
    traits: { aggression: 80, consistency: 66, creativity: 64, mentalToughness: 86, teamChemistry: 58 },
  },
  {
    mbti: 'ENTP',
    nickname: '도발의 전술가',
    playstyle:
      '상대 리듬을 깨는 변칙과 페인트로 코트를 흔드는 도발러입니다. 즉흥적으로 작전을 갈아엎으며 분위기를 가져오지만, 한 가지에 끝까지 집중하기보다 새 시도를 즐깁니다. 혼복에선 파트너의 안정감과 만나면 폭발합니다.',
    strength: '순발력 있는 전술 변화와 기싸움 장악',
    weakness: '루틴 부족으로 기복이 큰 마무리',
    courtRole: '네트 플레이어',
    traits: { aggression: 74, consistency: 50, creativity: 86, mentalToughness: 64, teamChemistry: 62 },
  },

  // ─────────────── 외교관 (NF) ───────────────
  {
    mbti: 'INFJ',
    nickname: '조용한 조율가',
    playstyle:
      '파트너의 컨디션과 상대의 의도를 동시에 읽어 흐름을 부드럽게 조율합니다. 베이스라인에서 끈질기게 버티며 영리한 각도로 길을 열고, 위기에서 팀을 다독여 무너지지 않게 합니다. 화려함보다 균형으로 이깁니다.',
    strength: '게임 흐름 읽기와 파트너 심리 안정',
    weakness: '자기 주장이 약해 결정타를 미루는 경향',
    courtRole: '베이스라이너',
    traits: { aggression: 48, consistency: 72, creativity: 74, mentalToughness: 62, teamChemistry: 72 },
  },
  {
    mbti: 'INFP',
    nickname: '감성 샷메이커',
    playstyle:
      '기분이 오르면 환상적인 드롭샷과 로브가 터지는 감각파입니다. 파트너를 진심으로 응원하며 따뜻한 분위기를 만들지만, 멘탈이 출렁이면 경기도 함께 출렁입니다. 혼복에선 신뢰할 파트너가 곁에 있을 때 가장 빛납니다.',
    strength: '영감 어린 샷 감각과 진정성 있는 케미',
    weakness: '멘탈 기복과 일관성 부족',
    courtRole: '분위기메이커',
    traits: { aggression: 46, consistency: 50, creativity: 80, mentalToughness: 48, teamChemistry: 78 },
  },
  {
    mbti: 'ENFJ',
    nickname: '팀의 캡틴',
    playstyle:
      '파트너를 끌어올리는 데 천부적인 응원형 리더입니다. 네트에서 적극적으로 움직이며 "나만 믿어"로 팀 사기를 띄우고, 흐름이 처질 때 분위기를 직접 되돌립니다. 모두를 챙기다 자기 샷 집중을 놓칠 때가 있습니다.',
    strength: '최고의 파트너 케미와 분위기 반전력',
    weakness: '팀 챙기느라 자기 플레이가 흔들림',
    courtRole: '분위기메이커',
    traits: { aggression: 66, consistency: 62, creativity: 68, mentalToughness: 64, teamChemistry: 88 },
  },
  {
    mbti: 'ENFP',
    nickname: '에너지 폭죽',
    playstyle:
      '한 포인트마다 텐션을 폭발시키는 코트의 활력소입니다. 즉흥적인 감각샷과 끝없는 응원으로 상대 멘탈까지 흔들지만, 집중이 흩어지면 쉬운 공을 흘리기도 합니다. 혼복에선 차분한 파트너와 환상의 밸런스를 이룹니다.',
    strength: '폭발적 에너지와 상대를 흔드는 분위기',
    weakness: '집중력 산만과 들쭉날쭉한 범실',
    courtRole: '분위기메이커',
    traits: { aggression: 70, consistency: 46, creativity: 82, mentalToughness: 52, teamChemistry: 86 },
  },

  // ─────────────── 관리자 (SJ) ───────────────
  {
    mbti: 'ISTJ',
    nickname: '철벽 루틴머신',
    playstyle:
      '정직한 기본기로 똑같은 공을 끝까지 넣는 신뢰의 베이스라이너입니다. 정해진 포지션과 순서를 칼같이 지키며 범실로 점수를 내주지 않습니다. 변칙은 적지만, 긴 랠리 싸움에선 가장 늦게 무너집니다.',
    strength: '극강의 안정성과 흔들리지 않는 루틴',
    weakness: '변칙 대응력과 공격 옵션 부족',
    courtRole: '베이스라이너',
    traits: { aggression: 50, consistency: 88, creativity: 40, mentalToughness: 78, teamChemistry: 50 },
  },
  {
    mbti: 'ISFJ',
    nickname: '든든한 살림꾼',
    playstyle:
      '파트너가 비운 코트를 조용히 메우는 헌신형 수비수입니다. 화려하진 않아도 받아내야 할 공은 끝까지 받아내고, 파트너 실수를 따뜻하게 덮어줍니다. 혼복에서 가장 함께 치기 편한 안정적인 동반자입니다.',
    strength: '헌신적 커버 플레이와 편안한 케미',
    weakness: '소극적 공격과 주도권을 잘 안 잡음',
    courtRole: '베이스라이너',
    traits: { aggression: 44, consistency: 82, creativity: 46, mentalToughness: 66, teamChemistry: 76 },
  },
  {
    mbti: 'ESTJ',
    nickname: '규율의 운영가',
    playstyle:
      '명확한 게임플랜과 사인으로 팀을 효율적으로 굴리는 운영형입니다. 네트와 베이스라인을 오가며 정석대로 압박하고, 듀스 상황을 침착하게 정리합니다. 룰과 순서에 엄격해 즉흥 변수에는 다소 뻣뻣합니다.',
    strength: '체계적 운영과 안정적 클로징',
    weakness: '경직된 융통성과 예외 상황 약점',
    courtRole: '올라운더',
    traits: { aggression: 72, consistency: 80, creativity: 50, mentalToughness: 82, teamChemistry: 58 },
  },
  {
    mbti: 'ESFJ',
    nickname: '코트의 분위기 반장',
    playstyle:
      '팀 분위기를 살뜰히 챙기며 모두를 한 호흡으로 묶는 화합형입니다. 네트에서 적극적으로 소통하고, 파트너 사기를 끌어올리는 응원으로 흐름을 지킵니다. 기본기도 탄탄해 함께 치면 마음이 편안한 유형입니다.',
    strength: '뛰어난 팀 케미와 안정적 기본기',
    weakness: '결정적 순간 과감함이 부족',
    courtRole: '분위기메이커',
    traits: { aggression: 60, consistency: 74, creativity: 52, mentalToughness: 64, teamChemistry: 84 },
  },

  // ─────────────── 탐험가 (SP) ───────────────
  {
    mbti: 'ISTP',
    nickname: '냉정한 해결사',
    playstyle:
      '말없이 상황을 읽고 가장 효율적인 한 방으로 포인트를 끝내는 기술자입니다. 즉흥적인 손감각이 뛰어나 어려운 공도 태연히 처리하고, 위기에서 감정 없이 냉정합니다. 혼복에선 소통이 적어 파트너가 답답할 수 있습니다.',
    strength: '뛰어난 손감각과 침착한 위기 대응',
    weakness: '소통 부족과 무덤덤한 케미',
    courtRole: '올라운더',
    traits: { aggression: 64, consistency: 64, creativity: 70, mentalToughness: 74, teamChemistry: 46 },
  },
  {
    mbti: 'ISFP',
    nickname: '감각의 아티스트',
    playstyle:
      '몸이 기억하는 부드러운 터치로 즉흥적인 드롭과 앵글을 그려내는 감각형입니다. 조용히 파트너를 배려하며 편안한 분위기를 만들지만, 주도권 다툼은 즐기지 않습니다. 컨디션 좋은 날의 손끝은 예술에 가깝습니다.',
    strength: '섬세한 터치 감각과 부드러운 배려',
    weakness: '소극적 운영과 기복 있는 멘탈',
    courtRole: '네트 플레이어',
    traits: { aggression: 52, consistency: 56, creativity: 78, mentalToughness: 52, teamChemistry: 68 },
  },
  {
    mbti: 'ESTP',
    nickname: '코트의 승부사',
    playstyle:
      '본능적으로 네트로 돌진해 발리와 스매시로 끝장을 보는 공격형 승부사입니다. 즉흥적인 모험샷과 강한 멘탈로 승부처를 즐기며, 기세로 상대를 압도합니다. 다만 무리한 도전이 범실로 이어지기도 합니다.',
    strength: '폭발적 네트 공격과 승부처 강심장',
    weakness: '과감함이 부른 무리한 범실',
    courtRole: '네트 플레이어',
    traits: { aggression: 88, consistency: 52, creativity: 72, mentalToughness: 76, teamChemistry: 64 },
  },
  {
    mbti: 'ESFP',
    nickname: '코트의 엔터테이너',
    playstyle:
      '관중도 파트너도 즐겁게 만드는 무대 체질의 쇼맨입니다. 네트에서 화려한 즉흥샷을 시도하며 텐션을 끌어올리고, 분위기로 경기를 가져옵니다. 신나면 한없이 강하지만 흐름이 식으면 집중도 함께 식습니다.',
    strength: '화려한 쇼맨십과 팀을 띄우는 에너지',
    weakness: '집중 지속력과 일관성 부족',
    courtRole: '분위기메이커',
    traits: { aggression: 76, consistency: 50, creativity: 74, mentalToughness: 56, teamChemistry: 82 },
  },
];

/** MBTI 문자열로 프로필 조회 (대소문자 무시). 미존재 시 null. */
export function getMbtiProfile(mbti?: string): MbtiTennisProfile | null {
  if (!mbti) return null;
  const key = mbti.trim().toUpperCase();
  return MBTI_TENNIS_PROFILES.find((p) => p.mbti === key) ?? null;
}

/**
 * 두 유형의 혼복 궁합 점수(0-100).
 * trait 벡터의 "상호보완"을 보상: aggression/consistency/creativity는 서로 메워줄수록(차이 클수록) 가산,
 * teamChemistry/mentalToughness는 둘 다 높을수록(합이 클수록) 가산.
 */
export function getMbtiCompatibility(a: MbtiTennisProfile, b: MbtiTennisProfile): number {
  const ta = a.traits;
  const tb = b.traits;
  // 상호보완: 차이를 0-100 보너스로 (50 차이 → 만점 기여)
  const complement =
    (Math.abs(ta.aggression - tb.aggression) +
      Math.abs(ta.consistency - tb.consistency) +
      Math.abs(ta.creativity - tb.creativity)) /
    3;
  const complementScore = Math.min(complement / 50, 1) * 100; // 0-100
  // 시너지: 함께 높을수록 좋은 트레잇의 평균
  const synergyScore =
    ((ta.teamChemistry + tb.teamChemistry) / 2 +
      (ta.mentalToughness + tb.mentalToughness) / 2) /
    2; // 0-100
  // 보완 45% + 시너지 55% 가중 (혼복은 케미·멘탈 비중을 약간 더 둠)
  return Math.round(complementScore * 0.45 + synergyScore * 0.55);
}
