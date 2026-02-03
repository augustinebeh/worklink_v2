import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { getOptimizedProfileImage, preloadImage } from '../../utils/imageUtils';

/**
 * ProfileImage - Enhanced profile image component with loading states and fallbacks
 *
 * Features:
 * - Automatic fallback avatars
 * - Loading states with skeleton
 * - Error handling
 * - Image preloading and caching
 * - Consistent styling
 */

const ProfileImage = ({
  src,
  name,
  size = 'md',
  className = '',
  showFallback = true,
  onClick,
  loading = false,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(loading);

  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
    '3xl': 'w-24 h-24',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  // Get optimized image source
  const optimizedSrc = getOptimizedProfileImage(src, name);

  // Preload image when src changes
  useEffect(() => {
    if (!optimizedSrc) return;

    setImageLoaded(false);
    setImageError(false);
    setIsLoading(true);

    preloadImage(optimizedSrc).then((success) => {
      if (success) {
        setImageLoaded(true);
        setImageError(false);
      } else {
        setImageLoaded(false);
        setImageError(true);
      }
      setIsLoading(false);
    });
  }, [optimizedSrc]);

  // Get user initials for fallback
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 1).toUpperCase();
  };

  // Get consistent background color based on name
  const getBackgroundColor = (name) => {
    if (!name) return 'bg-slate-500';

    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
      'bg-rose-500',
      'bg-teal-500',
      'bg-orange-500',
    ];

    const hash = name
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[hash % colors.length];
  };

  const containerClasses = clsx(
    'relative rounded-full overflow-hidden flex items-center justify-center',
    'border border-white/10 bg-gradient-to-br from-white/5 to-white/10',
    sizes[size],
    onClick && 'cursor-pointer hover:scale-105 transition-transform duration-200',
    className
  );

  return (
    <div className={containerClasses} onClick={onClick} {...props}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/20 animate-pulse rounded-full" />
      )}

      {/* Profile image */}
      {optimizedSrc && !imageError && (
        <img
          src={optimizedSrc}
          alt={name || 'Profile'}
          className={clsx(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded && !isLoading ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => {
            setImageLoaded(true);
            setIsLoading(false);
          }}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
            setIsLoading(false);
          }}
        />
      )}

      {/* Fallback initials */}
      {(!optimizedSrc || imageError || !imageLoaded) && !isLoading && showFallback && (
        <div
          className={clsx(
            'w-full h-full rounded-full flex items-center justify-center font-semibold text-white',
            textSizes[size],
            getBackgroundColor(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Click overlay */}
      {onClick && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
      )}
    </div>
  );
};

export default ProfileImage;