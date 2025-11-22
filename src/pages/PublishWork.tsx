import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './PublishWork.css';

interface PublishWorkProps {
  user: any;
}

interface PublishFormState {
  title: string;
  description: string;
  category: string;
  price: string;
  coverImage: string;
  coverImageFile: File | null;
  galleryInput: string;
  galleryFiles: File[];
}

interface WorkSummary {
  id: string;
  title: string;
  cover_image: string;
  category: string;
  created_at: string;
  likes_count: number;
}

type StatusMessage = {
  type: 'success' | 'error';
  message: string;
};

const categories = ['陶艺', '绘画', '编织', '木工', '玻璃', '皮具', '珠宝', '其他'];

const coverSuggestions = [
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
];

const defaultFormState: PublishFormState = {
  title: '',
  description: '',
  category: categories[0],
  price: '',
  coverImage: '',
  coverImageFile: null,
  galleryInput: '',
  galleryFiles: [],
};

function PublishWork({ user }: PublishWorkProps) {
  const [form, setForm] = useState<PublishFormState>(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [recentWorks, setRecentWorks] = useState<WorkSummary[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [publishedWorkId, setPublishedWorkId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.id) {
      loadRecentWorks();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [alert]);

  const loadRecentWorks = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, title, cover_image, category, created_at, likes_count')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setRecentWorks(data || []);
    } catch (error) {
      console.error('加载近期作品失败:', error);
    }
  };

  const parseGallery = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const handleInputChange =
    (field: keyof PublishFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));

      // 清除该字段的错误
      if (fieldErrors[field]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }

      if (field === 'galleryInput') {
        setPreviewImages(parseGallery(value));
      }
    };

  const handleCoverImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setAlert({ type: 'error', message: '请选择图片文件（支持 JPG、PNG、GIF 等格式）' });
        // 清空文件输入
        event.target.value = '';
        return;
      }
      // 验证文件大小（最大10MB）
      if (file.size > 10 * 1024 * 1024) {
        setAlert({ type: 'error', message: '图片大小不能超过10MB，请选择较小的图片文件' });
        // 清空文件输入
        event.target.value = '';
        return;
      }
      setForm((prev) => ({ ...prev, coverImageFile: file, coverImage: '' }));
      // 清除封面图错误
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.coverImage;
        return newErrors;
      });
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // 验证文件类型和大小
      const invalidFiles = files.filter(
        (file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024
      );
      if (invalidFiles.length > 0) {
        setAlert({ type: 'error', message: '请选择有效的图片文件，每个文件不超过10MB' });
        // 清空文件输入
        event.target.value = '';
        return;
      }
      setForm((prev) => ({ ...prev, galleryFiles: [...prev.galleryFiles, ...files] }));
      // 清除画廊输入错误
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.galleryInput;
        return newErrors;
      });
      // 创建预览
      const previews: string[] = [];
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews.push(e.target?.result as string);
          if (previews.length === files.length) {
            setPreviewImages((prev) => [...prev, ...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    setForm((prev) => {
      const newFiles = [...prev.galleryFiles];
      newFiles.splice(index, 1);
      return { ...prev, galleryFiles: newFiles };
    });
    setPreviewImages((prev) => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const handleUseCoverSuggestion = (url: string) => {
    setForm((prev) => ({ ...prev, coverImage: url, coverImageFile: null }));
    setCoverPreview(null);
  };

  // 检查并创建 bucket（如果不存在）
  const ensureBucketExists = async (): Promise<void> => {
    try {
      // 直接尝试访问 bucket 来检查是否存在（比 listBuckets 更可靠）
      // 尝试列出文件（即使为空也可以验证 bucket 存在）
      const { error: accessError } = await supabase.storage
        .from('works')
        .list('', { limit: 1 });

      // 如果没有错误，说明 bucket 存在且可访问
      if (!accessError) {
        return;
      }

      // 如果是 bucket 不存在的错误，尝试创建
      if (accessError.message.includes('Bucket not found') || 
          accessError.message.includes('not found') ||
          accessError.message.includes('不存在')) {
        
        // 尝试创建 bucket
        const { error: createError } = await supabase.storage.createBucket('works', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/*'],
        });

        if (createError) {
          // 如果创建失败，可能是 bucket 已存在但没有权限访问，或者是其他错误
          // 检查是否是"已存在"的错误
          if (createError.message.includes('already exists') || 
              createError.message.includes('duplicate') ||
              createError.message.includes('已存在')) {
            // bucket 已存在，可能是权限问题，继续尝试上传
            console.warn('Bucket 可能已存在，但无法验证。将尝试直接上传。');
            return;
          }
          
          console.error('创建 bucket 失败:', createError);
          throw new Error(
            '存储桶不存在且无法自动创建。\n\n' +
            '请手动在 Supabase Dashboard 中创建：\n' +
            '1. 登录 https://app.supabase.com\n' +
            '2. 选择项目 → Storage\n' +
            '3. 点击 "New bucket"\n' +
            '4. 名称填写: works\n' +
            '5. 勾选 "Public bucket"\n' +
            '6. 点击 "Create bucket"\n\n' +
            '如果 bucket 已存在但仍报错，请检查 Storage Policies 权限设置。\n' +
            '详细步骤请查看 STORAGE_SETUP.md 文件。'
          );
        }
      } else {
        // 其他访问错误（可能是权限问题）
        console.warn('无法验证 bucket 访问权限，将尝试直接上传。错误:', accessError.message);
        // 不抛出错误，让上传时再处理
      }
    } catch (error: any) {
      if (error.message.includes('存储桶不存在') || 
          error.message.includes('Bucket not found')) {
        throw error;
      }
      // 其他错误不阻止上传，让上传时再处理
      console.warn('检查存储桶时出现错误，将尝试直接上传:', error.message);
    }
  };

  // 上传图片到Supabase Storage
  const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from('works')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('上传图片失败:', error);
        
        // 如果是 bucket 不存在的错误，提供详细指引
        if (error.message.includes('Bucket not found') || 
            error.message.includes('not found') ||
            error.message.includes('不存在')) {
          throw new Error(
            '存储桶 "works" 不存在或无法访问。\n\n' +
            '请按以下步骤检查：\n' +
            '1. 登录 Supabase Dashboard: https://app.supabase.com\n' +
            '2. 选择你的项目\n' +
            '3. 进入 Storage 页面\n' +
            '4. 确认是否存在名为 "works" 的 bucket\n' +
            '5. 如果不存在，点击 "New bucket" 创建：\n' +
            '   - 名称: works（必须使用这个名字）\n' +
            '   - 勾选 "Public bucket"\n' +
            '   - 点击 "Create bucket"\n' +
            '6. 如果已存在，请检查 Storage Policies 权限设置\n\n' +
            '详细说明请查看项目根目录的 STORAGE_SETUP.md 文件。'
          );
        }
        
        // 如果是权限错误
        if (error.message.includes('permission') || 
            error.message.includes('policy') ||
            error.message.includes('unauthorized') ||
            error.message.includes('权限') ||
            error.message.includes('403')) {
          throw new Error(
            '上传失败：权限不足。\n\n' +
            '请检查 Supabase Storage Policies 设置：\n' +
            '1. 登录 Supabase Dashboard: https://app.supabase.com\n' +
            '2. 选择项目 → Storage → Policies\n' +
            '3. 为 "works" bucket 添加以下策略：\n' +
            '   - 允许已登录用户上传文件 (INSERT)\n' +
            '   - 允许所有人读取文件 (SELECT)\n\n' +
            '详细策略设置请查看 STORAGE_SETUP.md 文件。'
          );
        }
        
        throw new Error(`上传失败: ${error.message}`);
      }

      // 获取公共URL
      const { data: urlData } = supabase.storage.from('works').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (error: any) {
      throw error;
    }
  };

  const handleReset = () => {
    setForm(defaultFormState);
    setPreviewImages([]);
    setCoverPreview(null);
    setPublishedWorkId(null);
    setUploadProgress(0);
    setFieldErrors({});
    setAlert(null);
  };

  // URL验证函数
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // 表单验证函数
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let hasError = false;

    // 清除之前的错误
    setFieldErrors({});

    // 验证标题
    if (!form.title.trim()) {
      errors.title = '标题不能为空';
      hasError = true;
    } else if (form.title.trim().length < 2) {
      errors.title = '标题至少需要2个字符';
      hasError = true;
    } else if (form.title.trim().length > 60) {
      errors.title = '标题不能超过60个字符';
      hasError = true;
    }

    // 验证描述（可选，但如果填写了需要验证长度）
    if (form.description.trim() && form.description.trim().length > 500) {
      errors.description = '描述不能超过500个字符';
      hasError = true;
    }

    // 验证分类
    if (!form.category) {
      errors.category = '请选择作品分类';
      hasError = true;
    }

    // 验证价格
    if (form.price.trim()) {
      const priceValue = Number(form.price);
      if (Number.isNaN(priceValue)) {
        errors.price = '价格必须为有效数字';
        hasError = true;
      } else if (priceValue < 0) {
        errors.price = '价格不能为负数';
        hasError = true;
      } else if (priceValue > 999999) {
        errors.price = '价格不能超过999999';
        hasError = true;
      }
    }

    // 验证封面图
    if (!form.coverImageFile && !form.coverImage.trim()) {
      errors.coverImage = '请上传封面图片或输入图片链接';
      hasError = true;
    } else if (form.coverImage.trim() && !isValidUrl(form.coverImage.trim())) {
      errors.coverImage = '请输入有效的图片链接（以 http:// 或 https:// 开头）';
      hasError = true;
    }

    // 验证画廊图片链接
    if (form.galleryInput.trim()) {
      const galleryUrls = parseGallery(form.galleryInput);
      const invalidUrls = galleryUrls.filter(url => !isValidUrl(url));
      if (invalidUrls.length > 0) {
        errors.galleryInput = `第 ${galleryUrls.indexOf(invalidUrls[0]) + 1} 个图片链接格式不正确，请使用 http:// 或 https:// 开头的有效链接`;
        hasError = true;
      }
    }

    if (hasError) {
      setFieldErrors(errors);
      // 显示第一个错误
      const firstError = Object.values(errors)[0];
      setAlert({ type: 'error', message: firstError });
      // 滚动到第一个错误字段
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      setAlert({ type: 'error', message: '用户信息缺失，请重新登录后再发布。' });
      return;
    }

    // 执行表单验证
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setUploading(true);
    setStatus(null);
    setUploadProgress(0);

    try {
      // 检查 bucket 是否存在（如果需要上传文件）
      if (form.coverImageFile || form.galleryFiles.length > 0) {
        setUploadProgress(5);
        await ensureBucketExists();
        setUploadProgress(10);
      }

      let coverImageUrl = form.coverImage.trim();
      
      // 上传封面图
      if (form.coverImageFile) {
        setUploadProgress(15);
        const timestamp = Date.now();
        const fileExt = form.coverImageFile.name.split('.').pop();
        const fileName = `${user.id}/${timestamp}_cover.${fileExt}`;
        coverImageUrl = await uploadImageToStorage(form.coverImageFile, fileName);
        setUploadProgress(30);
      }

      // 上传画廊图片
      const galleryImages: string[] = [];
      const totalFiles = form.galleryFiles.length;
      
      for (let i = 0; i < form.galleryFiles.length; i++) {
        const file = form.galleryFiles[i];
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${timestamp}_gallery_${i}.${fileExt}`;
        const url = await uploadImageToStorage(file, fileName);
        galleryImages.push(url);
        setUploadProgress(30 + (i + 1) / totalFiles * 50);
      }

      // 合并URL输入和上传的图片
      const urlImages = parseGallery(form.galleryInput);
      const allGalleryImages = [...galleryImages, ...urlImages];

      setUploadProgress(90);

      const priceValue = form.price.trim() ? Number(form.price) : null;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        cover_image: coverImageUrl,
        images: allGalleryImages,
        price: priceValue,
        creator_id: user.id,
        likes_count: 0,
      };

      const { data: insertedWork, error: insertError } = await supabase
        .from('works')
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('works_count')
        .eq('id', user.id)
        .single();

      if (!creatorError && creatorData) {
        await supabase
          .from('creators')
          .update({ works_count: (creatorData.works_count || 0) + 1 })
          .eq('id', user.id);
      }

      setUploadProgress(100);
      setStatus({ type: 'success', message: '作品已成功发布！' });
      setAlert({ type: 'success', message: '作品已成功发布！' });
      setPublishedWorkId(insertedWork?.id || null);
      setForm(defaultFormState);
      setPreviewImages([]);
      setCoverPreview(null);
      setFieldErrors({});
      loadRecentWorks();
    } catch (error: any) {
      console.error('发布作品失败:', error);
      const errorMessage = error.message || '发布失败，请稍后重试。如果上传失败，请检查Supabase Storage是否已创建"works"存储桶。';
      setStatus({ 
        type: 'error', 
        message: errorMessage
      });
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setSubmitting(false);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const totalLikes = useMemo(
    () => recentWorks.reduce((sum, work) => sum + (work.likes_count || 0), 0),
    [recentWorks]
  );

  return (
    <div className="publish-page">
      {/* 提示框 - 使用 Portal 渲染到 body 下，避免被其他元素覆盖 */}
      {alert && createPortal(
        <div className={`alert-modal ${alert.type}-modal`}>
          <div className="alert-content">
            <div className="alert-icon">{alert.type === 'error' ? '⚠️' : '✓'}</div>
            <div className="alert-message">{alert.message}</div>
            <button
              className="alert-close"
              onClick={() => setAlert(null)}
            >
              ×
            </button>
          </div>
        </div>,
        document.body
      )}

      <section className="publish-hero">
        <div>
          <p className="publish-eyebrow">创作工作台</p>
          <h1>发布新的灵感作品</h1>
          <p>上传作品详情、展示更多视角，并及时同步给喜欢你的人。</p>
        </div>
        <div className="publish-stats-card">
          <div>
            <span className="stat-label">累计作品</span>
            <strong>{recentWorks.length}</strong>
          </div>
          <div>
            <span className="stat-label">总获赞</span>
            <strong>{totalLikes}</strong>
          </div>
        </div>
      </section>

      <section className="publish-content">
        <form className="publish-card publish-form" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h2>作品信息</h2>
              <p>填写基础信息，帮助大家快速了解你的作品。</p>
            </div>
            {status && (
              <div className={`status-badge ${status.type}`}>
                <div style={{ flex: 1 }}>
                  {status.message}
                  {status.type === 'success' && publishedWorkId && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <Link to={`/work/${publishedWorkId}`} className="inline-link">
                        查看作品 →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <label className={`form-field ${fieldErrors.title ? 'error' : ''}`}>
            <span>作品标题 *</span>
            <input
              type="text"
              value={form.title}
              onChange={handleInputChange('title')}
              placeholder="例如：蓝调釉彩 · 手工陶碗"
              maxLength={60}
              data-field="title"
            />
            {fieldErrors.title && (
              <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {fieldErrors.title}
              </span>
            )}
          </label>

          <label className={`form-field ${fieldErrors.description ? 'error' : ''}`}>
            <span>一句话描述</span>
            <textarea
              value={form.description}
              onChange={handleInputChange('description')}
              placeholder="分享创作理念、材质或灵感来源..."
              rows={3}
              maxLength={500}
              data-field="description"
            />
            {fieldErrors.description && (
              <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {fieldErrors.description}
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem', textAlign: 'right' }}>
              {form.description.length}/500
            </span>
          </label>

          <div className="form-grid">
            <label className={`form-field ${fieldErrors.category ? 'error' : ''}`}>
              <span>分类 *</span>
              <select value={form.category} onChange={handleInputChange('category')} data-field="category">
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {fieldErrors.category}
                </span>
              )}
            </label>

            <label className={`form-field ${fieldErrors.price ? 'error' : ''}`}>
              <span>价格 (¥)</span>
              <input
                type="number"
                value={form.price}
                onChange={handleInputChange('price')}
                min="0"
                max="999999"
                step="0.01"
                placeholder="免费可留空"
                data-field="price"
              />
              {fieldErrors.price && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {fieldErrors.price}
                </span>
              )}
            </label>
          </div>

          <label className={`form-field ${fieldErrors.coverImage ? 'error' : ''}`}>
            <span>封面图 *</span>
            <div className="upload-section">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="file-input"
                id="cover-image-upload"
                disabled={submitting}
              />
              <label htmlFor="cover-image-upload" className="upload-button">
                {form.coverImageFile ? '更换图片' : '选择图片文件'}
              </label>
              {coverPreview && (
                <div className="cover-preview-container">
                  <img src={coverPreview} alt="封面预览" className="cover-preview" />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, coverImageFile: null }));
                      setCoverPreview(null);
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.coverImage;
                        return newErrors;
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              {!form.coverImageFile && (
                <div className="upload-alternative">
                  <span>或输入图片链接：</span>
                  <input
                    type="url"
                    value={form.coverImage}
                    onChange={handleInputChange('coverImage')}
                    placeholder="https://..."
                    disabled={submitting}
                    data-field="coverImage"
                  />
                  <div className="cover-suggestions">
                    {coverSuggestions.map((url) => (
                      <button
                        type="button"
                        key={url}
                        className="suggestion-chip"
                        onClick={() => {
                          handleUseCoverSuggestion(url);
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.coverImage;
                            return newErrors;
                          });
                        }}
                        disabled={submitting}
                      >
                        使用示例图
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {fieldErrors.coverImage && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {fieldErrors.coverImage}
                </span>
              )}
            </div>
          </label>

          <label className={`form-field ${fieldErrors.galleryInput ? 'error' : ''}`}>
            <span>更多展示图</span>
            <div className="upload-section">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryFilesChange}
                className="file-input"
                id="gallery-upload"
                disabled={submitting}
              />
              <label htmlFor="gallery-upload" className="upload-button">
                选择多张图片
              </label>
              {form.galleryFiles.length > 0 && (
                <div className="gallery-files-info">
                  已选择 {form.galleryFiles.length} 张图片
                </div>
              )}
              {!form.galleryFiles.length && (
                <div className="upload-alternative">
                  <span>或输入图片链接（每行一个）：</span>
                  <textarea
                    value={form.galleryInput}
                    onChange={handleInputChange('galleryInput')}
                    placeholder="https://...jpg"
                    rows={4}
                    disabled={submitting}
                    data-field="galleryInput"
                  />
                </div>
              )}
              {fieldErrors.galleryInput && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {fieldErrors.galleryInput}
                </span>
              )}
            </div>
          </label>

          {(previewImages.length > 0 || parseGallery(form.galleryInput).length > 0) && (
            <div className="gallery-preview">
              {previewImages.map((img, index) => (
                <div key={index} className="gallery-preview-item">
                  <img src={img} alt={`preview-${index}`} />
                  {index < form.galleryFiles.length && (
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeGalleryImage(index)}
                      disabled={submitting}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {parseGallery(form.galleryInput).map((img, index) => (
                <div key={`url-${index}`} className="gallery-preview-item">
                  <img src={img} alt={`url-preview-${index}`} />
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">上传中... {Math.round(uploadProgress)}%</span>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="ghost-btn" onClick={handleReset} disabled={submitting}>
              重置
            </button>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? '发布中...' : '立即发布'}
            </button>
          </div>
        </form>

        <aside className="publish-card recent-works">
          <div className="card-header">
            <div>
              <h3>近期作品</h3>
              
            </div>
            <span className="badge">{recentWorks.length}</span>
          </div>

          {recentWorks.length === 0 ? (
            <div className="empty-tip">
              <p>还没有作品，发布后会在这里看到预览。</p>
            </div>
          ) : (
            <div className="recent-works-grid">
              {recentWorks.map((work) => (
                <Link to={`/work/${work.id}`} key={work.id} className="recent-work-card">
                  <div className="recent-cover">
                    <img
                      src={work.cover_image || 'https://placehold.co/320x220/e6f2ff/4d9dff?text=CraftHub'}
                      alt={work.title}
                    />
                  </div>
                  <div>
                    <p className="recent-title">{work.title}</p>
                    <div className="recent-meta">
                      <span>{work.category}</span>
                      <span>❤️ {work.likes_count || 0}</span>
                    </div>
                    <span className="recent-date">
                      {new Date(work.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default PublishWork;


