import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MailIcon, ArrowRightIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/ui/Logo';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Get the redirect path from state (where user tried to go before being redirected to login)
  const from = location.state?.from?.pathname || '/';

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // Real-time validation
  const validateEmail = useCallback((value) => {
    if (!value.trim()) return 'Email is required';
    if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email';
    return '';
  }, []);

  const validationError = touched ? validateEmail(email) : '';
  const isValid = email && !validateEmail(email);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(''); // Clear server error on change
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  // Quick login with test accounts
  const quickLogin = async (testEmail) => {
    setEmail(testEmail);
    setLoading(true);
    const result = await login(testEmail);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col pt-safe">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="lg" />
        </div>

        {/* Login form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-dark-300 mb-2 block">
                Email Address
                <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleBlur}
                  placeholder="Enter your email"
                  required
                  aria-required="true"
                  aria-invalid={!!(validationError || error)}
                  aria-describedby={validationError || error ? 'email-error' : undefined}
                  className={`w-full pl-12 pr-12 py-4 min-h-[52px] rounded-xl bg-dark-800 border text-white placeholder-dark-500 focus:outline-none focus:ring-2 transition-colors ${
                    validationError || error
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : isValid
                      ? 'border-accent-500 focus:border-accent-500 focus:ring-accent-500/20'
                      : 'border-white/10 focus:border-primary-500 focus:ring-primary-500/20'
                  }`}
                />
                {/* Validation icon */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {validationError || error ? (
                    <AlertCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                  ) : isValid ? (
                    <CheckCircleIcon className="h-5 w-5 text-accent-500" aria-hidden="true" />
                  ) : null}
                </div>
              </div>
              {/* Error message */}
              {(validationError || error) && (
                <p id="email-error" className="mt-2 text-sm text-red-400 flex items-center gap-1" role="alert">
                  <AlertCircleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {validationError || error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? 'Logging in...' : 'Continue to login'}
              className="w-full min-h-[52px] py-4 rounded-xl bg-primary-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-600 active:scale-[0.98] transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-950"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  Continue
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Demo account */}
          <div className="mt-8">
            <p className="text-center text-dark-500 text-sm mb-4">Or try a demo account</p>
            <button
              onClick={() => quickLogin('sarah.tan@email.com')}
              disabled={loading}
              aria-label="Login as Sarah Tan"
              className="w-full p-4 min-h-[60px] rounded-xl bg-gradient-to-r from-primary-900/50 to-violet-900/50 border border-primary-500/30 text-sm hover:border-primary-500/50 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-white font-semibold">Sarah Tan</p>
                  <p className="text-primary-400 text-xs">Level 10 Elite Worker</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-dark-400">sarah.tan@email.com</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pb-safe text-center">
        <p className="text-dark-600 text-xs">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
