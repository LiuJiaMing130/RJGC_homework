import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { optimizeImageUrl, preloadImage } from '../utils/imageOptimizer';
import './Workshops.css';

interface Workshop {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  cover_image: string;
  signup_url: string;
}

interface SignupFormData {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

interface WorkshopsProps {
  user: any;
}

// 工作坊数据缓存
let workshopsCache: {
  data: Workshop[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 1000; // 30秒缓存

function Workshops({ user }: WorkshopsProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [currentWorkshop, setCurrentWorkshop] = useState<Workshop | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadWorkshops();
  }, []);

  // 预加载工作坊封面图
  const preloadWorkshopImages = (workshopsData: Workshop[]) => {
    if (!workshopsData || workshopsData.length === 0) return;
    
    // 优先预加载前6张封面图（高优先级）
    workshopsData.slice(0, 6).forEach((workshop) => {
      if (!workshop.cover_image) return;
      const optimizedUrl = optimizeImageUrl(workshop.cover_image, 400, 85);
      preloadImage(optimizedUrl, 'high').then(() => {
        setLoadedImages((prev) => new Set([...prev, workshop.cover_image]));
      }).catch(() => {});
    });

    // 预加载其余封面图（低优先级）
    workshopsData.slice(6).forEach((workshop) => {
      if (!workshop.cover_image) return;
      const optimizedUrl = optimizeImageUrl(workshop.cover_image, 400, 85);
      preloadImage(optimizedUrl, 'low').then(() => {
        setLoadedImages((prev) => new Set([...prev, workshop.cover_image]));
      }).catch(() => {});
    });
  };

  const handleImageLoad = (src: string) => {
    setLoadedImages((prev) => new Set([...prev, src]));
  };

  const loadWorkshops = async () => {
    // 检查缓存
    const cached = workshopsCache;
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setWorkshops(cached.data);
      // 即使使用缓存，也要预加载图片
      preloadWorkshopImages(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .order('date', { ascending: true })
        .limit(50); // 限制加载数量，提高性能

      if (error) throw error;
      const workshopsData = data || [];
      setWorkshops(workshopsData);
      
      // 更新缓存
      workshopsCache = {
        data: workshopsData,
        timestamp: now
      };
      
      // 预加载图片
      preloadWorkshopImages(workshopsData);
    } catch (error) {
      console.error('加载工作坊失败:', error);
    } finally {
      setLoading(false);
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

  const handleSignupClick = (workshop: Workshop) => {
    setCurrentWorkshop(workshop);
    setShowSignupModal(true);
    setFormData({ name: '', phone: '', email: '', notes: '' });
    setShowSuccess(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !currentWorkshop) return;

    setSubmitting(true);
    setError(null);

    try {
      // 检查是否已经报名过
      const { data: existing } = await supabase
        .from('workshop_registrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('workshop_id', currentWorkshop.id)
        .maybeSingle();

      if (existing) {
        setError('您已经报名过这个活动了');
        setSubmitting(false);
        return;
      }

      // 保存报名信息
      const { error: insertError } = await supabase
        .from('workshop_registrations')
        .insert({
          user_id: user.id,
          workshop_id: currentWorkshop.id,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          notes: formData.notes.trim() || null,
        });

      if (insertError) throw insertError;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSignupModal(false);
        setShowSuccess(false);
        setFormData({ name: '', phone: '', email: '', notes: '' });
      }, 2000);
    } catch (err: any) {
      console.error('报名失败:', err);
      setError(err.message || '报名失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const closeModal = () => {
    setShowSignupModal(false);
    setShowSuccess(false);
    setFormData({ name: '', phone: '', email: '', notes: '' });
  };

  if (loading) {
    return (
      <div className="workshops-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="workshops-container">
      <div className="workshops-header">
        <h1 className="workshops-title">工作坊 & 活动</h1>
        <p className="workshops-subtitle">参加线下活动，学习新技能</p>
      </div>

      {workshops.length === 0 ? (
        <div className="empty-workshops">
          <p>暂无活动，敬请期待</p>
        </div>
      ) : (
        <div className="workshops-grid">
          {workshops.map((workshop, index) => (
            <div
              key={workshop.id}
              className="workshop-card fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="workshop-image-container">
                {!loadedImages.has(workshop.cover_image) && workshop.cover_image && (
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
                  src={workshop.cover_image ? optimizeImageUrl(workshop.cover_image, 400, 85) : 'https://placehold.co/400x250/e6f2ff/4d9dff?text=CraftHub'}
                  alt={workshop.title}
                  className={`workshop-image ${loadedImages.has(workshop.cover_image) ? 'loaded' : ''}`}
                  loading={index < 6 ? "eager" : "lazy"}
                  onLoad={() => workshop.cover_image && handleImageLoad(workshop.cover_image)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://placehold.co/400x250/e6f2ff/4d9dff?text=CraftHub';
                  }}
                  style={{
                    opacity: loadedImages.has(workshop.cover_image) ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                />
                <div className="workshop-date-badge">
                  {formatDate(workshop.date)}
                </div>
              </div>
              <div className="workshop-info">
                <h2 className="workshop-title">{workshop.title}</h2>
                <p className="workshop-description">{workshop.description}</p>
                {workshop.location && (
                  <div className="workshop-location">
                    📍 {workshop.location}
                  </div>
                )}
                <button
                  className="workshop-signup-btn"
                  onClick={() => handleSignupClick(workshop)}
                >
                  立即报名 →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 报名表单弹窗 */}
      {showSignupModal && createPortal(
        <div className="signup-modal-overlay" onClick={closeModal}>
          <div className="signup-modal-content" onClick={(e) => e.stopPropagation()}>
            {showSuccess ? (
              <div className="signup-success">
                <div className="success-icon">✓</div>
                <h2>报名成功！</h2>
                <p>我们已收到您的报名信息，请等待工作人员联系。</p>
                <button className="success-close-btn" onClick={closeModal}>
                  确定
                </button>
              </div>
            ) : (
              <>
                <div className="signup-modal-header">
                  <h2>报名信息</h2>
                  <button className="signup-modal-close" onClick={closeModal}>×</button>
                </div>
                <div className="signup-modal-body">
                  {currentWorkshop && (
                    <div className="workshop-info-preview">
                      <h3>{currentWorkshop.title}</h3>
                      <p className="workshop-date-preview">
                        📅 {formatDate(currentWorkshop.date)}
                      </p>
                      {currentWorkshop.location && (
                        <p className="workshop-location-preview">
                          📍 {currentWorkshop.location}
                        </p>
                      )}
                    </div>
                  )}
                  {error && (
                    <div className="error-message" style={{ 
                      padding: '0.75rem', 
                      background: '#fee', 
                      color: '#c33', 
                      borderRadius: '8px', 
                      marginBottom: '1rem' 
                    }}>
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleFormSubmit} className="signup-form">
                    <div className="form-group">
                      <label htmlFor="name">姓名 *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="请输入您的姓名"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">联系电话 *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="请输入您的联系电话"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">邮箱</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="请输入您的邮箱（选填）"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="notes">备注</label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="其他需要说明的信息（选填）"
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" className="cancel-btn" onClick={closeModal} disabled={submitting}>
                        取消
                      </button>
                      <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? '提交中...' : '确定报名'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Workshops;

