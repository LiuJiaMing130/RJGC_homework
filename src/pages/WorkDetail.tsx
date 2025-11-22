import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './WorkDetail.css';
import React from 'react';

interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  images: string[];
  price: number;
  likes_count: number;
  creator_id: string;
  creators: {
    username: string;
    avatar: string;
    bio: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  creators: {
    username: string;
    avatar: string;
  };
}

function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<Work | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (id) {
      loadWork();
      loadReviews();
      checkFavorite();
      checkLiked();
    }
  }, [id]);

  const loadWork = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*, creators(username, avatar, bio)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setWork(data);
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, creators(username, avatar)')
        .eq('work_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('加载评价失败:', error);
    }
  };

  const checkFavorite = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('work_id', id)
        .single();

      if (!error && data) {
        setIsFavorited(true);
      }
    } catch (error) {
      // 未收藏
    }
  };

  const checkLiked = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('work_id', id)
        .single();

      if (!error && data) {
        setHasLiked(true);
      }
    } catch (error) {
      // 未点赞
    }
  };

  const handleLike = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(savedUser);
      if (!user?.id || !work) {
        navigate('/login');
        return;
      }

      if (hasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('work_id', id);

        if (error) throw error;

        await supabase
          .from('works')
          .update({ likes_count: Math.max((work.likes_count || 0) - 1, 0) })
          .eq('id', work.id);

        setHasLiked(false);
        setWork((prev) =>
          prev
            ? { ...prev, likes_count: Math.max((prev.likes_count || 0) - 1, 0) }
            : prev
        );
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, work_id: id });

        if (error) throw error;

        await supabase
          .from('works')
          .update({ likes_count: (work.likes_count || 0) + 1 })
          .eq('id', work.id);

        setHasLiked(true);
        setWork((prev) =>
          prev ? { ...prev, likes_count: (prev.likes_count || 0) + 1 } : prev
        );
      }

      loadWork();
      checkLiked();
    } catch (error) {
      console.error('点赞操作失败:', error);
    }
  };
  const handleFavorite = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(savedUser);
      if (!user?.id) {
        navigate('/login');
        return;
      }

      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('work_id', id);
        setIsFavorited(false);
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, work_id: id });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return;
      const user = JSON.parse(savedUser);
      if (!user?.id) return;

      const { error } = await supabase
        .from('reviews')
        .insert({
          work_id: id,
          user_id: user.id,
          rating,
          comment,
        });

      if (error) throw error;

      setComment('');
      setRating(5);
      loadReviews();
    } catch (error) {
      console.error('提交评价失败:', error);
    }
  };

  if (loading) {
    return <div className="work-detail-container">加载中...</div>;
  }

  if (!work) {
    return <div className="work-detail-container">作品不存在</div>;
  }

  const images = work.images && Array.isArray(work.images) ? work.images : [];

  return (
    <div className="work-detail-container">
      <button onClick={() => navigate(-1)} className="back-button">
        ← 返回
      </button>

      <div className="work-detail-content">
        <div className="work-images">
          <img
            src={work.cover_image || 'https://via.placeholder.com/600x400'}
            alt={work.title}
            className="main-image"
          />
          {images.length > 0 && (
            <div className="image-gallery">
              {images.map((img, idx) => (
                <img key={idx} src={img} alt={`${work.title} ${idx + 1}`} />
              ))}
            </div>
          )}
        </div>

        <div className="work-details">
          <h1 className="work-detail-title">{work.title}</h1>
          <p className="work-category-badge">{work.category}</p>
          <p className="work-description">{work.description}</p>

          <div className="work-price-section">
            <span className="work-price-large">
              {work.price ? `¥${work.price}` : '免费'}
            </span>
          </div>

          <div className="work-actions">
            <button
              className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
              onClick={handleFavorite}
            >
              {isFavorited ? '❤️ 已收藏' : '🤍 收藏'}
            </button>
            <button
              className={`like-btn ${hasLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              {hasLiked ? '❤️ 取消点赞 ' : '🤍 点赞 '} {work.likes_count}
            </button>
          </div>

          <Link to={`/creator/${work.creator_id}`} className="creator-link">
            {work.creators?.avatar && (
              <img
                src={work.creators.avatar}
                alt={work.creators.username}
                className="creator-avatar-large"
              />
            )}
            <div>
              <div className="creator-name">{work.creators?.username}</div>
              <div className="creator-bio">{work.creators?.bio || '暂无简介'}</div>
            </div>
          </Link>

          <div className="reviews-section">
            <h2>评价 ({reviews.length})</h2>

            <form onSubmit={handleSubmitReview} className="review-form">
              <div className="rating-input">
                <label>评分：</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} 星</option>
                  ))}
                </select>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写下你的评价..."
                className="review-textarea"
                rows={4}
              />
              <button type="submit" className="submit-review-btn">提交评价</button>
            </form>

            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    {review.creators?.avatar && (
                      <img
                        src={review.creators.avatar}
                        alt={review.creators.username}
                        className="review-avatar"
                      />
                    )}
                    <div>
                      <div className="review-author">{review.creators?.username}</div>
                      <div className="review-rating">
                        {'⭐'.repeat(review.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                  <div className="review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkDetail;

