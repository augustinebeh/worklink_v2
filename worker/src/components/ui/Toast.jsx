import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, InfoIcon, XIcon } from 'lucide-react';
import { clsx } from 'clsx';

const ToastContext = createContext(null);

const toastIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
};

const toastStyles = {
  success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
  error: 'bg-red-900/90 border-red-700 text-red-100',
  warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
  info: 'bg-blue-900/90 border-blue-700 text-blue-100',
};

const iconStyles = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};

function Toast({ id, type = 'info', title, message, duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const Icon = toastIcons[type];

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    if (duration > 0) {
      const timer = setTimeout(() => handleClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 min-w-[300px] max-w-[calc(100vw-32px)]',
        toastStyles[type],
        isVisible && !isLeaving ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[type])} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        {message && <p className="text-sm opacity-80 mt-0.5">{message}</p>}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Dismiss notification"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed top-safe left-4 right-4 z-[100] flex flex-col items-center gap-2 pt-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>,
    document.body
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = {
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default Toast;
