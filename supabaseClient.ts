import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aebdlzqeqqjoiknbdkbo.supabase.co';
const supabaseAnonKey =
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

