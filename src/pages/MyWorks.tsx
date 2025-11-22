import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './MyWorks.css';

interface MyWorksProps {
  user: any;
}

interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  price: number | null;
  likes_count: number;
  created_at: string;
}

function MyWorks({ user }: MyWorksProps) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadWorks();
    }
  }, [user?.id]);

  const loadWorks = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, title, description, category, cover_image, price, likes_count, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workId: string, workTitle: string) => {
    if (!confirm(`确定要删除作品"${workTitle}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', workId)
        .eq('creator_id', user.id);

      if (error) throw error;
      
      // 重新加载作品列表
      loadWorks();
    } catch (error) {
      console.error('删除作品失败:', error);
      alert('删除作品失败，请稍后重试');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="my-works-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="my-works-container">
      <div className="my-works-header">
        <h1 className="my-works-title">我发布的作品</h1>
        <p className="my-works-subtitle">管理您发布的所有作品</p>
        <Link to="/publish" className="publish-button">
          + 发布新作品
        </Link>
      </div>

      {works.length === 0 ? (
        <div className="empty-works">
          <div className="empty-icon">🎨</div>
          <p>您还没有发布任何作品</p>
          <Link to="/publish" className="empty-link">
            去发布作品 →
          </Link>
        </div>
      ) : (
        <div className="works-grid">
          {works.map((work) => (
            <div key={work.id} className="work-card">
              <Link to={`/work/${work.id}`} className="work-image-link">
                <div className="work-image-container">
                  <img
                    src={work.cover_image || 'https://placehold.co/400x250/e6f2ff/4d9dff?text=CraftHub'}
                    alt={work.title}
                    className="work-image"
                  />
                  <div className="work-category-badge">{work.category}</div>
                </div>
              </Link>
              <div className="work-info">
                <Link to={`/work/${work.id}`} className="work-title-link">
                  <h2 className="work-title">{work.title}</h2>
                </Link>
                {work.description && (
                  <p className="work-description">
                    {work.description.length > 100 
                      ? `${work.description.substring(0, 100)}...` 
                      : work.description}
                  </p>
                )}
                <div className="work-meta">
                  <div className="work-price">
                    {work.price ? `¥${work.price}` : '免费'}
                  </div>
                  <div className="work-likes">
                    ❤️ {work.likes_count || 0}
                  </div>
                </div>
                <div className="work-date">
                  发布于 {formatDate(work.created_at)}
                </div>
                <div className="work-actions">
                  <button
                    className="action-button edit-button"
                    onClick={() => navigate(`/work/${work.id}`)}
                  >
                    查看详情
                  </button>
                  <button
                    className="action-button delete-button"
                    onClick={() => handleDelete(work.id, work.title)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyWorks;

