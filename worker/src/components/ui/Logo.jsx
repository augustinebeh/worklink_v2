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
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="logoGradWorker" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="logoGoldWorker" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
          <filter id="logoGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="32" height="32" rx="8" fill="url(#logoGradWorker)" />

        {/* W shape */}
        <path
          d="M7 9 L10 22 L16 14 L22 22 L25 9"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Nodes */}
        <circle cx="7" cy="9" r="2" fill="white" />
        <circle cx="25" cy="9" r="2" fill="white" />
        <circle cx="16" cy="14" r="2.5" fill="url(#logoGoldWorker)" filter="url(#logoGlow)" />
        <circle cx="10" cy="22" r="2" fill="white" />
        <circle cx="22" cy="22" r="2" fill="white" />

        {/* Arrow */}
        <path d="M16 26 L14 28 L16 25 L18 28 Z" fill="url(#logoGoldWorker)" />
      </svg>

      {showText && (
        <div className="text-center">
          <h1 className={clsx('font-bold text-white', text)}>
            WorkLink
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Find gigs. Earn rewards. Level up.
          </p>
        </div>
      )}
    </div>
  );
}

// Icon-only version
export function LogoIcon({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="iconGradW" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="iconGoldW" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#iconGradW)" />

      <path
        d="M7 9 L10 22 L16 14 L22 22 L25 9"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="7" cy="9" r="2" fill="white" />
      <circle cx="25" cy="9" r="2" fill="white" />
      <circle cx="16" cy="14" r="2.5" fill="url(#iconGoldW)" />
      <circle cx="10" cy="22" r="2" fill="white" />
      <circle cx="22" cy="22" r="2" fill="white" />

      <path d="M16 26 L14 28 L16 25 L18 28 Z" fill="url(#iconGoldW)" />
    </svg>
  );
}
