# 注册失败问题排查指南

## 快速诊断步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页：

- **如果看到 "数据库表未创建"**：说明 `creators` 表不存在
  - 解决：在 Supabase SQL Editor 中执行 `reset_database.sql` 脚本

- **如果看到 "无法连接到 Supabase 服务器"**：说明网络或配置问题
  - 检查 `supabaseClient.ts` 中的 URL 和 Key 是否正确
  - 检查网络连接

- **如果看到其他错误**：查看完整的错误信息，通常会有具体的错误代码和消息

### 2. 使用诊断工具

在浏览器控制台中运行：

```javascript
testSupabaseConnection()
```

这会自动检查：
- ✅ Supabase 连接是否正常
- ✅ Auth 服务是否可用
- ✅ 所有数据库表是否存在

### 3. 检查 Supabase Dashboard

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入你的项目
3. 检查以下内容：

   **Table Editor**：
   - 查看 `creators` 表是否存在
   - 如果不存在，需要执行 SQL 脚本

   **SQL Editor**：
   - 执行 `reset_database.sql` 脚本创建所有表

   **Authentication > Settings**：
   - 检查 "Enable email confirmations" 是否开启
   - 如果开启，用户需要验证邮箱才能登录
   - 建议开发时关闭此选项

   **Settings > API**：
   - 确认 URL 和 anon key 与 `supabaseClient.ts` 中的一致

## 常见错误及解决方案

### 错误 1: "relation 'creators' does not exist"

**原因**：数据库表未创建

**解决**：
1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `reset_database.sql` 的全部内容
4. 粘贴并执行

### 错误 2: "Failed to fetch" 或网络错误

**原因**：
- Supabase URL 或 Key 配置错误
- 网络连接问题
- CORS 问题

**解决**：
1. 检查 `supabaseClient.ts` 中的配置
2. 在 Supabase Dashboard > Settings > API 中确认 URL 和 anon key
3. 检查浏览器网络标签页，查看具体的请求错误

### 错误 3: "User already registered"

**原因**：该邮箱已被注册

**解决**：
- 直接使用该邮箱登录
- 或使用其他邮箱注册
- 或在 Supabase Dashboard > Authentication > Users 中删除该用户

### 错误 4: "Email not confirmed"

**原因**：启用了邮箱验证，但用户未验证邮箱

**解决**：
1. 检查邮箱（包括垃圾邮件文件夹）是否有验证邮件
2. 点击验证链接
3. 或在 Supabase Dashboard > Authentication > Users 中手动确认用户
4. 开发时建议关闭邮箱验证：Authentication > Settings > Enable email confirmations

### 错误 5: "Password should be at least 6 characters"

**原因**：密码太短

**解决**：使用至少 6 位字符的密码

### 错误 6: "Email signups are disabled" (email_provider_disabled)

**原因**：Supabase 项目中的邮箱注册功能被禁用

**解决**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入你的项目
3. 点击左侧菜单 **Authentication**
4. 点击 **Providers** 标签页
5. 找到 **Email** 提供者
6. 确保 **Enable Email provider** 开关是**开启**状态
7. 如果关闭，点击开关启用它
8. 保存设置
9. 重新尝试注册

**注意**：如果测试连接正常但注册失败，通常是这个配置问题。

## 验证步骤

注册成功后，应该：

1. ✅ 在 Supabase Dashboard > Authentication > Users 中看到新用户
2. ✅ 在 Table Editor > creators 中看到对应的创作者记录
3. ✅ 浏览器控制台显示 "注册成功"
4. ✅ 如果邮箱验证关闭，应该自动登录

## 获取帮助

如果问题仍然存在，请提供：

1. 浏览器控制台的完整错误信息（截图或复制文本）
2. 运行 `testSupabaseConnection()` 的输出结果
3. Supabase Dashboard 中：
   - Authentication > Users 的用户列表
   - Table Editor 中 `creators` 表的内容（如果有）
   - Logs 中的错误信息

