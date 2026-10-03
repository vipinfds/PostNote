import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  UserPlus,
  LogIn,
  Info,
} from 'lucide-react';
import {
  signInWithGoogle,
  firebaseSignUpWithEmail,
  firebaseSignInWithEmail,
  ensureFirestoreWorkspace,
} from '../firebase';
import { WorkspaceSummary } from '../types';

export interface AuthenticatedUser {
  name: string;
  email: string;
  role: string;
  uid?: string;
  personalWorkspaceId?: string;
}

interface SignInViewProps {
  onSignInSuccess: (user: AuthenticatedUser, workspaces?: WorkspaceSummary[]) => void;
  isDark?: boolean;
}

function formatReadableAuthError(rawError: unknown): string {
  const raw = rawError instanceof Error ? rawError.message : String(rawError || '');
  if (!raw) return 'Authentication failed. Please try again.';

  // Check if it's a JSON string from FirestoreErrorInfo
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        return String(parsed.error);
      }
    } catch {
      // ignore JSON parse failure
    }
  }

  if (raw.includes('auth/popup-blocked')) {
    return 'Browser blocked the Google sign-in popup. Please allow popups for this site or sign in with Email below.';
  }
  if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
    return 'Google sign-in popup was closed before completing.';
  }
  if (raw.includes('auth/unauthorized-domain')) {
    return 'This preview domain is not yet authorized in Firebase Console -> Authentication -> Settings -> Authorized domains. Please use Email Sign-In/Sign-Up below.';
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return 'This sign-in provider is not enabled in Firebase Console yet. Please use Email Sign-In/Sign-Up below.';
  }

  return raw;
}

export const SignInView: React.FC<SignInViewProps> = ({ onSignInSuccess, isDark }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showFirebaseEmailGuide, setShowFirebaseEmailGuide] = useState(false);

  const persistSession = (userObj: AuthenticatedUser) => {
    try {
      if (rememberMe) {
        localStorage.setItem('postnote_auth_user', JSON.stringify(userObj));
      } else {
        sessionStorage.setItem('postnote_auth_user', JSON.stringify(userObj));
      }
    } catch {
      // storage fallback
    }
  };

  const makeFallbackWorkspaceId = (cleanEmail: string) => {
    if (cleanEmail === 'vipin@firstdraftstudio.in') return 'ws_vipin';
    return 'ws_' + cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 60);
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const fbUser = await signInWithGoogle();
      const userEmail = (fbUser.email || '').trim().toLowerCase();
      if (!userEmail) {
        throw new Error('Could not retrieve email address from Google account.');
      }
      const displayName = fbUser.displayName || userEmail.split('@')[0] || 'Studio Owner';
      const fallbackWsId = makeFallbackWorkspaceId(userEmail);

      let authUser: AuthenticatedUser = {
        name: displayName,
        email: userEmail,
        role: 'Owner',
        uid: fbUser.uid,
        personalWorkspaceId: fallbackWsId,
      };
      let userWorkspaces: WorkspaceSummary[] | undefined;

      try {
        const res = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            name: displayName,
            provider: 'google',
          }),
        });
        const data = await res.json();
        if (res.ok && data?.user) {
          authUser = {
            name: data.user.name || displayName,
            email: data.user.email || userEmail,
            role: data.user.role || 'Owner',
            uid: fbUser.uid,
            personalWorkspaceId: data.user.personalWorkspaceId || fallbackWsId,
          };
          userWorkspaces = data.workspaces;
        }
      } catch {
        // Fallback to local session if backend route is unreachable
      }

      // Non-blocking background Firestore sync so rules/network never block login
      ensureFirestoreWorkspace(
        authUser.personalWorkspaceId || fallbackWsId,
        `${authUser.name}'s Studio`
      ).catch(() => {});

      persistSession(authUser);
      onSignInSuccess(authUser, userWorkspaces);
    } catch (err: any) {
      const msg = formatReadableAuthError(err);
      if (!msg.includes('popup was closed')) {
        setError(msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name or studio name.');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      let firebaseUid: string | undefined;
      // Attempt native Firebase Email/Password auth in background if enabled in Firebase Console
      try {
        if (authMode === 'signup') {
          const fbUser = await firebaseSignUpWithEmail(name.trim(), cleanEmail, password);
          firebaseUid = fbUser.uid;
        } else {
          const fbUser = await firebaseSignInWithEmail(cleanEmail, password);
          firebaseUid = fbUser.uid;
        }
      } catch {
        // Native Firebase Email/Password may not be toggled on in Firebase Console yet;
        // our multi-tenant backend handles account authentication & isolation seamlessly.
      }

      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          password,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.error || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      const fallbackWsId = makeFallbackWorkspaceId(cleanEmail);
      const resolvedName = data?.user?.name || name.trim() || cleanEmail.split('@')[0] || 'Studio Owner';
      const resolvedWsId = data?.user?.personalWorkspaceId || fallbackWsId;

      const authUser: AuthenticatedUser = {
        name: resolvedName,
        email: data?.user?.email || cleanEmail,
        role: data?.user?.role || 'Owner',
        uid: firebaseUid,
        personalWorkspaceId: resolvedWsId,
      };

      // Non-blocking Firestore workspace initialization
      if (firebaseUid && resolvedWsId) {
        ensureFirestoreWorkspace(resolvedWsId, `${authUser.name}'s Studio`).catch(() => {});
      }

      persistSession(authUser);
      onSignInSuccess(authUser, data?.workspaces);
    } catch (err: any) {
      setError(formatReadableAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLoadAndSignIn = async () => {
    setError(null);
    setAuthMode('signin');
    const demoEmail = 'vipin@firstdraftstudio.in';
    const demoPass = 'postnote2026';
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          password: demoPass,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        const authUser: AuthenticatedUser = {
          name: data.user.name || 'Vipin',
          email: data.user.email || demoEmail,
          role: data.user.role || 'Owner',
          personalWorkspaceId: data.user.personalWorkspaceId || 'ws_vipin',
        };
        persistSession(authUser);
        onSignInSuccess(authUser, data.workspaces);
        return;
      }
      setError(data?.error || 'Could not sign in with Owner account.');
    } catch (err: any) {
      setError(formatReadableAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDark ? 'bg-[#141A1F] text-stone-100' : 'bg-[#F7F5F0] text-[#1E252B]'
      }`}
    >
      <div className="w-full max-w-md">
        {/* PostNote Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C44D34]/10 text-[#C44D34] text-xs font-bold uppercase tracking-wider mb-3">
            <span>●</span> PostNote Private Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            {authMode === 'signin' ? 'Sign in to your Studio' : 'Create Private Account'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            {authMode === 'signin'
              ? 'Access your isolated workspace or shared team studios'
              : 'Every account gets a 100% private workspace & role-based team controls'}
          </p>
        </div>

        {/* Card */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-[#1D242C] border-[#2A3440]' : 'bg-white border-[#E8E4DC]'
          }`}
        >
          {/* Sign In / Sign Up Mode Tabs */}
          <div
            className={`grid grid-cols-2 p-1 rounded-2xl mb-5 border ${
              isDark ? 'bg-[#151B21] border-[#2A3440]' : 'bg-[#F5F2EB] border-[#E8E4DC]'
            }`}
          >
            <button
              type="button"
              id="auth-tab-signin"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-[#C44D34] text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              id="auth-tab-signup"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-[#C44D34] text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>

          {error && (
            <div
              id="auth-error-banner"
              className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
            >
              <span className="font-bold shrink-0">Notice:</span>
              <span className="break-words">{error}</span>
            </div>
          )}

          {/* Google Sign-In Button (Firebase Auth) */}
          <button
            type="button"
            id="google-auth-btn"
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading || isLoading}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer mb-4 ${
              isDark
                ? 'bg-[#252E38] border-[#34414D] text-white hover:bg-[#2C3744]'
                : 'bg-white border-stone-300 text-stone-800 hover:bg-stone-50 shadow-2xs'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>
              {isGoogleLoading
                ? 'Connecting Google Account...'
                : authMode === 'signin'
                ? 'Continue with Google'
                : 'Sign up with Google'}
            </span>
          </button>

          <div className="relative flex py-1.5 items-center mb-4">
            <div className="flex-grow border-t border-stone-200 dark:border-stone-800" />
            <span className="shrink-0 mx-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Or with Email
            </span>
            <div className="flex-grow border-t border-stone-200 dark:border-stone-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {authMode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Your Name or Studio Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                  <input
                    id="auth-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    maxLength={100}
                    className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-colors ${
                      isDark
                        ? 'bg-stone-800/80 border-stone-700 text-white focus:border-[#C44D34]'
                        : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-[#C44D34]'
                    }`}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Workspace Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourstudio.com"
                  maxLength={150}
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
                <span className="text-[10px] text-stone-400">Min. 6 characters</span>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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

            {authMode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                  <input
                    id="auth-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-colors font-mono ${
                      isDark
                        ? 'bg-stone-800/80 border-stone-700 text-white focus:border-[#C44D34]'
                        : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-[#C44D34]'
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-stone-300 text-[#C44D34] focus:ring-[#C44D34]"
                />
                <span>Keep me signed in</span>
              </label>

              <button
                type="button"
                id="owner-demo-login-btn"
                onClick={handleQuickDemoLoadAndSignIn}
                className="text-[11px] font-medium text-[#C44D34] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Instant Owner Sign-In</span>
              </button>
            </div>

            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 py-3 px-4 bg-[#C44D34] hover:bg-[#A83E28] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C44D34]/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>{authMode === 'signup' ? 'Creating Private Workspace...' : 'Signing in...'}</span>
              ) : (
                <>
                  <span>
                    {authMode === 'signup' ? 'Create Account & Private Studio' : 'Sign In to Workspace'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & RBAC assurance banner */}
          <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800/70 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Private data isolation — only invited team members can access your studio</span>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowFirebaseEmailGuide((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline cursor-pointer"
              >
                <Info className="w-3 h-3" />
                <span>Firebase Console Email/Password Provider Info</span>
              </button>
            </div>

            {showFirebaseEmailGuide && (
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/70 text-[11px] text-stone-600 dark:text-stone-300 space-y-1 text-left">
                <p className="font-bold text-stone-800 dark:text-stone-100">
                  Enabling Native Firebase Email/Password Auth:
                </p>
                <p>
                  Google Sign-In is pre-configured automatically. To also use native Firebase Auth for Email/Password in the Firebase Console:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                  <li>Open the Firebase Console for project <code>gen-lang-client-0534314559</code>.</li>
                  <li>Navigate to <strong>Build &rarr; Authentication &rarr; Sign-in method</strong>.</li>
                  <li>Click <strong>Add new provider &rarr; Email/Password</strong>, toggle <strong>Enable</strong>, and click <strong>Save</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
