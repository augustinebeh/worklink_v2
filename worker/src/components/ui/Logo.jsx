import { clsx } from 'clsx';

export default function Logo({ size = 'md', showText = true, className }) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 48, text: 'text-2xl' },
    lg: { icon: 64, text: 'text-3xl' },
    xl: { icon: 80, text: 'text-4xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={clsx('flex flex-col items-center gap-3', className)}>
      <LogoIcon size={icon} />

      {showText && (
        <div className="text-center">
          <h1 className={clsx('font-bold text-white', text)}>
            WorkLink
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Level Up Your Career
          </p>
        </div>
      )}
    </div>
  );
}

// Icon with gradient and depth effect
export function LogoIcon({ size = 32, className }) {
  const id = `logo-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="50%" stopColor="#0d1f3c" />
          <stop offset="100%" stopColor="#1a1a3e" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="0%" y2="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={`${id}-text`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f8f8f8" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="8" stdDeviation="4" floodColor="rgba(0,0,0,0.3)" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="512" height="512" rx="112" fill={`url(#${id}-bg)`} />

      {/* Top shine */}
      <rect width="512" height="512" rx="112" fill={`url(#${id}-shine)`} />

      {/* W with shadow and gradient */}
      <text
        x="256"
        y="290"
        fontFamily="-apple-system, SF Pro Display, Helvetica Neue, Arial, sans-serif"
        fontSize="280"
        fontWeight="bold"
        fill={`url(#${id}-text)`}
        textAnchor="middle"
        filter={`url(#${id}-shadow)`}
      >
        W
      </text>
    </svg>
  );
}
