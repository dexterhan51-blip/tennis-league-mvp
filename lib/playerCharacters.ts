// 선수 캐릭터 카드 데이터
// 2026 5~6월 시즌(24경기·복식 전수 집계) 기준으로 만든 별명/플레이스타일/천적 분석.
// 선수 이름(짧은 이름)으로 매칭한다. 예: "한성종" → "성종".

export interface PlayerCharacter {
  /** 매칭 키 (짧은 이름) */
  key: string;
  /** 별명 */
  nickname: string;
  /** 프로 비유 */
  proPlayer?: string;
  /** 한 줄 요약 */
  tagline: string;
  /** 플레이스타일 설명 */
  style: string;
  /** 천적 / 약점 */
  nemesis: string;
  /** 강점 케미 / 잘 잡는 상대 */
  edge: string;
}

export const PLAYER_CHARACTERS: PlayerCharacter[] = [
  {
    key: '정민',
    nickname: '빈틈없는 지배자',
    proPlayer: '조코비치',
    tagline: '상대를 가리지 않는 완성형 1위',
    style: '11승 5패, 세트 +18로 전 부문 1위. 짝이 누구든 평균 이상을 뽑아내는 올라운더. 진아와 묶이면 4승 0패.',
    nemesis: '유일한 구멍은 꼴찌 재경 — 2패를 헌납했다. 황제의 발목을 잡는 게 하필 최하위.',
    edge: '진아·성종 등 강자 상대로도 모두 우위. 빈틈이 없다.',
  },
  {
    key: '진아',
    nickname: '마성의 듀오 메이커',
    proPlayer: '미르자',
    tagline: '함께일 때 무서운 복식 케미의 화신',
    style: '9승 4패. 혼자보다 같이일 때 강하다. 정민과 4-0, 성종과도 4-0 — 강자와 엮이면 무패.',
    nemesis: '적으로 만난 정민에게 1승 3패. 단 하나의 지뢰는 재경과 짝(1승 4패) — 묶이면 마법이 풀린다.',
    edge: '재경 상대 5승 0패. 하위권은 자동 승.',
  },
  {
    key: '성종',
    nickname: '언더독 학살자',
    proPlayer: '즈베레프',
    tagline: '하위권엔 완벽, 상위권엔 흔들',
    style: '11승 5패. 말 그대로 하위권 도살자. 재경 8-0, 영주 4-0, 지윤 3-0으로 아래를 완벽 제압.',
    nemesis: '위로 가면 작아진다. 진아에게 1승 3패, 정민에게 3승 5패. 정상권 앞에선 흔들린다.',
    edge: '재경·영주·지윤에게 무패 행진. 약자에겐 무자비.',
  },
  {
    key: '빛나',
    nickname: '딱 거기까지',
    proPlayer: '루블레프',
    tagline: '짝꿍 따라 결과가 갈리는 기복형',
    style: '7승 6패, 세트 +3. 정확히 리그 한가운데. 성종과 묶이면 3-1, 재경과 묶이면 1-3으로 출렁인다.',
    nemesis: '진아에게 1승 3패. 늘 4위권엔 안착하지만 그 위 벽은 못 넘는다.',
    edge: '영주를 잘 잡는다(5-2). 성종과의 콤비가 최고.',
  },
  {
    key: '영주',
    nickname: '성종 앞의 유리멘탈',
    proPlayer: '치치파스',
    tagline: '한 명만 피하면 해볼 만한데…',
    style: '5승 8패. 특정 천적만 빼면 경쟁력 있다. 재경 상대로는 4-1로 강하다.',
    nemesis: '성종에게 0승 4패 완전 천적. 재경과 짝(0승 4패)은 이번 리그 최악의 케미.',
    edge: '성종과 한 팀이 되면 3-2로 쏠쏠. 적일 땐 천적, 같은 편이면 든든.',
  },
  {
    key: '지윤',
    nickname: '최소 출전 다크호스',
    proPlayer: '라오니치',
    tagline: '정민 옆자리가 명당',
    style: '3승 6패, 9경기로 최소 출전. 1위 정민을 등에 업으면 살아난다(2-1).',
    nemesis: '성종에게 0승 3패, 재경과 짝이면 0승 3패. 꾸준함이 아쉽다.',
    edge: '정민과의 콤비가 유일한 명당. 가끔 등장해 한 방을 노린다.',
  },
  {
    key: '재경',
    nickname: '1위 한정 자이언트 킬러',
    proPlayer: '이변 제조기',
    tagline: '2승은 모두 정민 사냥 한정판',
    style: '2승 14패, 세트 −33 최하위. 그런데 그 귀한 2승이 둘 다 1위 정민이 낀 팀을 잡은 경기다.',
    nemesis: '성종에게 0승 8패 상극. 짝꿍으론 영주·지윤과 0승으로 빛을 못 봤다.',
    edge: '모두가 못 이기는 황제 정민을 잡아내는 반전의 데이비드.',
  },
];

/**
 * 선수 이름으로 캐릭터를 찾는다.
 * 풀네임("한성종")이 짧은 키("성종")로 끝나거나 포함하면 매칭.
 */
export function getPlayerCharacter(name: string | undefined): PlayerCharacter | null {
  if (!name) return null;
  const trimmed = name.trim();
  return (
    PLAYER_CHARACTERS.find(
      (c) => trimmed === c.key || trimmed.endsWith(c.key) || trimmed.includes(c.key),
    ) ?? null
  );
}
