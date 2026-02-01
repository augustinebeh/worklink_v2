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

// Icon-only version using actual image
export function LogoIcon({ size = 32, className }) {
  return (
    <img
      src="/favicon.png"
      alt="WorkLink"
      width={size}
      height={size}
      className={clsx('rounded-xl', className)}
    />
  );
}
