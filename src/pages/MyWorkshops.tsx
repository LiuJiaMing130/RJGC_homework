import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { optimizeImageUrl, preloadImage } from '../utils/imageOptimizer';
import './MyWorkshops.css';

interface MyWorkshopsProps {
  user: any;
}

interface WorkshopRegistration {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  workshop: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    cover_image: string;
  };
}

// 报名数据缓存（按用户ID）
const registrationsCache: Record<string, {
  data: WorkshopRegistration[];
  timestamp: number;
}> = {};

const CACHE_DURATION = 30 * 1000; // 30秒缓存

function MyWorkshops({ user }: MyWorkshopsProps) {
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadRegistrations();
    }
  }, [user?.id]);

  // 预加载工作坊封面图
  const preloadWorkshopImages = (registrationsData: WorkshopRegistration[]) => {
    if (!registrationsData || registrationsData.length === 0) return;
    
    registrationsData.forEach((registration) => {
      if (!registration.workshop?.cover_image) return;
      const optimizedUrl = optimizeImageUrl(registration.workshop.cover_image, 400, 85);
      preloadImage(optimizedUrl, 'high').then(() => {
        setLoadedImages((prev) => new Set([...prev, registration.workshop.cover_image]));
      }).catch(() => {});
    });
  };

  const handleImageLoad = (src: string) => {
    setLoadedImages((prev) => new Set([...prev, src]));
  };

  const loadRegistrations = async () => {
    if (!user?.id) return;
    
    // 检查缓存
    const cacheKey = user.id;
    const cached = registrationsCache[cacheKey];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setRegistrations(cached.data);
      // 即使使用缓存，也要预加载图片
      preloadWorkshopImages(cached.data);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workshop_registrations')
        .select(`
          id,
          name,
          phone,
          email,
          notes,
          created_at,
          workshop:workshops (
            id,
            title,
            description,
            date,
            location,
            cover_image
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // 限制加载数量，提高性能

      if (error) throw error;
      const registrationsData = (data || []) as WorkshopRegistration[];
      setRegistrations(registrationsData);
      
      // 更新缓存
      registrationsCache[cacheKey] = {
        data: registrationsData,
        timestamp: now
      };
      
      // 预加载图片
      preloadWorkshopImages(registrationsData);
    } catch (error) {
      console.error('加载报名信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (registrationId: string, workshopTitle: string) => {
    if (!confirm(`确定要取消报名"${workshopTitle}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workshop_registrations')
        .delete()
        .eq('id', registrationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // 清除缓存，强制重新加载
      if (user?.id) {
        delete registrationsCache[user.id];
      }
      
      // 重新加载报名列表
      loadRegistrations();
    } catch (error) {
      console.error('取消报名失败:', error);
      alert('取消报名失败，请稍后重试');
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
      <div className="my-workshops-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="my-workshops-container">
      <div className="my-workshops-header">
        <h1 className="my-workshops-title">我已报名的活动</h1>
        <p className="my-workshops-subtitle">查看您已报名的所有工作坊和活动</p>
      </div>

      {registrations.length === 0 ? (
        <div className="empty-registrations">
          <div className="empty-icon">📅</div>
          <p>您还没有报名任何活动</p>
          <Link to="/workshops" className="empty-link">
            去浏览活动 →
          </Link>
        </div>
      ) : (
        <div className="registrations-grid">
          {registrations.map((registration) => (
            <div key={registration.id} className="registration-card">
              <div className="registration-image-container">
                {!loadedImages.has(registration.workshop.cover_image) && registration.workshop.cover_image && (
                  <div className="image-placeholder" style={{
                    width: '100%',
                    height: '250px',
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px 8px 0 0'
                  }}>
                    <div className="placeholder-spinner" style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #e0e0e0',
                      borderTop: '3px solid #4d9dff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  </div>
                )}
                <img
                  src={registration.workshop.cover_image ? optimizeImageUrl(registration.workshop.cover_image, 400, 85) : 'https://placehold.co/400x250/e6f2ff/4d9dff?text=CraftHub'}
                  alt={registration.workshop.title}
                  className={`registration-image ${loadedImages.has(registration.workshop.cover_image) ? 'loaded' : ''}`}
                  loading="eager"
                  onLoad={() => registration.workshop.cover_image && handleImageLoad(registration.workshop.cover_image)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://placehold.co/400x250/e6f2ff/4d9dff?text=CraftHub';
                  }}
                  style={{
                    opacity: loadedImages.has(registration.workshop.cover_image) ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                />
                <div className="registration-date-badge">
                  {formatDate(registration.workshop.date)}
                </div>
              </div>
              <div className="registration-info">
                <h2 className="registration-title">{registration.workshop.title}</h2>
                <p className="registration-description">{registration.workshop.description}</p>
                {registration.workshop.location && (
                  <div className="registration-location">
                    📍 {registration.workshop.location}
                  </div>
                )}
                <div className="registration-details">
                  <div className="detail-item">
                    <span className="detail-label">报名姓名：</span>
                    <span className="detail-value">{registration.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">联系电话：</span>
                    <span className="detail-value">{registration.phone}</span>
                  </div>
                  {registration.email && (
                    <div className="detail-item">
                      <span className="detail-label">邮箱：</span>
                      <span className="detail-value">{registration.email}</span>
                    </div>
                  )}
                  {registration.notes && (
                    <div className="detail-item">
                      <span className="detail-label">备注：</span>
                      <span className="detail-value">{registration.notes}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">报名时间：</span>
                    <span className="detail-value">{formatDate(registration.created_at)}</span>
                  </div>
                </div>
                <div className="registration-actions">
                  <button
                    className="action-button cancel-button"
                    onClick={() => handleCancel(registration.id, registration.workshop.title)}
                  >
                    取消报名
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

export default MyWorkshops;

