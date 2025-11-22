-- ============================================
-- CraftHub 数据库完整重置脚本
-- 警告：这会删除所有现有数据！
-- ============================================

-- 第一步：删除所有现有表（按依赖关系顺序）
DROP TABLE IF EXISTS workshop_registrations CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS works CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS creator_profiles CASCADE;
DROP TABLE IF EXISTS creators CASCADE;

-- 删除触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 注意：使用 CASCADE 删除表时，相关的策略会自动删除，无需手动删除

-- ============================================
-- 第二步：创建新表结构（修复版）
-- ============================================

-- 1. 用户/创作者表
-- 注意：id 使用 UUID，不再引用 auth.users
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- 存储密码（建议使用哈希，但按需求存储明文）
  avatar TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  works_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1 创作者扩展资料表
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID UNIQUE REFERENCES creators(id) ON DELETE CASCADE,
  banner_image TEXT,
  location TEXT,
  website TEXT,
  instagram TEXT,
  wechat TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 作品表
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 陶艺、绘画、编织、木工等
  cover_image TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb, -- 作品图片数组
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  price DECIMAL(10, 2),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 收藏表
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, work_id)
);

-- 4. 点赞表（每个用户对每个作品只能点赞一次）
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, work_id)
);

-- 5. 评价表
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  user_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.1 关注表（用户关注创作者）
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES creators(id) ON DELETE CASCADE, -- 关注者
  following_id UUID REFERENCES creators(id) ON DELETE CASCADE, -- 被关注者
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- 不能关注自己
);

-- 6. 活动/工作坊表
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  cover_image TEXT,
  signup_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 工作坊报名表
CREATE TABLE workshop_registrations (
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

-- ============================================
-- 第三步：创建索引以提高查询性能
-- ============================================
CREATE INDEX idx_works_creator_id ON works(creator_id);
CREATE INDEX idx_works_category ON works(category);
CREATE INDEX idx_works_created_at ON works(created_at DESC);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_work_id ON favorites(work_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_work_id ON likes(work_id);
CREATE INDEX idx_reviews_work_id ON reviews(work_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_creator_profiles_creator_id ON creator_profiles(creator_id);
CREATE INDEX idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX idx_workshop_registrations_workshop_id ON workshop_registrations(workshop_id);

-- ============================================
-- 第四步：启用 Row Level Security (RLS)
-- ============================================
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 第五步：创建 RLS 策略
-- ============================================

-- RLS 策略：允许所有人读取
CREATE POLICY "Allow public read access" ON creators FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON creator_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON works FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON likes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON follows FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON workshops FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON workshop_registrations FOR SELECT USING (true);

-- RLS 策略：允许所有人插入（用于注册和创建）
CREATE POLICY "Allow public insert" ON creators FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON creator_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON works FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON workshop_registrations FOR INSERT WITH CHECK (true);

-- RLS 策略：允许所有人更新自己的数据
CREATE POLICY "Allow update own data" ON creators FOR UPDATE USING (true);
CREATE POLICY "Allow update own profile" ON creator_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow update own data" ON works FOR UPDATE USING (true);

-- RLS 策略：允许删除自己的数据
CREATE POLICY "Allow delete own data" ON favorites FOR DELETE USING (true);
CREATE POLICY "Allow delete own work" ON works FOR DELETE USING (true);
CREATE POLICY "Allow delete own follow" ON follows FOR DELETE USING (true);

-- ============================================
-- 第六步：触发器已移除（不再使用 Supabase Auth）
-- ============================================

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creator_profiles_updated_at
BEFORE UPDATE ON creator_profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 关注/取消关注时自动更新 followers_count
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

CREATE TRIGGER update_followers_on_follow
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION public.update_followers_count();

CREATE TRIGGER update_followers_on_unfollow
AFTER DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION public.update_followers_count();

-- ============================================
-- 完成！数据库已重置并创建新的表结构
-- ============================================

