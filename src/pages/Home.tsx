import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { optimizeImageUrl, preloadImage } from '../utils/imageOptimizer';
import './Home.css';

interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  price: number;
  likes_count: number;
  creator_id: string;
  creators: {
    username: string;
    avatar: string;
  };
}

// 数据缓存
const worksCache: { [key: string]: { data: Work[]; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30秒缓存

const heroSlides = [
  {
    id: 1,
    title: '全球创作者精选',
    description: '跨越地域界限的工艺交流，带你看见不同文化的灵动手作。',
    image:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 2,
    title: '灵感工作台',
    description: '把色彩、材质与故事重新组合，让创意在指尖流动。',
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 3,
    title: '慢工与质感',
    description: '看见手作背后耐心的纹理，体会一步步打磨出的温度。',
    image:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 4,
    title: '感官沉浸体验',
    description: '在光影和音乐的包裹里，探索五感被唤醒的瞬间。',
    image:
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80',
  },
];

function Home() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadedAvatars, setLoadedAvatars] = useState<Set<string>>(new Set());
  const [preloadedSlides, setPreloadedSlides] = useState<Set<number>>(new Set());
  const carouselImagesRef = useRef<HTMLImageElement[]>([]);

  const categories = ['全部', '陶艺', '绘画', '编织', '木工', '其他'];

  // 预加载轮播图第一张
  useEffect(() => {
    if (heroSlides.length > 0) {
      preloadImage(heroSlides[0].image).then(() => {
        setPreloadedSlides(new Set([0]));
      });
    }
  }, []);

  // 预加载当前和下一张轮播图
  useEffect(() => {
    const preloadNext = async () => {
      const nextIndex = (currentSlide + 1) % heroSlides.length;
      if (!preloadedSlides.has(nextIndex)) {
        try {
          await preloadImage(heroSlides[nextIndex].image);
          setPreloadedSlides((prev) => new Set([...prev, nextIndex]));
        } catch (error) {
          console.error('预加载轮播图失败:', error);
        }
      }
    };
    preloadNext();
  }, [currentSlide]);

  useEffect(() => {
    loadWorks();
  }, [selectedCategory]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const loadWorks = async () => {
    // 检查缓存
    const cacheKey = selectedCategory;
    const cached = worksCache[cacheKey];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setWorks(cached.data);
      // 即使使用缓存，也要预加载图片
      preloadWorksImages(cached.data);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('works')
        .select('*, creators(username, avatar)')
        .order('created_at', { ascending: false })
        .limit(50); // 限制加载数量，提高性能

      if (selectedCategory !== '全部') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      const worksData = data || [];
      setWorks(worksData);
      
      // 更新缓存
      worksCache[cacheKey] = {
        data: worksData,
        timestamp: now
      };
      
      // 预加载图片和头像
      preloadWorksImages(worksData);
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 预加载作品图片和头像
  const preloadWorksImages = (worksData: Work[]) => {
    if (!worksData || worksData.length === 0) return;
    
    // 优先预加载前12张封面图（高优先级）
    worksData.slice(0, 12).forEach((work, index) => {
      if (!work.cover_image) return;
      const optimizedUrl = optimizeImageUrl(work.cover_image, 400, 85);
      preloadImage(optimizedUrl, index < 6 ? 'high' : 'low').then(() => {
        // 使用原始URL作为key，因为优化函数对Supabase URL不会改变
        setLoadedImages((prev) => new Set([...prev, work.cover_image]));
      }).catch(() => {});
    });

    // 预加载所有头像（高优先级，因为头像小）
    worksData.forEach((work) => {
      if (!work.creators?.avatar) return;
      const optimizedUrl = optimizeImageUrl(work.creators.avatar, 80, 90);
      preloadImage(optimizedUrl, 'high').then(() => {
        // 使用原始URL作为key
        setLoadedAvatars((prev) => new Set([...prev, work.creators.avatar]));
      }).catch(() => {});
    });
  };

  const handleImageLoad = (src: string) => {
    setLoadedImages((prev) => new Set([...prev, src]));
  };

  const handleAvatarLoad = (src: string) => {
    setLoadedAvatars((prev) => new Set([...prev, src]));
  };

  return (
    <div className="home-container">
      <section className="hero-carousel-section">
        <div className="hero-carousel">
          <div className="cube-scene">
            <div
              className="carousel-cube"
              style={{
                transform: `rotateY(-${currentSlide * (360 / heroSlides.length)}deg)`,
              }}
            >
              {heroSlides.map((slide, index) => (
                <article
                  key={slide.id}
                  className={`carousel-face ${index === currentSlide ? 'active' : ''} ${preloadedSlides.has(index) ? 'loaded' : ''}`}
                  style={{
                    backgroundImage: preloadedSlides.has(index) ? `url(${slide.image})` : 'none',
                    transform: `rotateY(${index * (360 / heroSlides.length)}deg) translateZ(var(--cube-depth))`,
                  }}
                >
                  {!preloadedSlides.has(index) && (
                    <div className="carousel-placeholder" />
                  )}
                  <img
                    ref={(el) => {
                      if (el) carouselImagesRef.current[index] = el;
                    }}
                    src={slide.image}
                    alt={slide.title}
                    style={{ display: 'none' }}
                    onLoad={() => {
                      if (!preloadedSlides.has(index)) {
                        setPreloadedSlides((prev) => new Set([...prev, index]));
                      }
                    }}
                  />
                  <div className="slide-overlay">
                    <p className="slide-label">CREATIVE FINDS</p>
                    <h2>{slide.title}</h2>
                    <p>{slide.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <button
            className="carousel-nav prev"
            onClick={() =>
              setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
            }
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            className="carousel-nav next"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
            aria-label="下一张"
          >
            ›
          </button>
          <div className="carousel-dots">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`跳转到第${index + 1}张`}
              />
            ))}
          </div>
        </div>
        <div className="hero-intro">
          <h1 className="hero-heading">发现创意作品</h1>
          <p className="hero-description">
            探索来自全球创作者的精美手作，激发你的创作灵感
          </p>
        </div>
      </section>

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

      {loading && works.length === 0 && (
        <div className="loading">加载中...</div>
      )}
      <div className="works-grid">
        {!loading && works.length === 0 ? (
          <div className="empty-state">
            <p>暂无作品，快来发布第一个吧！</p>
          </div>
        ) : (
          works.map((work, index) => (
            <div
              key={work.id}
              className="work-card fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Link to={`/work/${work.id}`}>
                <div className="work-image-container">
                  {!loadedImages.has(work.cover_image) && (
                    <div className="image-placeholder">
                      <div className="placeholder-spinner"></div>
                    </div>
                  )}
                  <img
                    src={work.cover_image ? optimizeImageUrl(work.cover_image, 400, 85) : 'https://placehold.co/400x300/e6f2ff/4d9dff?text=CraftHub'}
                    alt={work.title}
                    className={`work-image ${loadedImages.has(work.cover_image) ? 'loaded' : ''}`}
                    loading={index < 6 ? "eager" : "lazy"}
                    onLoad={() => work.cover_image && handleImageLoad(work.cover_image)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://placehold.co/400x300/e6f2ff/4d9dff?text=CraftHub';
                    }}
                  />
                  <div className="work-overlay">
                    <span className="work-price">
                      {work.price ? `¥${work.price}` : '免费'}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="work-info">
                <h3 className="work-title">{work.title}</h3>
                <p className="work-category">{work.category}</p>
                <div className="work-meta">
                  <Link
                    to={`/creator/${work.creator_id}`}
                    className="work-creator"
                  >
                    {work.creators?.avatar && (
                      <>
                        {!loadedAvatars.has(work.creators.avatar) && (
                          <div className="avatar-placeholder" />
                        )}
                        <img
                          src={optimizeImageUrl(work.creators.avatar, 80, 90) || 'https://placehold.co/40x40/e6f2ff/4d9dff?text=U'}
                          alt={work.creators.username}
                          className={`creator-avatar ${loadedAvatars.has(work.creators.avatar) ? 'loaded' : ''}`}
                          loading="eager"
                          onLoad={() => work.creators?.avatar && handleAvatarLoad(work.creators.avatar)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://placehold.co/40x40/e6f2ff/4d9dff?text=U';
                            handleAvatarLoad(target.src);
                          }}
                        />
                      </>
                    )}
                    <span>{work.creators?.username || '未知创作者'}</span>
                  </Link>
                  <div className="home-like">❤️ {work.likes_count}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Home;

