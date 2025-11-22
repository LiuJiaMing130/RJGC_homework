import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './MyCollection.css';

interface Favorite {
  id: string;
  work_id: string;
  created_at: string;
  works: {
    id: string;
    title: string;
    cover_image: string;
    category: string;
    price: number;
    likes_count: number;
    creator_id: string;
    creators: {
      username: string;
    };
  };
}

interface MyCollectionProps {
  user: any;
}

function MyCollection({ user }: MyCollectionProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('全部');

  useEffect(() => {
    loadFavorites();
  }, [selectedCategory]);

  const loadFavorites = async () => {
    try {
      let query = supabase
        .from('favorites')
        .select('*, works(*, creators(username))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      if (selectedCategory !== '全部') {
        filteredData = filteredData.filter(
          (fav: any) => fav.works?.category === selectedCategory
        );
      }

      setFavorites(filteredData);
    } catch (error) {
      console.error('加载收藏失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (workId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('work_id', workId);

      if (error) throw error;
      loadFavorites();
    } catch (error) {
      console.error('取消收藏失败:', error);
    }
  };

  const categories = ['全部', ...Array.from(new Set(favorites.map(f => f.works?.category).filter(Boolean)))];

  if (loading) {
    return (
      <div className="collection-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="collection-container">
      <div className="collection-header">
        <h1 className="collection-title">我的收藏</h1>
        <p className="collection-subtitle">共 {favorites.length} 件作品</p>
      </div>

      {categories.length > 1 && (
        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="empty-collection">
          <p>还没有收藏任何作品</p>
          <Link to="/" className="explore-link">
            去发现 →
          </Link>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map((favorite, index) => (
            <div
              key={favorite.id}
              className="favorite-card fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Link to={`/work/${favorite.work_id}`}>
                <div className="favorite-image-container">
                  <img
                    src={favorite.works?.cover_image || 'https://placehold.co/300x225/e6f2ff/4d9dff?text=CraftHub'}
                    alt={favorite.works?.title}
                    className="favorite-image"
                    loading="lazy"
                  />
                </div>
              </Link>
              <div className="favorite-info">
                <Link to={`/work/${favorite.work_id}`} className="favorite-title-link">
                  <h3 className="favorite-title">{favorite.works?.title}</h3>
                </Link>
                <p className="favorite-category">{favorite.works?.category}</p>
                <div className="favorite-meta">
                  <Link
                    to={`/creator/${favorite.works?.creator_id}`}
                    className="favorite-creator"
                  >
                    {favorite.works?.creators?.username}
                  </Link>
                  <span className="favorite-price">
                    {favorite.works?.price ? `¥${favorite.works.price}` : '免费'}
                  </span>
                </div>
                <button
                  className="remove-favorite-btn"
                  onClick={() => handleRemoveFavorite(favorite.work_id)}
                >
                  取消收藏
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyCollection;

