// Image optimization utilities
// Cloudinary transformations, WebP detection

// Check WebP support
export const supportsWebP = () => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// Generate optimized Cloudinary URL
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  if (!originalUrl) return null;
  
  const {
    width = 400,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'center'
  } = options;
  
  // Check if it's a Cloudinary URL
  if (!originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }
  
  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `g_${gravity}`,
    `f_${format}`,
    `q_${quality}`
  ].join(',');
  
  // Insert transformations into Cloudinary URL
  return originalUrl.replace('/upload/', `/upload/${transformations}/`);
};

// Generate responsive image srcset
export const generateSrcSet = (originalUrl, sizes = [200, 400, 600, 800]) => {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }
  
  return sizes
    .map(size => `${getOptimizedImageUrl(originalUrl, { width: size })} ${size}w`)
    .join(', ');
};

// Preload critical images
export const preloadImage = (src) => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
};

// Lazy load images with Intersection Observer
export const createImageObserver = (callback, options = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '50px'
  };
  
  return new IntersectionObserver(callback, { ...defaultOptions, ...options });
};

// Convert image to WebP if supported
export const convertToWebP = async (file) => {
  if (!supportsWebP()) return file;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(resolve, 'image/webp', 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};