import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Gamepad2,
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'admin_login' | 'forgot';
  onNavigate?: (view: string, params?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onNavigate
}) => {
  const { signInWithGoogle, logout, authError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'admin_login'>(
    initialMode === 'forgot' ? 'login' : initialMode
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regUsername, setRegUsername] = useState('');
  const [regFfUid, setRegFfUid] = useState('');
  const [regFfIgn, setRegFfIgn] = useState('');
  const [regPhone, setRegPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'forgot' ? 'login' : initialMode);
      setError(authError || null);
    }
  }, [isOpen, initialMode, authError]);

  if (!isOpen) return null;

  const handlePlayerGoogleAuth = async (withProfileDetails: boolean) => {
    setError(null);
    if (withProfileDetails) {
      const cleanUsername = regUsername.trim().replace(/[^a-zA-Z0-9_]/g, '_');
      if (cleanUsername.length < 2) {
        setError('Please enter a Username (minimum 2 letters or numbers) to identify your profile.');
        return;
      }
    }
    setLoading(true);
    try {
      const cleanUsername = regUsername.trim().replace(/[^a-zA-Z0-9_]/g, '_');
      await signInWithGoogle(
        withProfileDetails
          ? {
              username: cleanUsername,
              free_fire_uid: regFfUid.trim(),
              free_fire_ign: regFfIgn.trim(),
              phone: regPhone.trim()
            }
          : undefined
      );
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed. Please try again.');
      } else {
        setError(err?.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const signedInUser = await signInWithGoogle();
      const isStaff = ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(
        signedInUser.role
      );

      if (!isStaff) {
        await logout();
        setError('Access Denied: Sign in with an authorized Admin Google account.');
        return;
      }

      onClose();
      if (onNavigate) onNavigate('admin');
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed. Please try again.');
      } else {
        setError(err?.message || 'Admin Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500';

  const GoogleIcon = () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65 dark:bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-md max-h-[90dvh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] p-5 sm:p-6 pb-8 flex flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4 text-center shrink-0">
          <div className={`inline-flex p-2.5 rounded-2xl mb-2.5 border ${
            mode === 'admin_login'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
          }`}>
            {mode === 'admin_login' ? (
              <Shield className="w-6 h-6" />
            ) : mode === 'register' ? (
              <Gamepad2 className="w-6 h-6" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <h3 className="font-gaming font-bold text-xl text-slate-900 dark:text-white">
            {mode === 'login' && 'Player Sign In'}
            {mode === 'register' && 'Player Registration'}
            {mode === 'admin_login' && 'Admin Login'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Secured with Google Sign-In &amp; Cloud Firestore
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => { setError(null); setMode('login'); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'login'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setError(null); setMode('register'); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'register'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Player
          </button>
          <button
            type="button"
            onClick={() => { setError(null); setMode('admin_login'); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'admin_login'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
            }`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          {mode === 'login' && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                Sign in with your Google account to join Free Fire matches, track UPI status, and unlock Room IDs.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePlayerGoogleAuth(false)}
                className="w-full min-h-[46px] py-3 px-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-gaming font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon />
                <span>{loading ? 'Signing In...' : 'Continue with Google'}</span>
              </button>
            </div>
          )}

          {mode === 'register' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handlePlayerGoogleAuth(true);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username (Your Unique ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  placeholder="e.g. flaxy_king"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Free Fire UID
                  </label>
                  <input
                    type="text"
                    placeholder="1948275931"
                    value={regFfUid}
                    onChange={e => setRegFfUid(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    In-Game Name
                  </label>
                  <input
                    type="text"
                    placeholder="FLAXY_OP"
                    value={regFfIgn}
                    onChange={e => setRegFfIgn(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[46px] mt-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon />
                <span>{loading ? 'Creating Profile...' : 'Continue with Google'}</span>
              </button>
            </form>
          )}

          {mode === 'admin_login' && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                Authorized Super Admins &amp; staff sign in with their verified Admin Google account to manage matches, payments, and users.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleAdminGoogleAuth}
                className="w-full min-h-[46px] py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-gaming font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>{loading ? 'Verifying Admin...' : 'Sign In as Admin with Google'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
