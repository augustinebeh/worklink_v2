import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MailIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon,
  ChevronDownIcon,
  GiftIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/ui/Logo';
import { clsx } from 'clsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function TelegramLoginButton({ onAuth, botUsername }) {
  const handleTelegramLogin = () => {
    // Open Telegram bot in new tab for authentication
    window.open(`https://t.me/${botUsername}?start=login`, '_blank');
    // For demo purposes, simulate successful login after 2 seconds
    setTimeout(() => {
      onAuth({
        id: 'demo_telegram_id',
        first_name: 'Demo',
        last_name: 'User',
        username: 'demo_user',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'demo_hash'
      });
    }, 2000);
  };

  if (!botUsername) return null;

  return (
    <button
      onClick={handleTelegramLogin}
      className="w-12 h-12 bg-[#0088cc] hover:bg-[#0077bb] rounded-full flex items-center justify-center transition-colors duration-200"
      title="Login with Telegram"
    >
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.568 8.16c-.18 1.896-.96 6.504-1.356 8.628-.168.9-.504 1.2-.816 1.236-.696.06-1.224-.456-1.896-.9-1.056-.696-1.656-1.128-2.676-1.8-1.188-.78-.42-1.212.264-1.908.18-.18 3.252-2.976 3.312-3.228a.24.24 0 00-.06-.216c-.072-.06-.168-.036-.252-.024-.12.024-1.992 1.26-5.628 3.696-.528.36-.996.54-1.416.528-.456-.012-1.344-.264-2.004-.48-.804-.264-1.44-.396-1.392-.84.024-.228.336-.456.936-.696 3.612-1.584 6.024-2.625 7.236-3.114 3.456-1.44 4.176-1.692 4.644-1.692.096 0 .324.024.468.144.12.096.156.228.168.324-.012.072-.012.132-.024.204z"/>
      </svg>
    </button>
  );
}

function GoogleLoginButton({ onAuth, clientId }) {
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!clientId || initializedRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onAuth(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'icon',
          theme: 'outline',
          size: 'large',
          shape: 'circle',
        });
        initializedRef.current = true;
      }
    };
    document.head.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [clientId, onAuth]);

  if (!clientId) return null;
  return <div ref={buttonRef} className="flex justify-center" style={{ minHeight: '48px' }} />;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referrerInfo, setReferrerInfo] = useState(null);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Extract referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      // Validate the referral code
      fetch(`/api/v1/referrals/validate/${refCode}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.valid) {
            setReferrerInfo(data.data);
          }
        })
        .catch(e => console.error('Referral validation error:', e));
    }
  }, [location.search]);

  const handleTelegramAuth = useCallback(async (telegramUser) => {
    console.log('handleTelegramAuth:', telegramUser);
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/v1/auth/telegram/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...telegramUser, referralCode }),
      });
      const data = await res.json();
      console.log('Telegram response:', data);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        if (data.isNewUser) {
          const welcomeMsg = data.referredBy
            ? `Welcome! You were referred by ${data.referredBy}. Your account is pending approval.`
            : 'Welcome! Your account is pending approval.';
          setSuccess(welcomeMsg);
          setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.error || 'Telegram login failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Telegram error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }, [referralCode]);

  const handleGoogleAuth = useCallback(async (credential) => {
    console.log('handleGoogleAuth');
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/v1/auth/google/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, referralCode }),
      });
      const data = await res.json();
      console.log('Google response:', data);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        if (data.isNewUser) {
          const welcomeMsg = data.referredBy
            ? `Welcome! You were referred by ${data.referredBy}. Your account is pending approval.`
            : 'Welcome! Your account is pending approval.';
          setSuccess(welcomeMsg);
          setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.error || 'Google login failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Google error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }, [referralCode]);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('tgAuthResult=')) {
      try {
        const authResult = hash.split('tgAuthResult=')[1];
        const telegramUser = JSON.parse(decodeURIComponent(authResult));
        console.log('Telegram from URL:', telegramUser);
        window.history.replaceState(null, '', window.location.pathname);
        handleTelegramAuth(telegramUser);
      } catch (e) { console.error('Parse error:', e); }
    }
  }, [handleTelegramAuth]);

  useEffect(() => {
    // Load Telegram config (now works on localhost too)
    fetch('/api/v1/auth/telegram/config').then(r => r.json()).then(d => {
      if (d.success) setBotUsername(d.botUsername);
    }).catch(e => console.error('Telegram config error:', e));

    // Load Google config
    fetch('/api/v1/auth/google/config').then(r => r.json()).then(d => {
      if (d.success) setGoogleClientId(d.clientId);
    }).catch(e => console.error('Google config error:', e));
  }, []);

  const validateEmail = useCallback((v) => {
    if (!v.trim()) return 'Email is required';
    if (!EMAIL_REGEX.test(v)) return 'Please enter a valid email';
    return '';
  }, []);

  const emailError = touched ? validateEmail(email) : '';
  const isValid = email && !validateEmail(email);

  const handleEmailSubmit = async (e) => {
    e.preventDefault(); setTouched(true); setError('');
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    setLoading(true);
    const result = await login(email);
    if (result.success) navigate(from, { replace: true });
    else setError(result.error || 'Login failed.');
    setLoading(false);
  };

  const hasSocialLogin = botUsername || googleClientId;

  return (
    <div className="min-h-screen bg-theme-primary flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-8 pt-safe">
        {/* Logo & Welcome */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {referrerInfo ? 'You\'ve Been Invited!' : 'Welcome Back'}
          </h1>
          <p className="text-white/50">
            {referrerInfo ? 'Sign up to claim your bonus' : 'Sign in to continue to WorkLink'}
          </p>
        </div>

        {/* Referral Banner */}
        {referrerInfo && (
          <div className="w-full max-w-sm mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <GiftIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">
                  {referrerInfo.referrerName} invited you!
                </p>
                <p className="text-emerald-400 text-sm">
                  You'll both get ${referrerInfo.bonusAmount || 25} when you complete your first job
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {success && (
          <div className="w-full max-w-sm mb-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
            <p className="text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              {success}
            </p>
          </div>
        )}
        {error && (
          <div className="w-full max-w-sm mb-4 p-4 rounded-2xl bg-red-500/20 border border-red-500/30">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        <div className="w-full max-w-sm">
          {/* Social Login - Primary Section */}
          {hasSocialLogin && (
            <div className="relative mb-6">
              {/* Highlighted card for social login */}
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-[#0a1628] to-violet-500/10" />
                <div className="absolute inset-0 rounded-3xl border border-emerald-500/20" />

                <div className="relative p-6">
                  {/* Quick sign in badge */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <ZapIcon className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-semibold">Instant Access</span>
                    </div>
                  </div>

                  <h2 className="text-center text-white font-semibold mb-1">
                    Continue with your account
                  </h2>
                  <p className="text-center text-white/40 text-sm mb-5">
                    No sign up required - just log in
                  </p>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full mb-3" />
                      <span className="text-white/60">Authenticating...</span>
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
                      <div className="flex items-center justify-center gap-4">
                        {/* Google Login */}
                        {googleClientId && (
                          <GoogleLoginButton clientId={googleClientId} onAuth={handleGoogleAuth} />
                        )}

                        {/* Telegram Login */}
                        {botUsername && (
                          <TelegramLoginButton botUsername={botUsername} onAuth={handleTelegramAuth} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Features list */}
                  <div className="mt-5 pt-4 border-t border-white/[0.05]">
                    <div className="flex items-center justify-center gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                        Secure
                      </span>
                      <span className="flex items-center gap-1">
                        <SparklesIcon className="h-3.5 w-3.5 text-violet-400" />
                        Auto-register
                      </span>
                      <span className="flex items-center gap-1">
                        <ZapIcon className="h-3.5 w-3.5 text-cyan-400" />
                        One-click
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Login - Collapsible Section */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowEmailLogin(!showEmailLogin)}
              className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-white/60 transition-colors"
            >
              <span className="text-sm">Or continue with email</span>
              <ChevronDownIcon className={clsx(
                'h-4 w-4 transition-transform',
                showEmailLogin && 'rotate-180'
              )} />
            </button>

            {showEmailLogin && (
              <form onSubmit={handleEmailSubmit} className="space-y-4 pt-2">
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
            )}
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.05]" />
            </div>
          </div>

          {/* Demo Button */}
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true); setError('');
              const r = await login('sarah.tan@email.com');
              if (r.success) navigate(from, { replace: true });
              else setError(r.error || 'Demo failed');
              setLoading(false);
            }}
            className="w-full py-4 rounded-xl bg-[#0a1628] border border-white/10 text-white font-medium flex items-center justify-center gap-3 hover:bg-white/5 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-900">
              S
            </div>
            <span>Try Demo Account</span>
          </button>

          {/* New users notice */}
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400/80 text-center">
              <strong>First time?</strong> New accounts require admin approval before you can browse jobs.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative p-6 pb-safe text-center">
        <p className="text-white/20 text-xs">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
