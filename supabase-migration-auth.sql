-- 러브포티 테니스 리그 - 회원제 전환 마이그레이션 (v2)
-- Supabase SQL Editor에서 실행하세요.
--
-- 구조 변경: PIN 공유 방식 → 로그인 회원제
--   - 열람: 로그인한 회원(member/admin)만
--   - 쓰기: 관리자(admin)만
--   - 계정은 관리자가 대시보드(Authentication → Add user)에서 발급
--
-- ⚠️ 실행 순서: 새 앱 코드(로그인 화면 포함)를 배포한 "후"에 실행하세요.
-- ⚠️ 이전에 만든 supabase-migration-security.sql(PIN 해시 RPC)은 실행하지 마세요. 이 파일이 대체합니다.

-- ============================================
-- 1. 회원 프로필 + 역할
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  player_id TEXT,  -- 앱 내 선수 id와 연결 (선택)
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 역할 확인 헬퍼 (SECURITY DEFINER: profiles RLS 재귀 방지)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "read own or admin" ON profiles;
CREATE POLICY "read own or admin" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "admin insert profiles" ON profiles;
CREATE POLICY "admin insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin update profiles" ON profiles;
CREATE POLICY "admin update profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin());

-- 새 계정 생성 시 프로필 자동 생성 (기본 role: member)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), ''),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 기존에 만든 계정이 있다면 프로필 소급 생성 (이메일 없는 계정은 빈 이름)
INSERT INTO profiles (id, name, role)
SELECT u.id, COALESCE(split_part(u.email, '@', 1), ''), 'member'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. shared_leagues 권한 재설계 (폐쇄형)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view active leagues" ON shared_leagues;
DROP POLICY IF EXISTS "Anyone can create leagues" ON shared_leagues;
DROP POLICY IF EXISTS "Anyone can update with correct pin" ON shared_leagues;

CREATE POLICY "members view active leagues" ON shared_leagues
  FOR SELECT TO authenticated
  USING (is_active = true OR is_admin());

CREATE POLICY "admin insert leagues" ON shared_leagues
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin update leagues" ON shared_leagues
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "admin delete leagues" ON shared_leagues
  FOR DELETE TO authenticated
  USING (is_admin());

-- PIN은 더 이상 사용하지 않음
ALTER TABLE shared_leagues ALTER COLUMN pin_code DROP NOT NULL;

-- 이전 PIN RPC가 만들어져 있다면 폐기
DROP FUNCTION IF EXISTS publish_shared_league(TEXT, TEXT, JSONB, JSONB, TEXT);
DROP FUNCTION IF EXISTS sync_shared_league(UUID, TEXT, TEXT, JSONB, JSONB, TEXT);
DROP FUNCTION IF EXISTS unpublish_shared_league(UUID, TEXT);

-- ============================================
-- 3. 관리자 지정 (계정 발급 후 이메일을 바꿔서 실행)
-- ============================================

-- UPDATE profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@loveforty.kr');
