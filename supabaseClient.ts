import { createClient } from '@supabase/supabase-js';

// 优先使用环境变量，如果不存在则使用默认值（用于本地开发）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aebdlzqeqqjoiknbdkbo.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlYmRsenFlcXFqb2lrbmJka2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjQ4MzEsImV4cCI6MjA3ODk0MDgzMX0.cOGM83YTnYLemKuVBTGTsp4JhNv9vAC1Gelr4cDXH4A';

// 创建 Supabase 客户端，配置认证选项
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

