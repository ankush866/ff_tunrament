import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Gamepad2,
  ArrowRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../lib/api.js';

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
  const { login, register, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'admin_login' | 'forgot' | 'reset'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regFfUid, setRegFfUid] = useState('');
  const [regFfIgn, setRegFfIgn] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [demoResetToken, setDemoResetToken] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(adminIdentifier.trim(), adminPassword);
      const res = await apiRequest<{ user: any }>('/auth/me');
      const isStaff = res.user && ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(res.user.role);

      if (!isStaff) {
        logout();
        setError('Access Denied: Restricted to authorized administrators.');
        return;
      }

      onClose();
      if (onNavigate) onNavigate('admin');
    } catch (err: any) {
      setError(err.message || 'Invalid Admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        free_fire_uid: regFfUid.trim(),
        free_fire_ign: regFfIgn.trim(),
        phone: regPhone.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string; demo_reset_token?: string; otp_code?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotEmail.trim(), email: forgotEmail.trim() })
      });
      setSuccessMsg(res.message);
      const code = res.otp_code || res.demo_reset_token;
      if (code) {
        setDemoResetToken(code);
        setResetToken(code);
        setTimeout(() => setMode('reset'), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Account not found. Try email, username, or Free Fire UID.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken.trim(), newPassword })
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('login');
        setSuccessMsg('Password updated! You can now sign in.');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 max-h-[92vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
            {mode === 'login' && 'Player Login'}
            {mode === 'register' && 'New Registration'}
            {mode === 'admin_login' && 'Admin Login'}
            {mode === 'forgot' && 'Forgot Password'}
            {mode === 'reset' && 'Set New Password'}
          </h3>
        </div>

        {/* Mode Switcher */}
        {(mode === 'login' || mode === 'register' || mode === 'admin_login') && (
          <div className="grid grid-cols-3 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-1">
            <button
              type="button"
              onClick={() => { setError(null); setMode('login'); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
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
              className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setError(null); setMode('admin_login'); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                mode === 'admin_login'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
              }`}
            >
              Admin
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-0.5">
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter username or email"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setError(null); setMode('forgot'); }}
                    className="text-xs text-orange-600 dark:text-orange-400 font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input type="text" required placeholder="warrior_ff" value={regUsername} onChange={e => setRegUsername(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input type="email" required placeholder="you@mail.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Free Fire UID *</label>
                  <input type="text" required placeholder="1948275931" value={regFfUid} onChange={e => setRegFfUid(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">In-Game Name *</label>
                  <input type="text" required placeholder="FLAXY_OP" value={regFfIgn} onChange={e => setRegFfIgn(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input type="text" placeholder="Your Full Name" value={regFullName} onChange={e => setRegFullName(e.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">WhatsApp *</label>
                  <input type="tel" required placeholder="9876543210" value={regPhone} onChange={e => setRegPhone(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <input type="password" required placeholder="Min 6 chars" value={regPassword} onChange={e => setRegPassword(e.target.value)} className={inputClass} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'admin_login' && (
            <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter admin username"
                  value={adminIdentifier}
                  onChange={e => setAdminIdentifier(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-gaming font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>{loading ? 'Signing In...' : 'Open Admin Panel'}</span>
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email, Username, or Free Fire UID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter email, username, or UID"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Checking...' : 'Get 6-Digit Reset Code'}
              </button>

              {demoResetToken && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2">
                  <div className="text-amber-700 dark:text-amber-400 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><KeyRound className="w-4 h-4" /> Reset OTP:</span>
                    <span className="font-mono font-bold text-base text-slate-900 dark:text-white tracking-widest bg-white dark:bg-slate-950 px-2.5 py-0.5 rounded border border-amber-500/40">{demoResetToken}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setResetToken(demoResetToken); setMode('reset'); }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Set New Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="text-center text-xs text-slate-500 pt-1">
                <button type="button" onClick={() => { setError(null); setMode('login'); }} className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reset OTP</label>
                <input type="text" required value={resetToken} onChange={e => setResetToken(e.target.value)} className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password (min 6 chars)</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Updating...' : 'Save New Password'}
              </button>
              <div className="text-center text-xs text-slate-500 pt-1">
                <button type="button" onClick={() => { setError(null); setMode('login'); }} className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
