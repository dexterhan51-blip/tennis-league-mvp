// lib/scoringConfig.ts
// 리그 전체 스코어링 설정(듀스/노애드 + 목표 점수) 보관.
// LeagueData 최상위에 두면 useLeagueData 자동저장이 덮어쓰므로 별도 전역 키로 저장.

import { safeGetJSON, safeSetJSON } from '@/lib/storage';
import { ScoringConfigSchema } from '@/lib/schemas';
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from '@/lib/liveScoring';

const SCORING_CONFIG_KEY = 'tennis-app-scoring-config'; // 전역, kebab + tennis-app- prefix

export function getScoringConfig(): ScoringConfig {
  const saved = safeGetJSON(SCORING_CONFIG_KEY, ScoringConfigSchema);
  return saved ?? { ...DEFAULT_SCORING_CONFIG };
}

export function saveScoringConfig(config: ScoringConfig): boolean {
  return safeSetJSON(SCORING_CONFIG_KEY, config);
}
