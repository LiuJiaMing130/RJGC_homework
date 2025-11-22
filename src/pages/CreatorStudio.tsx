import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './CreatorStudio.css';

interface Creator {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  followers_count: number;
  works_count: number;
}

interface Work {
  id: string;
  title: string;
  cover_image: string;
  category: string;
  price: number;
  likes_count: number;
}

function CreatorStudio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 从 localStorage 获取当前用户
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('恢复用户信息失败:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadCreator();
      loadWorks();
      if (currentUser?.id) {
        checkFollowStatus();
      }
    }
  }, [id, currentUser?.id]);

  const loadCreator = async () => {
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCreator(data);
    } catch (error) {
      console.error('加载创作者失败:', error);
    }
  };

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('creator_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser?.id || !id || currentUser.id === id) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', id)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('检查关注状态失败:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.id) {
      navigate('/login');
      return;
    }

    if (currentUser.id === id) {
      alert('不能关注自己');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // 取消关注
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // 关注
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: id,
          });

        if (error) throw error;
        setIsFollowing(true);
      }
      
      // 重新加载创作者信息以更新粉丝数
      await loadCreator();
    } catch (error: any) {
      console.error('关注操作失败:', error);
      if (error.code === '23505') {
        alert('已经关注过该创作者');
      } else {
        alert('操作失败，请重试');
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return <div className="creator-studio-container">加载中...</div>;
  }

  if (!creator) {
    return <div className="creator-studio-container">创作者不存在</div>;
  }

  return (
    <div className="creator-studio-container">
      <div className="creator-header">
        <img
          src={creator.avatar || 'https://placehold.co/150x150/e6f2ff/4d9dff?text=U'}
          alt={creator.username}
          className="creator-avatar-hero"
        />
        <div className="creator-info">
          <h1 className="creator-name-hero">{creator.username}</h1>
          <p className="creator-bio-hero">{creator.bio || '暂无简介'}</p>
          <div className="creator-stats">
            <div className="stat-item">
              <span className="stat-number">{creator.works_count || 0}</span>
              <span className="stat-label">作品</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{creator.followers_count || 0}</span>
              <span className="stat-label">粉丝</span>
            </div>
          </div>
          {currentUser?.id && currentUser.id !== id && (
            <button
              className={`follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? '处理中...' : isFollowing ? '✓ 已关注' : '+ 关注'}
            </button>
          )}
          <div className="social-links">
            <a href="#" className="social-link" aria-label="社交媒体链接">
              <span>📱</span>
            </a>
            <a href="#" className="social-link" aria-label="网站链接">
              <span>🌐</span>
            </a>
            <a href="#" className="social-link" aria-label="邮箱链接">
              <span>✉️</span>
            </a>
          </div>
        </div>
      </div>

      <div className="works-section">
        <h2 className="section-title">作品集 ({works.length})</h2>
        {works.length === 0 ? (
          <div className="empty-works">暂无作品</div>
        ) : (
          <div className="works-grid">
            {works.map((work, index) => (
              <Link
                key={work.id}
                to={`/work/${work.id}`}
                className="work-card-link fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="work-card-mini">
                  <img
                    src={work.cover_image || 'https://placehold.co/300x200/e6f2ff/4d9dff?text=CraftHub'}
                    alt={work.title}
                    className="work-image-mini"
                    loading="lazy"
                  />
                  <div className="work-info-mini">
                    <h3 className="work-title-mini">{work.title}</h3>
                    <p className="work-category-mini">{work.category}</p>
                    <div className="work-meta-mini">
                      <span className="work-price-mini">
                        {work.price ? `¥${work.price}` : '免费'}
                      </span>
                      <span className="work-likes-mini">❤️ {work.likes_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreatorStudio;

