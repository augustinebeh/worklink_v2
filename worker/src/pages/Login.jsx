import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MailIcon, 
  ArrowRightIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/ui/Logo';
import { clsx } from 'clsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function TelegramLoginButton({ onAuth, botUsername }) {
  const containerRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!botUsername || scriptLoadedRef.current) return;
    window.onTelegramAuth = (user) => {
      console.log('Telegram auth callback:', user);
      onAuth(user);
    };
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
    return () => { delete window.onTelegramAuth; };
  }, [botUsername, onAuth]);

  if (!botUsername) return null;
  return <div ref={containerRef} className="flex justify-center py-2" style={{ minHeight: '48px' }} />;
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
          type: 'standard', theme: 'filled_black', size: 'large',
          text: 'continue_with', shape: 'pill', width: 280,
        });
        initializedRef.current = true;
      }
    };
    document.head.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [clientId, onAuth]);

  if (!clientId) return null;
  return <div ref={buttonRef} className="flex justify-center py-2" style={{ minHeight: '48px' }} />;
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
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleTelegramAuth = useCallback(async (telegramUser) => {
    console.log('handleTelegramAuth:', telegramUser);
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/v1/auth/telegram/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramUser),
      });
      const data = await res.json();
      console.log('Telegram response:', data);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        if (data.isNewUser) {
          setSuccess('Welcome! Your account is pending approval.');
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
  }, []);

  const handleGoogleAuth = useCallback(async (credential) => {
    console.log('handleGoogleAuth');
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/v1/auth/google/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      console.log('Google response:', data);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('worker_user', JSON.stringify(data.data));
        if (data.isNewUser) {
          setSuccess('Welcome! Your account is pending approval.');
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
  }, []);

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
    if (!isLocalhost) {
      fetch('/api/v1/auth/telegram/config').then(r => r.json()).then(d => {
        if (d.success) setBotUsername(d.botUsername);
      }).catch(e => console.error('Telegram config error:', e));
    }
    fetch('/api/v1/auth/google/config').then(r => r.json()).then(d => {
      if (d.success) setGoogleClientId(d.clientId);
    }).catch(e => console.error('Google config error:', e));
  }, [isLocalhost]);

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
    <div className="min-h-screen bg-[#020817] flex flex-col pt-safe">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="mb-8"><Logo size="lg" /></div>
        {success && (
          <div className="w-full max-w-sm mb-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
            <p className="text-emerald-400 text-sm flex items-center gap-2"><CheckCircleIcon className="h-5 w-5" />{success}</p>
          </div>
        )}
        {error && (
          <div className="w-full max-w-sm mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
            <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircleIcon className="h-5 w-5" />{error}</p>
          </div>
        )}
        <div className="w-full max-w-sm">
          {hasSocialLogin && (
            <div className="mb-6 p-5 rounded-2xl bg-[#0a1628] border border-white/[0.05]">
              <p className="text-white/50 text-sm mb-4 text-center">Quick sign in - new users registered automatically</p>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                  <span className="ml-2 text-white/60">Authenticating...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {googleClientId && <GoogleLoginButton clientId={googleClientId} onAuth={handleGoogleAuth} />}
                  {botUsername && <TelegramLoginButton botUsername={botUsername} onAuth={handleTelegramAuth} />}
                </div>
              )}
            </div>
          )}
          {hasSocialLogin && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[#020817] px-3 text-white/30">or login with email</span></div>
            </div>
          )}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-white/60 mb-2 block">Email Address</label>
              <div className="relative">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onBlur={() => setTouched(true)} placeholder="Enter your email"
                  className={clsx('w-full pl-12 pr-12 py-4 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none transition-colors',
                    emailError ? 'border-red-500' : isValid ? 'border-emerald-500' : 'border-white/10 focus:border-emerald-500/50')} />
                {isValid && <CheckCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />}
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all disabled:opacity-50">
              {loading ? (<><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />Logging in...</>)
                : (<>Continue with Email<ArrowRightIcon className="h-5 w-5" /></>)}
            </button>
          </form>
          <div className="mt-6">
            <button type="button" disabled={loading}
              onClick={async () => { setLoading(true); setError(''); const r = await login('sarah.tan@email.com');
                if (r.success) navigate(from, { replace: true }); else setError(r.error || 'Demo failed'); setLoading(false); }}
              className="w-full py-4 rounded-xl bg-[#0a1628] border border-white/10 text-white font-medium flex items-center justify-center gap-3 hover:bg-white/5 active:scale-[0.98] transition-all disabled:opacity-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-900">S</div>
              <span>Try Demo (Sarah)</span>
            </button>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400/80 text-center"><strong>New users:</strong> Your account will be pending approval.</p>
          </div>
        </div>
      </div>
      <div className="p-6 pb-safe text-center"><p className="text-white/20 text-xs">By continuing, you agree to our Terms of Service</p></div>
    </div>
  );
}
