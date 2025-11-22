import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { optimizeImageUrl, preloadImage } from '../utils/imageOptimizer';
import './Profile.css';

interface ProfileProps {
  user: any;
  setUser: (user: any) => void;
}

interface CreatorRecord {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  followers_count: number | null;
  works_count: number | null;
  created_at: string;
}

interface WorkSummary {
  id: string;
  title: string;
  cover_image: string;
  category: string;
  likes_count: number;
  created_at: string;
  price: number | null;
}

type StatusMessage = {
  type: 'success' | 'error';
  message: string;
};

const defaultBasicForm = {
  username: '',
  avatar: '',
  bio: '',
};

const defaultProfileForm = {
  banner_image: '',
  location: '',
  website: '',
  instagram: '',
  wechat: '',
  specialties: '',
};

interface FileState {
  avatarFile: File | null;
  bannerFile: File | null;
  avatarPreview: string | null;
  bannerPreview: string | null;
}

interface Follower {
  id: string;
  username: string;
  avatar: string;
  bio: string;
}

interface Following {
  id: string;
  username: string;
  avatar: string;
  bio: string;
}

function Profile({ user, setUser }: ProfileProps) {
  const [creator, setCreator] = useState<CreatorRecord | null>(null);
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [basicForm, setBasicForm] = useState(defaultBasicForm);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [basicSaving, setBasicSaving] = useState(false);
  const [basicStatus, setBasicStatus] = useState<StatusMessage | null>(null);
  const [profileStatus, setProfileStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileState, setFileState] = useState<FileState>({
    avatarFile: null,
    bannerFile: null,
    avatarPreview: null,
    bannerPreview: null,
  });
  const [uploading, setUploading] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([loadCreator(), loadProfile(), loadWorks(), loadFollowingCount()]).finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!basicStatus) return;
    const timer = setTimeout(() => setBasicStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [basicStatus]);

  useEffect(() => {
    if (!profileStatus) return;
    const timer = setTimeout(() => setProfileStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [profileStatus]);

  const loadCreator = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('id, username, email, avatar, bio, followers_count, works_count, created_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setCreator(data);
        setBasicForm({
          username: data.username || '',
          avatar: data.avatar || '',
          bio: data.bio || '',
        });
        // 预加载头像（高优先级）
        if (data.avatar) {
          preloadImage(optimizeImageUrl(data.avatar, 130, 90), 'high').catch(() => {});
        }
      }
    } catch (error) {
      console.error('加载创作者信息失败:', error);
    }
  };

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('creator_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          throw error;
        }
      }
      if (data) {
        setProfileForm({
          banner_image: data.banner_image || '',
          location: data.location || '',
          website: data.website || '',
          instagram: data.instagram || '',
          wechat: data.wechat || '',
          specialties: data.specialties?.join(', ') || '',
        });
      } else {
        setProfileForm(defaultProfileForm);
      }
    } catch (error) {
      console.error('加载扩展资料失败:', error);
    }
  };

  const loadWorks = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, title, cover_image, category, likes_count, created_at, price')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('加载作品失败:', error);
    }
  };

  const loadFollowingCount = async () => {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      if (error) throw error;
      setFollowingCount(count || 0);
    } catch (error) {
      console.error('加载关注数量失败:', error);
    }
  };

  const loadFollowers = async () => {
    if (!user?.id) return;
    setLoadingFollowers(true);
    try {
      // 先获取所有关注关系
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      
      if (!followsData || followsData.length === 0) {
        setFollowers([]);
        return;
      }

      // 获取所有粉丝的详细信息
      const followerIds = followsData.map(f => f.follower_id);
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select('id, username, avatar, bio')
        .in('id', followerIds);

      if (creatorsError) throw creatorsError;
      
      setFollowers(creatorsData || []);
    } catch (error) {
      console.error('加载粉丝列表失败:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadFollowing = async () => {
    if (!user?.id) return;
    setLoadingFollowing(true);
    try {
      // 先获取所有关注关系
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      
      if (!followsData || followsData.length === 0) {
        setFollowing([]);
        return;
      }

      // 获取所有关注的人的详细信息
      const followingIds = followsData.map(f => f.following_id);
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select('id, username, avatar, bio')
        .in('id', followingIds);

      if (creatorsError) throw creatorsError;
      
      setFollowing(creatorsData || []);
    } catch (error) {
      console.error('加载关注列表失败:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleShowFollowers = () => {
    setShowFollowersModal(true);
    if (followers.length === 0) {
      loadFollowers();
    }
  };

  const handleShowFollowing = () => {
    setShowFollowingModal(true);
    if (following.length === 0) {
      loadFollowing();
    }
  };

  const handleBasicInputChange =
    (field: keyof typeof defaultBasicForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setBasicForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setBasicStatus({ type: 'error', message: '请选择图片文件' });
        event.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setBasicStatus({ type: 'error', message: '图片大小不能超过10MB' });
        event.target.value = '';
        return;
      }
      setFileState((prev) => ({ ...prev, avatarFile: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileState((prev) => ({ ...prev, avatarPreview: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const ensureBucketExists = async (): Promise<void> => {
    try {
      const { error: accessError } = await supabase.storage
        .from('works')
        .list('', { limit: 1 });

      if (!accessError) {
        return;
      }

      if (accessError.message.includes('Bucket not found') || 
          accessError.message.includes('not found')) {
        const { error: createError } = await supabase.storage.createBucket('works', {
          public: true,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/*'],
        });

        if (createError && !createError.message.includes('already exists')) {
          console.warn('无法创建或访问存储桶，将尝试直接上传');
        }
      }
    } catch (error) {
      console.warn('检查存储桶时出现错误:', error);
    }
  };

  const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('works')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`上传失败: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from('works').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSaveBasic = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    if (!basicForm.username.trim()) {
      setBasicStatus({ type: 'error', message: '用户名不能为空' });
      return;
    }

    setBasicSaving(true);
    setUploading(true);
    setBasicStatus(null);

    try {
      let avatarUrl = basicForm.avatar.trim();

      // 上传头像文件
      if (fileState.avatarFile) {
        await ensureBucketExists();
        const timestamp = Date.now();
        const fileExt = fileState.avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${timestamp}_avatar.${fileExt}`;
        avatarUrl = await uploadImageToStorage(fileState.avatarFile, fileName);
      }

      const updates = {
        username: basicForm.username.trim(),
        avatar: avatarUrl || null,
        bio: basicForm.bio.trim(),
      };

      const { data, error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setCreator((prev) => (prev ? { ...prev, ...data } : data));
      setUser({
        ...user,
        username: data.username,
        avatar: data.avatar,
        bio: data.bio,
      });
      setBasicForm((prev) => ({ ...prev, avatar: data.avatar || '' }));
      setFileState((prev) => ({ ...prev, avatarFile: null, avatarPreview: null }));
      setBasicStatus({ type: 'success', message: '基本信息已更新' });
    } catch (error: any) {
      console.error('更新基本信息失败:', error);
      setBasicStatus({ type: 'error', message: error.message || '保存失败，请稍后重试' });
    } finally {
      setBasicSaving(false);
      setUploading(false);
    }
  };

  const totalLikes = useMemo(
    () => works.reduce((sum, work) => sum + (work.likes_count || 0), 0),
    [works]
  );

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">加载中...</div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="profile-page">
        <div className="profile-card">未找到创作者信息</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div
          className="profile-banner"
          style={{
            backgroundImage: fileState.bannerPreview
              ? `url(${fileState.bannerPreview})`
              : profileForm.banner_image
              ? `url(${profileForm.banner_image})`
              : 'linear-gradient(120deg, #4d9dff 0%, #66b3ff 100%)',
          }}
        />
        <div className="profile-header">
          <div className="avatar-upload-container">
            <img
              src={
                fileState.avatarPreview ||
                (basicForm.avatar ? optimizeImageUrl(basicForm.avatar, 130, 90) : '') ||
                (creator.avatar ? optimizeImageUrl(creator.avatar, 130, 90) : '') ||
                'https://placehold.co/120x120/e6f2ff/4d9dff?text=U'
              }
              alt={creator.username}
              className="profile-avatar"
              loading="eager"
            />
            <label className="avatar-upload-btn" htmlFor="avatar-upload">
              <span>📷</span>
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarFileChange}
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <h1>{creator.username}</h1>
            <p>{creator.bio || '还没有填写简介，快来完善吧。'}</p>
            <div className="profile-tags">
              {profileForm.location && <span>{profileForm.location}</span>}
              {profileForm.specialties && <span>{profileForm.specialties}</span>}
            </div>
          </div>
        </div>
        <div className="profile-stats">
          <div>
            <strong>{creator.works_count || 0}</strong>
            <span>作品</span>
          </div>
          <div className="stat-clickable" onClick={handleShowFollowers}>
            <strong>{creator.followers_count || 0}</strong>
            <span>粉丝</span>
          </div>
          <div className="stat-clickable" onClick={handleShowFollowing}>
            <strong>{followingCount}</strong>
            <span>关注</span>
          </div>
          <div>
            <strong>{totalLikes}</strong>
            <span>获赞</span>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <form className="profile-card" onSubmit={handleSaveBasic}>
          <header>
            <div>
              <h2>基础信息</h2>
              <p>昵称、头像与简介会同步到所有作品页面。</p>
            </div>
            {basicStatus && <span className={`status-chip ${basicStatus.type}`}>{basicStatus.message}</span>}
          </header>

          <label>
            <span>昵称 *</span>
            <input
              type="text"
              value={basicForm.username}
              onChange={handleBasicInputChange('username')}
              maxLength={32}
            />
          </label>

          <div className="image-upload-section">
            <label>
              <span>头像</span>
              <div className="image-upload-wrapper">
                <label className="file-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="image-file-input"
                  />
                  <span className="file-upload-text">选择图片</span>
                </label>
              </div>
              {fileState.avatarPreview && (
                <div className="image-preview">
                  <img src={fileState.avatarPreview} alt="头像预览" />
                  <button
                    type="button"
                    onClick={() => setFileState((prev) => ({ ...prev, avatarFile: null, avatarPreview: null }))}
                    className="remove-preview-btn"
                  >
                    ✕
                  </button>
                </div>
              )}
            </label>
          </div>

          <label>
            <span>个人简介</span>
            <textarea
              value={basicForm.bio}
              onChange={handleBasicInputChange('bio')}
              rows={4}
              placeholder="介绍你的创作方向、过往经历或灵感来源..."
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={basicSaving || uploading}>
              {basicSaving || uploading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>

        
      </section>

      {/* 粉丝列表模态框 */}
      {showFollowersModal && createPortal(
        <div className="follow-modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="follow-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h2>粉丝 ({creator.followers_count || 0})</h2>
              <button className="follow-modal-close" onClick={() => setShowFollowersModal(false)}>×</button>
            </div>
            <div className="follow-modal-body">
              {loadingFollowers ? (
                <div className="follow-loading">加载中...</div>
              ) : followers.length === 0 ? (
                <div className="follow-empty">暂无粉丝</div>
              ) : (
                <div className="follow-list">
                  {followers.map((follower) => (
                    <Link
                      key={follower.id}
                      to={`/creator/${follower.id}`}
                      className="follow-item"
                      onClick={() => setShowFollowersModal(false)}
                    >
                      <img
                        src={follower.avatar ? optimizeImageUrl(follower.avatar, 50, 90) : 'https://placehold.co/50x50/e6f2ff/4d9dff?text=U'}
                        alt={follower.username}
                        className="follow-avatar"
                        loading="eager"
                      />
                      <div className="follow-info">
                        <div className="follow-username">{follower.username}</div>
                        {follower.bio && (
                          <div className="follow-bio">{follower.bio}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 关注列表模态框 */}
      {showFollowingModal && createPortal(
        <div className="follow-modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="follow-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h2>关注 ({followingCount})</h2>
              <button className="follow-modal-close" onClick={() => setShowFollowingModal(false)}>×</button>
            </div>
            <div className="follow-modal-body">
              {loadingFollowing ? (
                <div className="follow-loading">加载中...</div>
              ) : following.length === 0 ? (
                <div className="follow-empty">暂无关注</div>
              ) : (
                <div className="follow-list">
                  {following.map((item) => (
                    <Link
                      key={item.id}
                      to={`/creator/${item.id}`}
                      className="follow-item"
                      onClick={() => setShowFollowingModal(false)}
                    >
                      <img
                        src={item.avatar ? optimizeImageUrl(item.avatar, 50, 90) : 'https://placehold.co/50x50/e6f2ff/4d9dff?text=U'}
                        alt={item.username}
                        className="follow-avatar"
                        loading="eager"
                      />
                      <div className="follow-info">
                        <div className="follow-username">{item.username}</div>
                        {item.bio && (
                          <div className="follow-bio">{item.bio}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Profile;


