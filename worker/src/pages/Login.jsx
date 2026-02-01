import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MailIcon, 
  ArrowRightIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  PhoneIcon,
  UserIcon,
  SendIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/ui/Logo';
import { clsx } from 'clsx';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Singapore phone regex
const PHONE_REGEX = /^(\+65|65)?[89]\d{7}$/;

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

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({});

  // Validation
  const validateEmail = useCallback((value) => {
    if (!value.trim()) return 'Email is required';
    if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email';
    return '';
  }, []);

  const validatePhone = useCallback((value) => {
    if (!value.trim()) return 'Phone number is required';
    const clean = value.replace(/[\s\-()]/g, '');
    if (!PHONE_REGEX.test(clean)) return 'Please enter a valid Singapore phone number';
    return '';
  }, []);

  const validateName = useCallback((value) => {
    if (!value.trim()) return 'Name is required';
    if (value.trim().length < 2) return 'Name is too short';
    return '';
  }, []);

  const emailError = touched.email ? validateEmail(email) : '';
  const phoneError = touched.phone ? validatePhone(phone) : '';
  const nameError = touched.name ? validateName(name) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, phone: true, name: true });
    setError('');
    setSuccess('');

    if (mode === 'signup') {
      // Signup via Telegram
      const phoneErr = validatePhone(phone);
      const nameErr = validateName(name);
      
      if (phoneErr || nameErr) {
        setError(phoneErr || nameErr);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/v1/auth/register/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            telegram_username: telegramUsername.trim() || undefined,
          }),
        });
        const data = await res.json();

        if (data.success) {
          setSuccess('Account created! Your account is pending approval. You can now login.');
          setMode('login');
          setLoginMethod('phone');
          setName('');
          setTelegramUsername('');
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login
      if (loginMethod === 'email') {
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
      } else {
        // Phone login
        const phoneErr = validatePhone(phone);
        if (phoneErr) {
          setError(phoneErr);
          return;
        }

        setLoading(true);
        try {
          const res = await fetch('/api/v1/auth/worker/login/phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone.trim() }),
          });
          const data = await res.json();

          if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data));
            window.location.href = from;
          } else {
            setError(data.error || 'Login failed');
          }
        } catch (err) {
          setError('Network error. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const isValidLogin = loginMethod === 'email' ? (email && !validateEmail(email)) : (phone && !validatePhone(phone));
  const isValidSignup = name && !validateName(name) && phone && !validatePhone(phone);

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col pt-safe">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="lg" />
        </div>

        {/* Mode Toggle */}
        <div className="w-full max-w-sm mb-6">
          <div className="flex rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={clsx(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                mode === 'login'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                  : 'text-white/50 hover:text-white'
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={clsx(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                mode === 'signup'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                  : 'text-white/50 hover:text-white'
              )}
            >
              Sign Up
            </button>
          </div>
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

        {/* Login Form */}
        {mode === 'login' && (
          <div className="w-full max-w-sm">
            {/* Login Method Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setError(''); }}
                className={clsx(
                  'flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                  loginMethod === 'email'
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'border border-white/5 text-white/40 hover:text-white/70'
                )}
              >
                <MailIcon className="h-4 w-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('phone'); setError(''); }}
                className={clsx(
                  'flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                  loginMethod === 'phone'
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'border border-white/5 text-white/40 hover:text-white/70'
                )}
              >
                <PhoneIcon className="h-4 w-4" /> Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {loginMethod === 'email' ? (
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
                      onBlur={() => setTouched({ ...touched, email: true })}
                      placeholder="Enter your email"
                      className={clsx(
                        'w-full pl-12 pr-12 py-4 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none transition-colors',
                        emailError ? 'border-red-500' : isValidLogin ? 'border-emerald-500' : 'border-white/10 focus:border-emerald-500/50'
                      )}
                    />
                    {isValidLogin && <CheckCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />}
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="phone-login" className="text-sm font-medium text-white/60 mb-2 block">
                    Phone Number
                  </label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <input
                      id="phone-login"
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setError(''); }}
                      onBlur={() => setTouched({ ...touched, phone: true })}
                      placeholder="+65 9XXX XXXX"
                      className={clsx(
                        'w-full pl-12 pr-12 py-4 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none transition-colors',
                        phoneError ? 'border-red-500' : isValidLogin ? 'border-emerald-500' : 'border-white/10 focus:border-emerald-500/50'
                      )}
                    />
                    {isValidLogin && <CheckCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircleIcon className="h-4 w-4" />
                  {error}
                </p>
              )}

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
                    Continue
                    <ArrowRightIcon className="h-5 w-5" />
                  </>
                )}
              </button>

              {/* Demo login divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#020817] px-3 text-white/30">or try demo</span>
                </div>
              </div>

              {/* Demo Sarah button */}
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
                <span>Login as Sarah (Demo)</span>
              </button>
            </form>
          </div>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <div className="w-full max-w-sm">
            <div className="mb-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <SendIcon className="h-5 w-5" />
                <span className="font-semibold">Sign up via Telegram</span>
              </div>
              <p className="text-sm text-white/50">No email required. Just your name and phone number.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-white/60 mb-2 block">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    onBlur={() => setTouched({ ...touched, name: true })}
                    placeholder="Enter your full name"
                    className={clsx(
                      'w-full pl-12 pr-4 py-4 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none transition-colors',
                      nameError ? 'border-red-500' : 'border-white/10 focus:border-emerald-500/50'
                    )}
                  />
                </div>
                {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
              </div>

              <div>
                <label htmlFor="phone-signup" className="text-sm font-medium text-white/60 mb-2 block">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <input
                    id="phone-signup"
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    onBlur={() => setTouched({ ...touched, phone: true })}
                    placeholder="+65 9XXX XXXX"
                    className={clsx(
                      'w-full pl-12 pr-4 py-4 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none transition-colors',
                      phoneError ? 'border-red-500' : 'border-white/10 focus:border-emerald-500/50'
                    )}
                  />
                </div>
                {phoneError && <p className="text-xs text-red-400 mt-1">{phoneError}</p>}
              </div>

              <div>
                <label htmlFor="telegram" className="text-sm font-medium text-white/60 mb-2 block">
                  Telegram Username <span className="text-white/30">(optional)</span>
                </label>
                <div className="relative">
                  <SendIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <input
                    id="telegram"
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value.replace('@', ''))}
                    placeholder="@username"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#0a1628] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircleIcon className="h-4 w-4" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !isValidSignup}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRightIcon className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-white/30 text-center mt-4">
                Your account will be pending approval. Once approved, you can browse and apply for jobs.
              </p>
            </form>
          </div>
        )}
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
