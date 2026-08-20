-- 러브포티 - 시즌 타임라인 스키마 (서버 원본 전환)
-- Supabase SQL Editor에서 실행하세요. (supabase-migration-auth.sql 실행 이후)
--
-- 기존 "리그 = JSONB 한 덩어리(shared_leagues)" 모델을
-- "클럽 하나 + 흘러가는 시즌들" 모델로 교체한다.
--   · seasons        : 시즌 메타 (live는 항상 1개, 종료 시 archived로 전환)
--   · league_matches : 리그 경기 1건 = 행 1개 (friendly_matches와 동일 패턴)
-- 경기 단위 행이므로 여러 기기가 동시에 입력해도 덮어쓰기 충돌이 없다.
-- 기존 shared_leagues / friendly_matches 테이블은 건드리지 않는다
-- (데이터 이전은 앱의 설정 > 데이터 이전 버튼이 수행, 이전 후에도 백업으로 남음).

-- ── 1. seasons ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_no INT NOT NULL,               -- 1, 2, 3, ... (표시/정렬용)
  name TEXT NOT NULL,                   -- 예: '2026 시즌 5'
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'archived')),
  players JSONB NOT NULL DEFAULT '[]',  -- 시즌 참가 선수 스냅샷 (Player[])
  starts_on TEXT,                       -- 'YYYY-MM-DD'
  ends_on TEXT,                         -- 'YYYY-MM-DD' (archived 시 기록)
  final_rankings JSONB,                 -- PlayerStat[] (archived 시 기록)
  champion_player_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- live 시즌은 항상 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS one_live_season
  ON seasons (status) WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_seasons_no ON seasons (season_no DESC);

-- ── 2. league_matches ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS league_matches (
  id TEXT PRIMARY KEY,                  -- Match.id를 그대로 사용 (클라이언트 생성 id, 과거 데이터 호환 위해 TEXT)
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  match_date TEXT NOT NULL,             -- 'YYYY-MM-DD' (Match.date 복제, 필터 키)
  match JSONB NOT NULL,                 -- Match 객체 (선수 스냅샷, 점수, pointLog 등)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_matches_season ON league_matches (season_id, match_date);

-- ── 3. RLS ──────────────────────────────────────────────────
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matches ENABLE ROW LEVEL SECURITY;

-- 읽기: 누구나 (공유 라이브 URL은 비로그인 열람 허용 — 기존 shared_leagues와 동일 정책)
DROP POLICY IF EXISTS "anyone read seasons" ON seasons;
CREATE POLICY "anyone read seasons" ON seasons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anyone read league matches" ON league_matches;
CREATE POLICY "anyone read league matches" ON league_matches
  FOR SELECT USING (true);

-- 쓰기: 관리자만 (friendly_matches와 동일 패턴)
DROP POLICY IF EXISTS "admin insert seasons" ON seasons;
CREATE POLICY "admin insert seasons" ON seasons
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin update seasons" ON seasons;
CREATE POLICY "admin update seasons" ON seasons
  FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin delete seasons" ON seasons;
CREATE POLICY "admin delete seasons" ON seasons
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin insert league matches" ON league_matches;
CREATE POLICY "admin insert league matches" ON league_matches
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin update league matches" ON league_matches;
CREATE POLICY "admin update league matches" ON league_matches
  FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin delete league matches" ON league_matches;
CREATE POLICY "admin delete league matches" ON league_matches
  FOR DELETE TO authenticated USING (is_admin());

-- ── 4. updated_at 자동 갱신 (기존 update_updated_at 함수 재사용) ──
DROP TRIGGER IF EXISTS set_seasons_updated_at ON seasons;
CREATE TRIGGER set_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_league_matches_updated_at ON league_matches;
CREATE TRIGGER set_league_matches_updated_at
  BEFORE UPDATE ON league_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. Realtime ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE seasons;
ALTER PUBLICATION supabase_realtime ADD TABLE league_matches;
