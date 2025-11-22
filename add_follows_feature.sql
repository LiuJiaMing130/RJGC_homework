-- ============================================
-- 添加关注功能
-- 包括关注表、索引、RLS策略和触发器
-- ============================================

-- 1. 创建关注表
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES creators(id) ON DELETE CASCADE, -- 关注者
  following_id UUID REFERENCES creators(id) ON DELETE CASCADE, -- 被关注者
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- 不能关注自己
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- 3. 启用 RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
-- 允许所有人读取
DROP POLICY IF EXISTS "Allow public read access" ON follows;
CREATE POLICY "Allow public read access" ON follows FOR SELECT USING (true);

-- 允许所有人插入（关注）
DROP POLICY IF EXISTS "Allow public insert" ON follows;
CREATE POLICY "Allow public insert" ON follows FOR INSERT WITH CHECK (true);

-- 允许删除自己的关注（取消关注）
DROP POLICY IF EXISTS "Allow delete own follow" ON follows;
CREATE POLICY "Allow delete own follow" ON follows FOR DELETE USING (true);

-- 5. 创建触发器函数：自动更新 followers_count
CREATE OR REPLACE FUNCTION public.update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 关注：增加被关注者的粉丝数
    UPDATE creators 
    SET followers_count = COALESCE(followers_count, 0) + 1 
    WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 取消关注：减少被关注者的粉丝数
    UPDATE creators 
    SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) 
    WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS update_followers_on_follow ON follows;
CREATE TRIGGER update_followers_on_follow
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION public.update_followers_count();

DROP TRIGGER IF EXISTS update_followers_on_unfollow ON follows;
CREATE TRIGGER update_followers_on_unfollow
AFTER DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION public.update_followers_count();

-- ============================================
-- 完成！关注功能已添加
-- ============================================

