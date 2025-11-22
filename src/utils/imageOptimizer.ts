// 优化图片URL（添加缓存和压缩提示）
// 注意：Supabase Storage本身不支持URL参数优化，但我们可以通过其他方式优化
export const optimizeImageUrl = (url: string, width?: number, quality: number = 80): string => {
  if (!url) {
    return url;
  }
  
  // 对于Supabase Storage URL，保持原样（Supabase不支持URL参数优化）
  // 但我们可以通过预加载和合适的尺寸来优化
  // 对于其他URL（如Unsplash），可以添加参数
  if (url.includes('supabase.co')) {
    // Supabase Storage URL，保持原样
    return url;
  }
  
  // 对于其他URL，如果已经包含参数，不重复添加
  if (url.includes('?')) {
    return url;
  }
  
  // 对于其他图片服务，可以添加优化参数
  const params = new URLSearchParams();
  if (width) {
    params.append('w', width.toString());
  }
  if (quality) {
    params.append('q', quality.toString());
  }
  
  return params.toString() ? `${url}?${params.toString()}` : url;
};

// 图片预加载函数（支持优先级）
export const preloadImage = (src: string, priority: 'high' | 'low' = 'low'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    // 高优先级图片立即加载，低优先级延迟加载
    if (priority === 'high') {
      img.src = src;
    } else {
      // 使用requestIdleCallback延迟加载低优先级图片
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          img.src = src;
        });
      } else {
        setTimeout(() => {
          img.src = src;
        }, 100);
      }
    }
  });
};

