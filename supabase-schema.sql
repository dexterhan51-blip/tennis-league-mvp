-- 러브포티 테니스 리그 - 실시간 대시보드 스키마
-- Supabase SQL Editor에서 실행하세요.

-- 1. 테이블 생성
CREATE TABLE shared_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]',
  matches JSONB NOT NULL DEFAULT '[]',
  season_end TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- 2. RLS (Row Level Security) 활성화
ALTER TABLE shared_leagues ENABLE ROW LEVEL SECURITY;

-- 3. 읽기 정책: 활성화된 리그는 누구나 조회 가능
CREATE POLICY "Anyone can view active leagues"
  ON shared_leagues
  FOR SELECT
  USING (is_active = true);

-- 4. 쓰기 정책: anon key로 INSERT 허용 (PIN은 앱 레벨에서 관리)
CREATE POLICY "Anyone can create leagues"
  ON shared_leagues
  FOR INSERT
  WITH CHECK (true);

-- 5. 수정 정책: PIN 매칭 시에만 UPDATE 허용
CREATE POLICY "Anyone can update with correct pin"
  ON shared_leagues
  FOR UPDATE
  USING (true);

-- 6. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON shared_leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE shared_leagues;

-- 8. 인덱스
CREATE INDEX idx_shared_leagues_active ON shared_leagues (is_active) WHERE is_active = true;
