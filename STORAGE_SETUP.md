# Supabase Storage 设置说明

为了支持图片文件上传功能，需要在 Supabase 中创建一个 Storage bucket。

## 步骤

1. 登录 Supabase Dashboard：https://app.supabase.com
2. 选择你的项目
3. 在左侧菜单中找到 **Storage** 并点击
4. 点击 **New bucket** 按钮
5. 填写以下信息：
   - **Name**: `works`（必须使用这个名字）
   - **Public bucket**: ✅ 勾选（允许公开访问图片）
   - **File size limit**: 建议设置为 10MB 或更大
   - **Allowed MIME types**: 可以留空，或填写 `image/*` 来限制只能上传图片
6. 点击 **Create bucket**

## 设置存储策略（可选，但推荐）

为了安全，建议设置存储策略：

1. 在 Storage 页面，点击 **Policies** 标签
2. 找到 `works` bucket，点击 **New Policy**
3. 选择 **For full customization**，然后使用以下 SQL：

```sql
-- 允许所有人读取（因为图片需要公开显示）
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'works');

-- 允许已登录用户上传
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'works' 
  AND auth.role() = 'authenticated'
);

-- 允许用户删除自己上传的文件
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'works' 
  AND auth.role() = 'authenticated'
);
```

## 测试

设置完成后，在发布作品页面：
1. 点击"选择图片文件"按钮
2. 选择一张图片
3. 应该能看到预览
4. 发布作品时，图片会自动上传到 Supabase Storage

## 注意事项

- 如果上传失败，请检查：
  - Storage bucket 是否已创建
  - bucket 名称是否为 `works`
  - bucket 是否设置为公开
  - 网络连接是否正常

