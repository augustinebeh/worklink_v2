import { clsx } from 'clsx';

export default function Logo({ size = 'md', showText = true, className }) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 56, text: 'text-2xl' },
    xl: { icon: 72, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <img
        src="/worklinkv2_vector_logo.png"
        alt="WorkLink"
        style={{ height: icon, width: 'auto' }}
        className="flex-shrink-0"
      />

      {showText && (
        <div>
          <h1 className={clsx('font-bold text-slate-900 dark:text-white', text)}>
            WorkLink
          </h1>
          <p className="text-2xs text-slate-500 dark:text-slate-400 -mt-0.5">
            Recruitment Platform
          </p>
        </div>
      )}
    </div>
  );
}

// Icon-only version for compact use
export function LogoIcon({ size = 32, className }) {
  return (
    <img
      src="/worklinkv2_vector_logo.png"
      alt="WorkLink"
      style={{ height: size, width: 'auto' }}
      className={clsx(className)}
    />
  );
}
