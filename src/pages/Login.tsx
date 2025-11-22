import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './Login.css';
import React from 'react';

interface LoginProps {
  setUser: (user: any) => void;
}

// 错误消息翻译函数
const translateError = (errorMessage: string): string => {
  const error = errorMessage.toLowerCase();
  
  if (error.includes('invalid') && error.includes('email')) {
    return '邮箱格式不正确，请检查后重试';
  }
  if (error.includes('password')) {
    if (error.includes('too short') || error.includes('at least')) {
      return '密码长度至少为6位';
    }
    if (error.includes('invalid') || error.includes('incorrect') || error.includes('wrong')) {
      return '密码错误，请重试';
    }
  }
  if (error.includes('user not found') || error.includes('user does not exist') || error.includes('no user found')) {
    return '该邮箱未注册，请先注册';
  }
  if (error.includes('already registered') || error.includes('already exists') || error.includes('user already registered')) {
    return '该邮箱已被注册，请直接登录';
  }
  if (error.includes('email not confirmed') || error.includes('email not verified')) {
    return '请先验证邮箱后再登录';
  }
  if (error.includes('invalid login credentials') || error.includes('invalid credentials')) {
    return '邮箱或密码错误，请检查后重试';
  }
  if (error.includes('network') || error.includes('fetch') || error.includes('failed to fetch')) {
    return '网络连接失败，请检查网络后重试';
  }
  if (error.includes('rate limit') || error.includes('too many requests')) {
    return '请求过于频繁，请稍后再试';
  }
  
  return '操作失败，请重试';
};

function Login({ setUser }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        // 注册：直接插入到 creators 表
        // 检查邮箱是否已存在
        const { data: existingUser } = await supabase
          .from('creators')
          .select('id, email')
          .eq('email', email)
          .single();

        if (existingUser) {
          throw new Error('该邮箱已被注册，请直接登录');
        }

        // 生成唯一的用户名（如果用户名已存在，添加随机后缀）
        let finalUsername = username || email.split('@')[0];
        let usernameAttempts = 0;
        let insertError = null;
        
        while (usernameAttempts < 5) {
          const { data: newCreator, error: error } = await supabase
            .from('creators')
            .insert({
              username: finalUsername,
              email: email,
              password: password, // 直接存储密码（按需求）
            })
            .select()
            .single();

          if (!error && newCreator) {
            console.log('注册成功，用户ID:', newCreator.id);
            // 注册成功后，显示成功消息并切换到登录模式
            setSuccess('注册成功！请使用邮箱和密码登录');
            // 清空用户名和密码，保留邮箱
            setUsername('');
            setPassword('');
            // 切换到登录模式
            setIsSignUp(false);
            return;
          }

          // 如果是用户名冲突，尝试添加后缀
          if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
            usernameAttempts++;
            finalUsername = `${username || email.split('@')[0]}_${Date.now()}`;
            insertError = error;
          } else {
            insertError = error;
            break;
          }
        }

        if (insertError) {
          console.error('注册错误详情:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            fullError: insertError
          });
          
          // 如果是因为表不存在，抛出错误
          if (insertError.message?.includes('does not exist') || 
              insertError.message?.includes('relation') ||
              insertError.code === '42P01') {
            throw new Error('数据库表未创建。请在 Supabase SQL Editor 中执行 reset_database.sql 脚本');
          }
          throw insertError;
        }
      } else {
        // 登录：从 creators 表查询验证
        const { data: userData, error: queryError } = await supabase
          .from('creators')
          .select('id, username, email, password, avatar, bio')
          .eq('email', email)
          .single();

        if (queryError) {
          console.error('登录错误详情:', {
            message: queryError.message,
            code: queryError.code,
            fullError: queryError
          });
          
          if (queryError.code === 'PGRST116') {
            // 未找到用户
            throw new Error('该邮箱未注册，请先注册');
          }
          throw queryError;
        }

        if (!userData) {
          throw new Error('该邮箱未注册，请先注册');
        }

        // 验证密码
        if (userData.password !== password) {
          throw new Error('密码错误，请重试');
        }

        // 登录成功
        console.log('登录成功，用户ID:', userData.id);
        setUser({
          id: userData.id,
          email: userData.email,
          username: userData.username,
          avatar: userData.avatar,
          bio: userData.bio,
        });
        setSuccess('登录成功！');
      }
    } catch (err: any) {
      // 记录完整的错误信息到控制台
      console.error('========== 操作错误详情 ==========');
      console.error('错误消息:', err.message);
      console.error('错误代码:', err.code);
      console.error('完整错误对象:', err);
      console.error('==================================');
      
      // 提取更详细的错误信息
      let errorMsg = err.message || '操作失败，请重试';
      
      // 检查是否是数据库连接或表不存在的问题
      if (err.message?.includes('does not exist') || 
          err.message?.includes('relation') ||
          err.code === '42P01' ||
          err.message?.includes('reset_database') ||
          err.message?.includes('数据库表未创建')) {
        errorMsg = '数据库表未创建。请在 Supabase SQL Editor 中执行 reset_database.sql 脚本';
      }
      
      // 检查是否是网络连接问题
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('NetworkError') ||
          err.message?.includes('network') ||
          err.message?.includes('无法连接') ||
          (!err.status && !err.code)) {
        errorMsg = '无法连接到 Supabase 服务器。请检查网络连接和 Supabase 配置（URL 和 Key）';
      }
      
      // 显示错误消息
      setError(translateError(errorMsg));
      setSuccess(''); // 清除成功消息
    } finally {
      setLoading(false);
    }
  };

  // 自动关闭弹框
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // 动态粒子生成函数
  const createParticles = () => {
    const particles = [];
    const particleCount = 30; // 粒子数量

    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 10 + 2; // 随机大小 2-12px
      const posX = Math.random() * 100; // 随机水平位置 (百分比)
      const delay = Math.random() * 5; // 随机延迟
      const duration = Math.random() * 10 + 10; // 随机持续时间 10-20s
      const hue = Math.floor(Math.random() * 40) + 200; // 蓝色系色调

      particles.push(
        <div
          key={i}
          className="particle"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${posX}%`,
            bottom: '-20px',
            background: `hsla(${hue}, 70%, 60%, 0.3)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }

    return particles;
  };

  return (
    <div className="login-container">
      {/* 动态粒子背景 */}
      <div className="particles">
        {createParticles()}
      </div>

      {/* 装饰性元素 */}
      <div className="login-decor login-decor-1"></div>
      <div className="login-decor login-decor-2"></div>

      {/* 错误弹框 */}
      {error && (
        <div className="alert-modal error-modal">
          <div className="alert-content">
            <div className="alert-icon">⚠️</div>
            <div className="alert-message">{error}</div>
            <button
              className="alert-close"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 成功弹框 */}
      {success && (
        <div className="alert-modal success-modal">
          <div className="alert-content">
            <div className="alert-icon">✓</div>
            <div className="alert-message">{success}</div>
            <button
              className="alert-close"
              onClick={() => setSuccess('')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="login-card">
        <h1 className="login-title">🎨 CraftHub</h1>
        <p className="login-subtitle">创意市集 - 发现你的创作灵感</p>

        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="login-input-group">
              <label className="login-label">用户名：</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                required
                disabled={loading}
              />
            </div>
          )}
          <div className="login-input-group">
            <label className="login-label">邮箱：</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
              disabled={loading}
            />
          </div>
          <div className="login-input-group">
            <label className="login-label">密码：</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <span className="button-spinner"></span>
                <span>处理中...</span>
              </>
            ) : (
              <span>{isSignUp ? '注册' : '登录'}</span>
            )}
          </button>
        </form>

        <div className="login-switch">
          <span>{isSignUp ? '已有账号？' : '还没有账号？'}</span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            className="switch-button"
            disabled={loading}
          >
            {isSignUp ? '登录' : '注册'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

