import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MailIcon, 
  ArrowRightIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  SendIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/ui/Logo';
import { clsx } from 'clsx';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Telegram Login Button Component
function TelegramLoginButton({ onAuth, botUsername }) {
  const containerRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!botUsername || scriptLoadedRef.current) return;

    // Create callback function
    window.onTelegramAuth = (user) => {
      onAuth(user);
    };

    // Load Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
      scriptLoadedRef.current = true;
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, onAuth]);

  if (!botUsername) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center py-2"
      style={{ minHeight: '48px' }}
    />
  );
}

// Google Login Button Component
function GoogleLoginButton({ onAuth, clientId }) {
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!clientId || initializedRef.current) return;

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            onAuth(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 280,
        });

        initializedRef.current = true;
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [clientId, onAuth]);

  if (!clientId) {
    return null;
  }

  return (
    <div 
      ref={buttonRef} 
      className="flex justify-center py-2"
      style={{ minHeight: '48px' }}
    />
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Get the redirect path from state
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
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

  // Check if running on localhost (Telegram doesn't work on localhost)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Fetch auth configs on mount
  useEffect(() => {
    // Fetch Telegram config (skip on localhost - Telegram requires HTTPS + real domain)
    if (!isLocalhost) {
      fetch('/api/v1/auth/telegram/config')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBotUsername(data.botUsername);
          }
        })
        .catch(err => console.error('Failed to fetch Telegram config:', err));
    }

    // Fetch Google config
    fetch('/api/v1/auth/google/config')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGoogleClientId(data.clientId);
        }
      })
      .catch(err => console.error('Failed to fetch Google config:', err));
  }, []);

  // Validation
  const validateEmail = useCallback((value) => {
    if (!value.trim()) return 'Email is required';
    if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email';
    return '';
  }, []);

  const emailError = touched ? validateEmail(email) : '';
  const isValid = email && !validateEmail(email);

  // Handle Telegram auth callback
  const handleTelegramAuth = async (telegramUser) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/v1/auth/telegram/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramUser),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        
        if (data.isNewUser) {
          setSuccess('Welcome! Your account is pending approval.');
          setTimeout(() => {
            window.location.href = from;
          }, 1500);
        } else {
          window.location.href = from;
        }
      } else {
        setError(data.error || 'Telegram login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google auth callback
  const handleGoogleAuth = async (credential) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/v1/auth/google/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        
        if (data.isNewUser) {
          setSuccess('Welcome! Your account is pending approval.');
          setTimeout(() => {
            window.location.href = from;
          }, 1500);
        } else {
          window.location.href = from;
        }
      } else {
        setError(data.error || 'Google login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError('');

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setLoading(true);
    const result = await login(email);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  const hasSocialLogin = botUsername || googleClientId;

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col pt-safe">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="lg" />
        </div>

        {/* Success Message */}
        {success && (
          <div className="w-full max-w-sm mb-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
            <p className="text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              {success}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-sm mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5" />
              {error}
            </p>
          </div>
        )}

        <div className="w-full max-w-sm">
          {/* Social Login Options */}
          {hasSocialLogin && (
            <div className="mb-6 p-5 rounded-2xl bg-[#0a1628] border border-white/[0.05]">
              <p className="text-white/50 text-sm mb-4 text-center">
                Quick sign in - new users registered automatically
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                  <span className="ml-2 text-white/60">Authenticating...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Google Login */}
                  {googleClientId && (
                    <GoogleLoginButton 
                      clientId={googleClientId}
                      onAuth={handleGoogleAuth}
                    />
                  )}

                  {/* Telegram Login */}
                  {botUsername && (
                    <TelegramLoginButton 
                      botUsername={botUsername}
                      onAuth={handleTelegramAuth}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {hasSocialLogin && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#020817] px-3 text-white/30">or login with email</span>
              </div>
            </div>
          )}

          {/* Email Login Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onBlur={() => setTouched(true)}
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

          {/* Demo login */}
          <div className="mt-6">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError('');
                const result = await login('sarah.tan@email.com');
                if (result.success) {
                  navigate(from, { replace: true });
                } else {
                  setError(result.error || 'Demo login failed');
                }
                setLoading(false);
              }}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#0a1628] border border-white/10 text-white font-medium flex items-center justify-center gap-3 hover:bg-white/5 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-900">
                S
              </div>
              <span>Try Demo (Sarah)</span>
            </button>
          </div>

          {/* Info about pending accounts */}
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400/80 text-center">
              <strong>New users:</strong> Your account will be pending approval. 
              Once approved, you can browse and apply for jobs.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pb-safe text-center">
        <p className="text-white/20 text-xs">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
