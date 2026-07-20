-- 러브포티 - 친선경기 테이블 (투어 종합 랭킹용)
-- Supabase SQL Editor에서 실행하세요. (supabase-migration-auth.sql 실행 이후 언제든 가능)
--
-- 리그 밖에서 치른 개인 경기를 행 단위로 저장한다.
-- 종합 랭킹은 리그별 점수 + 친선경기 점수(동일 규칙: 참석 1점/일 + 승리 1점)를 합산한다.

CREATE TABLE IF NOT EXISTS friendly_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date TEXT NOT NULL,   -- 'YYYY-MM-DD' (Match.date와 동일 포맷, 연도 필터 키)
  match JSONB NOT NULL,       -- Match 객체 (teamA/teamB 선수 스냅샷, scoreA/B, isFinished, videoUrl?)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friendly_matches_date ON friendly_matches (match_date);

ALTER TABLE friendly_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read friendly" ON friendly_matches;
CREATE POLICY "members read friendly" ON friendly_matches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin insert friendly" ON friendly_matches;
CREATE POLICY "admin insert friendly" ON friendly_matches
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin update friendly" ON friendly_matches;
CREATE POLICY "admin update friendly" ON friendly_matches
  FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin delete friendly" ON friendly_matches;
CREATE POLICY "admin delete friendly" ON friendly_matches
  FOR DELETE TO authenticated USING (is_admin());
