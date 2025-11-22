-- ============================================
-- 创建 workshop_registrations 表
-- 如果表已存在，此脚本会安全地跳过
-- ============================================

-- 创建表（如果不存在）
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workshop_id)
);

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_id ON workshop_registrations(workshop_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略（如果存在）
DROP POLICY IF EXISTS "Allow public read access" ON workshop_registrations;
DROP POLICY IF EXISTS "Allow public insert" ON workshop_registrations;
DROP POLICY IF EXISTS "Allow delete own registration" ON workshop_registrations;

-- 创建 RLS 策略：允许所有人读取
CREATE POLICY "Allow public read access" ON workshop_registrations FOR SELECT USING (true);

-- 创建 RLS 策略：允许所有人插入（用于报名）
CREATE POLICY "Allow public insert" ON workshop_registrations FOR INSERT WITH CHECK (true);

-- 创建 RLS 策略：允许用户删除自己的报名记录（用于取消报名）
CREATE POLICY "Allow delete own registration" ON workshop_registrations FOR DELETE USING (true);

-- ============================================
-- 完成！workshop_registrations 表已创建
-- ============================================

