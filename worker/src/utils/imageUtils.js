/**
 * Image utilities for profile pictures and avatar handling
 */

// Cache for loaded images to prevent repeated requests
const imageCache = new Map();

/**
 * Preload an image and cache it
 * @param {string} src - Image source URL
 * @returns {Promise<boolean>} - True if loaded successfully
 */
export function preloadImage(src) {
  if (!src) return Promise.resolve(false);

  // Check cache first
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src));
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      imageCache.set(src, true);
      resolve(true);
    };

    img.onerror = () => {
      imageCache.set(src, false);
      resolve(false);
    };

    img.src = src;
  });
}

/**
 * Generate a fallback avatar URL using DiceBear
 * @param {string} name - User's name
 * @param {string} style - Avatar style (default: 'avataaars')
 * @returns {string} - Avatar URL
 */
export function generateFallbackAvatar(name, style = 'avataaars') {
  const seed = encodeURIComponent(name || 'Anonymous');
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

/**
 * Get optimized profile image URL with fallbacks
 * @param {string} profilePhoto - Primary profile photo URL/base64
 * @param {string} name - User's name for fallback
 * @param {Object} options - Options for image handling
 * @returns {string} - Optimized image URL
 */
export function getOptimizedProfileImage(profilePhoto, name, options = {}) {
  const { fallbackStyle = 'avataaars', preferBase64 = true } = options;

  // If no profile photo, use fallback
  if (!profilePhoto) {
    return generateFallbackAvatar(name, fallbackStyle);
  }

  // If it's already a base64 image (uploaded/cropped), use it directly
  if (profilePhoto.startsWith('data:image/')) {
    return profilePhoto;
  }

  // If it's a DiceBear URL or other external image, use it directly
  if (profilePhoto.startsWith('http')) {
    return profilePhoto;
  }

  // Fallback for any other cases
  return generateFallbackAvatar(name, fallbackStyle);
}

/**
 * Validate if an image URL/base64 is valid
 * @param {string} src - Image source
 * @returns {boolean} - True if valid
 */
export function isValidImageSrc(src) {
  if (!src || typeof src !== 'string') return false;

  // Valid base64 image
  if (src.startsWith('data:image/')) return true;

  // Valid URL
  try {
    new URL(src);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert image file to base64
 * @param {File} file - Image file
 * @returns {Promise<string>} - Base64 data URL
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid file type'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress and optimize base64 image
 * @param {string} base64 - Base64 image data
 * @param {Object} options - Compression options
 * @returns {Promise<string>} - Optimized base64 image
 */
export function compressImage(base64, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 400,
      maxHeight = 400,
      quality = 0.85,
      format = 'image/jpeg'
    } = options;

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const optimizedBase64 = canvas.toDataURL(format, quality);
        resolve(optimizedBase64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}

/**
 * Clear image cache (useful for memory management)
 */
export function clearImageCache() {
  imageCache.clear();
}

/**
 * Get cache size for debugging
 * @returns {number} - Number of cached images
 */
export function getCacheSize() {
  return imageCache.size;
}