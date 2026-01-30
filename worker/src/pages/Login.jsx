import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailIcon, ArrowRightIcon, ZapIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email);
    
    if (result.success) {
      navigate('/');
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
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
            <ZapIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">TalentVis</h1>
          <p className="text-dark-400 mt-2">Find gigs. Earn rewards. Level up.</p>
        </div>

        {/* Login form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-dark-300 mb-2 block">Email Address</label>
              <div className="relative">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-600 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  Continue
                  <ArrowRightIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-center text-dark-500 text-sm mb-4">Or try a demo account</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => quickLogin('sarah.tan@email.com')}
                disabled={loading}
                className="p-3 rounded-xl bg-dark-800/50 border border-white/5 text-sm hover:bg-dark-800 transition-colors"
              >
                <p className="text-white font-medium">Sarah Tan</p>
                <p className="text-dark-500 text-xs">Level 10</p>
              </button>
              <button
                onClick={() => quickLogin('rizal.m@email.com')}
                disabled={loading}
                className="p-3 rounded-xl bg-dark-800/50 border border-white/5 text-sm hover:bg-dark-800 transition-colors"
              >
                <p className="text-white font-medium">Muhammad Rizal</p>
                <p className="text-dark-500 text-xs">Level 10</p>
              </button>
              <button
                onClick={() => quickLogin('amanda.c@email.com')}
                disabled={loading}
                className="p-3 rounded-xl bg-dark-800/50 border border-white/5 text-sm hover:bg-dark-800 transition-colors"
              >
                <p className="text-white font-medium">Amanda Chen</p>
                <p className="text-dark-500 text-xs">Level 10</p>
              </button>
              <button
                onClick={() => quickLogin('weijie@email.com')}
                disabled={loading}
                className="p-3 rounded-xl bg-dark-800/50 border border-white/5 text-sm hover:bg-dark-800 transition-colors"
              >
                <p className="text-white font-medium">Wei Jie</p>
                <p className="text-dark-500 text-xs">New User</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-dark-600 text-xs">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
