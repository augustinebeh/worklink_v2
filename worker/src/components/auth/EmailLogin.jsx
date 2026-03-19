import {
  MailIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailLogin({
  email,
  onEmailChange,
  onSubmit,
  loading,
  showEmailLogin,
  onToggleShow,
  touched,
  onBlur,
}) {
  const validateEmail = (v) => {
    if (!v.trim()) return 'Email is required';
    if (!EMAIL_REGEX.test(v)) return 'Please enter a valid email';
    return '';
  };

  const emailError = touched ? validateEmail(email) : '';
  const isValid = email && !validateEmail(email);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onToggleShow}
        className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-white/60 transition-colors"
      >
        <span className="text-sm">Or continue with email</span>
        <ChevronDownIcon className={clsx(
          'h-4 w-4 transition-transform',
          showEmailLogin && 'rotate-180'
        )} />
      </button>

      {showEmailLogin && (
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-white/60 mb-2 block">
              Email Address
            </label>
            <div className="relative">
              <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onBlur={onBlur}
                placeholder="Enter your email"
                className={clsx(
                  'w-full pl-12 pr-12 py-4 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none transition-colors',
                  emailError ? 'border-red-500' : isValid ? 'border-emerald-500' : 'border-white/10 focus:border-emerald-500/50'
                )}
              />
              {isValid && <CheckCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Logging in...
              </>
            ) : (
              <>
                Continue with Email
                <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
