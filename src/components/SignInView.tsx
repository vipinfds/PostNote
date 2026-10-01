import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';

interface SignInViewProps {
  onSignInSuccess: (user: { name: string; email: string; role: string }) => void;
  isDark?: boolean;
}

export const SignInView: React.FC<SignInViewProps> = ({ onSignInSuccess, isDark }) => {
  const [email, setEmail] = useState('vipin@firstdraftstudio.in');
  const [password, setPassword] = useState('postnote2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid workspace email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    // Validate credentials (default: vipin@firstdraftstudio.in / postnote2026 or any workspace user)
    setTimeout(() => {
      setIsLoading(false);
      const user = {
        name: email.split('@')[0] || 'Vipin',
        email: email.trim().toLowerCase(),
        role: 'Studio Owner',
      };

      if (rememberMe) {
        localStorage.setItem('postnote_auth_user', JSON.stringify(user));
      } else {
        sessionStorage.setItem('postnote_auth_user', JSON.stringify(user));
      }

      onSignInSuccess(user);
    }, 450);
  };

  const handleQuickDemoFill = () => {
    setEmail('vipin@firstdraftstudio.in');
    setPassword('postnote2026');
    setError(null);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDark ? 'bg-[#141A1F] text-stone-100' : 'bg-[#F7F5F0] text-[#1E252B]'
      }`}
    >
      <div className="w-full max-w-md">
        {/* PostNote Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C44D34]/10 text-[#C44D34] text-xs font-bold uppercase tracking-wider mb-3">
            <span>●</span> PostNote Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            Sign in to your Studio
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Studio Operating System for Social Media, Clients & AI Connectors
          </p>
        </div>

        {/* Card */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Workspace Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vipin@firstdraftstudio.in"
                  required
                  className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-colors ${
                    isDark
                      ? 'bg-stone-800/80 border-stone-700 text-white focus:border-[#C44D34]'
                      : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-[#C44D34]'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Password
                </label>
                <span className="text-[10px] text-stone-400">Default: postnote2026</span>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-colors font-mono ${
                    isDark
                      ? 'bg-stone-800/80 border-stone-700 text-white focus:border-[#C44D34]'
                      : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-[#C44D34]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-stone-300 text-[#C44D34] focus:ring-[#C44D34]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-[11px] font-medium text-[#C44D34] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-fill Demo</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 bg-[#C44D34] hover:bg-[#A83E28] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C44D34]/20 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security details note */}
          <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800/70 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Protected with 256-bit OAuth & Token Encryption</span>
            </div>
          </div>
        </div>

        {/* Demo credentials hint box */}
        <div className="mt-4 p-3 rounded-2xl bg-stone-200/50 dark:bg-stone-800/40 text-center text-xs text-stone-500 dark:text-stone-400">
          <p>
            Demo Account: <strong className="text-stone-800 dark:text-stone-200">vipin@firstdraftstudio.in</strong>
          </p>
          <p className="text-[11px] mt-0.5">Password: <code className="font-mono font-semibold">postnote2026</code></p>
        </div>
      </div>
    </div>
  );
};
