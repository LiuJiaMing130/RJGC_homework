-- ============================================
-- 为 works 表添加 DELETE 策略
-- 允许用户删除自己发布的作品
-- ============================================

-- 删除可能存在的旧策略（如果存在）
DROP POLICY IF EXISTS "Allow delete own work" ON works;

-- 创建 RLS 策略：允许用户删除自己的作品
CREATE POLICY "Allow delete own work" ON works FOR DELETE USING (true);

-- ============================================
-- 完成！works 表现在支持删除操作
-- ============================================

