-- 러브포티 테니스 리그 - 보안 강화 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
--
-- ⚠️ 실행 순서 주의:
-- 반드시 새 앱 코드(RPC 방식 useLeagueSync)를 빌드·배포한 "이후"에 실행하세요.
-- 먼저 실행하면 배포되어 있는 구버전 앱의 동기화가 끊깁니다.
--
-- 변경 내용:
-- - PIN을 평문 대신 bcrypt 해시로 저장
-- - 쓰기(INSERT/UPDATE)는 PIN을 DB 내부에서 검증하는 RPC로만 허용
-- - 열람(SELECT)과 실시간 구독은 기존과 동일하게 동작

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. 리그 발행: PIN을 bcrypt 해시로 저장하고 새 리그 id 반환
CREATE OR REPLACE FUNCTION publish_shared_league(
  p_name TEXT,
  p_pin TEXT,
  p_players JSONB,
  p_matches JSONB,
  p_season_end TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO shared_leagues (name, pin_code, players, matches, season_end, is_active)
  VALUES (p_name, crypt(p_pin, gen_salt('bf')), p_players, p_matches, p_season_end, true)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 2. 동기화: PIN이 맞을 때만 갱신, 성공 여부 반환
CREATE OR REPLACE FUNCTION sync_shared_league(
  p_id UUID,
  p_pin TEXT,
  p_name TEXT,
  p_players JSONB,
  p_matches JSONB,
  p_season_end TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE affected INT;
BEGIN
  UPDATE shared_leagues
  SET name = p_name,
      players = p_players,
      matches = p_matches,
      season_end = p_season_end,
      updated_at = now()
  WHERE id = p_id
    AND pin_code = crypt(p_pin, pin_code)
    AND is_active = true;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END $$;

-- 3. 공유 해제: PIN이 맞을 때만 비활성화
CREATE OR REPLACE FUNCTION unpublish_shared_league(
  p_id UUID,
  p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE affected INT;
BEGIN
  UPDATE shared_leagues
  SET is_active = false,
      updated_at = now()
  WHERE id = p_id
    AND pin_code = crypt(p_pin, pin_code);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END $$;

-- 4. 기존 평문 PIN을 해시로 변환
--    (bcrypt 해시는 '$2'로 시작하므로 여러 번 실행해도 안전)
UPDATE shared_leagues
SET pin_code = crypt(pin_code, gen_salt('bf'))
WHERE pin_code NOT LIKE '$2%';

-- 5. 익명 키로의 직접 쓰기 차단 — 이후 쓰기는 위 RPC로만 가능
DROP POLICY IF EXISTS "Anyone can create leagues" ON shared_leagues;
DROP POLICY IF EXISTS "Anyone can update with correct pin" ON shared_leagues;

-- ============================================
-- (선택) 코트예약 도우미 공유 테이블 — 아직 서버에 없어서 예약 공유가 동작하지 않음.
-- 예약 공유 기능을 쓰려면 아래도 함께 실행하세요.
-- ============================================

CREATE TABLE IF NOT EXISTS shared_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_code TEXT NOT NULL,
  bookings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE shared_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active bookings" ON shared_bookings;
CREATE POLICY "Anyone can view active bookings"
  ON shared_bookings FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can create bookings" ON shared_bookings;
CREATE POLICY "Anyone can create bookings"
  ON shared_bookings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update bookings" ON shared_bookings;
CREATE POLICY "Anyone can update bookings"
  ON shared_bookings FOR UPDATE
  USING (true);

DROP TRIGGER IF EXISTS set_shared_bookings_updated_at ON shared_bookings;
CREATE TRIGGER set_shared_bookings_updated_at
  BEFORE UPDATE ON shared_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE shared_bookings;

CREATE INDEX IF NOT EXISTS idx_shared_bookings_active ON shared_bookings (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_bookings_pin ON shared_bookings (pin_code) WHERE is_active = true;
