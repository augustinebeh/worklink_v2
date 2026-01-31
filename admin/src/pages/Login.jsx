import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/ui/Logo';
import { AlertCircleIcon } from 'lucide-react';

// Validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const { login } = useAuth();
  const navigate = useNavigate();

  // Real-time validation
  const validateEmail = useCallback((value) => {
    if (!value.trim()) return 'Email is required';
    if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email';
    return '';
  }, []);

  const validatePassword = useCallback((value) => {
    if (!value) return 'Password is required';
    if (value.length < 4) return 'Password must be at least 4 characters';
    return '';
  }, []);

  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';
  const isEmailValid = email && !validateEmail(email);
  const isPasswordValid = password && !validatePassword(password);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr || passwordErr) {
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Invalid credentials');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2" role="alert">
                <AlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              placeholder="admin@worklink.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              error={emailError}
              success={isEmailValid ? 'Valid email' : ''}
              required
            />

            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              error={passwordError}
              success={isPasswordValid ? 'Valid password' : ''}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          © 2025 WorkLink Singapore. All rights reserved.
        </p>
      </div>
    </div>
  );
}
