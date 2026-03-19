import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { getLevelTier } from '../../../../shared/utils/gamification-browser';
import { getOptimizedProfileImage, preloadImage } from '../../utils/imageUtils';
import { TIER_BORDERS, CUSTOM_BORDERS, getOuterGlowClass } from './AvatarBorderConfig';
import IntricatePattern from './IntricatePattern';

/**
 * ProfileAvatar - Avatar display with decorative tier-based borders
 *
 * Border data and SVG patterns are split into:
 * - AvatarBorderConfig.js (tier/custom border configs, glow logic)
 * - IntricatePattern.jsx (SVG pattern overlays)
 */

export default function ProfileAvatar({
  name,
  photoUrl,
  level = 1,
  size = 'md',
  showLevel = true,
  isCurrentUser = false,
  className = '',
  selectedBorderId = null,
}) {
  const customBorder = selectedBorderId ? CUSTOM_BORDERS[selectedBorderId] : null;
  const tier = customBorder ? customBorder.tier : getLevelTier(level);
  const config = TIER_BORDERS[tier] || TIER_BORDERS.bronze;

  const finalConfig = customBorder ? {
    ...config,
    gradient: customBorder.gradient,
    glow: customBorder.glow,
    animation: customBorder.animation,
    intricate: customBorder.intricate,
  } : config;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [optimizedPhotoUrl, setOptimizedPhotoUrl] = useState(null);

  // Optimize and preload image when photoUrl changes
  useEffect(() => {
    setImageLoaded(false);
    setOptimizedPhotoUrl(null);

    const optimized = getOptimizedProfileImage(photoUrl, name);

    // If this is a base64 image (newly uploaded), force cache invalidation
    if (photoUrl && photoUrl.startsWith('data:image/')) {
      // Add timestamp to ensure cache bust for base64 images
      const timestampedUrl = `${photoUrl}#t=${Date.now()}`;
      setOptimizedPhotoUrl(timestampedUrl);
      setImageLoaded(true); // Base64 images are immediately available
    } else {
      setOptimizedPhotoUrl(optimized);
      if (optimized) {
        preloadImage(optimized).then((success) => {
          setImageLoaded(success);
        });
      }
    }
  }, [photoUrl, name]);

  const sizes = {
    sm: { container: 'w-10 h-10', text: 'text-sm', badge: 'text-[8px] px-1', badgeOffset: '-bottom-1', padding: 'p-[2px]' },
    md: { container: 'w-12 h-12', text: 'text-lg', badge: 'text-[10px] px-1.5', badgeOffset: '-bottom-1', padding: 'p-[3px]' },
    lg: { container: 'w-16 h-16', text: 'text-xl', badge: 'text-xs px-2', badgeOffset: '-bottom-1.5', padding: 'p-[3px]' },
    xl: { container: 'w-20 h-20', text: 'text-2xl', badge: 'text-xs px-2 py-0.5', badgeOffset: '-bottom-2', padding: 'p-[4px]' },
    '2xl': { container: 'w-24 h-24', text: 'text-3xl', badge: 'text-sm px-2.5 py-0.5', badgeOffset: '-bottom-2', padding: 'p-[4px]' },
  };

  const sizeConfig = sizes[size] || sizes.md;
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const outerGlowClass = getOuterGlowClass(customBorder, tier);
  const hasOuterGlow = !!outerGlowClass || !!finalConfig.glow;

  return (
    <div className={clsx('relative inline-block', className)}>
      {/* Outer glow effect - separate layer behind avatar */}
      {hasOuterGlow && (
        <div
          className={clsx(
            'absolute inset-[-4px] rounded-full blur-md -z-10',
            outerGlowClass
          )}
          style={!outerGlowClass && finalConfig.glow ? {
            background: 'currentColor',
            opacity: 0.4,
          } : undefined}
        />
      )}

      {/* Border container with gradient - NO shadow/glow here */}
      <div className={clsx(
        'relative rounded-full',
        sizeConfig.padding,
        finalConfig.animation,
        finalConfig.gradient
      )}>
        {/* Intricate pattern overlay */}
        {finalConfig.intricate && (
          <IntricatePattern type={finalConfig.intricate} size={size} />
        )}

        {/* Inner avatar container */}
        <div className={clsx(
          'relative rounded-full flex items-center justify-center font-bold overflow-hidden',
          sizeConfig.container,
          sizeConfig.text,
          tier === 'bronze' && !customBorder ? finalConfig.border : 'bg-dark-900',
          finalConfig.ring,
          isCurrentUser ? 'text-white' : 'text-dark-300'
        )}>
          {optimizedPhotoUrl && (
            <img
              src={optimizedPhotoUrl}
              alt={name}
              className="w-full h-full object-cover"
              style={{ display: imageLoaded ? 'block' : 'none' }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
          )}
          <span
            className={clsx(isCurrentUser ? 'text-primary-400' : '', 'select-none')}
            style={{ display: imageLoaded ? 'none' : 'flex' }}
          >
            {initial}
          </span>
        </div>
      </div>

      {/* Level badge */}
      {showLevel && (
        <div className={clsx(
          'absolute left-1/2 -translate-x-1/2 rounded-full font-bold whitespace-nowrap z-10',
          sizeConfig.badge,
          sizeConfig.badgeOffset,
          finalConfig.badge
        )}>
          Lv.{level}
        </div>
      )}
    </div>
  );
}
