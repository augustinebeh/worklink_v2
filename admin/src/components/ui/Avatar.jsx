import { clsx } from 'clsx';

export default function Avatar({ 
  src, 
  name, 
  size = 'md',
  status,
  className,
}) {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-400',
    busy: 'bg-amber-500',
  };

  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate consistent color from name
  const getColorClass = (name) => {
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
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className={clsx('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={clsx(
            'rounded-full object-cover ring-2 ring-white dark:ring-slate-900',
            sizes[size]
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-medium text-white ring-2 ring-white dark:ring-slate-900',
            sizes[size],
            getColorClass(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}
      
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// Avatar group for showing multiple avatars
export function AvatarGroup({ 
  users = [], 
  max = 4, 
  size = 'md',
  className,
}) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  const sizes = {
    xs: 'h-6 w-6 text-2xs -ml-1.5',
    sm: 'h-8 w-8 text-xs -ml-2',
    md: 'h-10 w-10 text-sm -ml-2.5',
    lg: 'h-12 w-12 text-base -ml-3',
  };

  return (
    <div className={clsx('flex items-center', className)}>
      {displayUsers.map((user, i) => (
        <Avatar
          key={user.id || i}
          src={user.avatar || user.profilePhoto}
          name={user.name}
          size={size}
          className={i > 0 ? sizes[size].split(' ').pop() : ''}
        />
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900',
            sizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
