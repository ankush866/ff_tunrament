import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Gamepad2,
  ArrowRight,
  ExternalLink,
  Shield,
  Key
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

  // User Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Admin Login fields
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regFfUid, setRegFfUid] = useState('');
  const [regFfIgn, setRegFfIgn] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Forgot password fields
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

  // 1. Warrior / User Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid username/email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Admin Login Handler (Strict Super Admin verification)
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(adminIdentifier.trim(), adminPassword);
      // Fetch authenticated user profile to strictly verify administrative role
      const res = await apiRequest<{ user: any }>('/auth/me');
      const isStaff = res.user && ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(res.user.role);

      if (!isStaff) {
        logout();
        setError('Access Denied: This portal is strictly for authorized Flaxy Administrators (ankushsharma).');
        return;
      }

      onClose();
      if (onNavigate) {
        onNavigate('admin');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Admin credentials. Access restricted.');
    } finally {
      setLoading(false);
    }
  };

  // 3. New User Registration Handler
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
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Forgot Password Request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string; demo_reset_token?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      setSuccessMsg(res.message);
      if (res.demo_reset_token) {
        setDemoResetToken(res.demo_reset_token);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Password Reset with Token
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
        setSuccessMsg('Password updated! You can now sign in with your new password.');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 text-center shrink-0">
          <div className={`inline-flex p-3 rounded-2xl mb-3 border ${
            mode === 'admin_login'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : mode === 'register'
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {mode === 'admin_login' ? (
              <Shield className="w-7 h-7" />
            ) : mode === 'register' ? (
              <Gamepad2 className="w-7 h-7" />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>
          <h3 className="font-gaming font-extrabold text-2xl text-white tracking-wide">
            {mode === 'login' && 'WARRIOR SIGN IN'}
            {mode === 'register' && 'NEW PLAYER REGISTRATION'}
            {mode === 'admin_login' && 'ADMIN COMMAND PORTAL'}
            {mode === 'forgot' && 'RESET PASSWORD'}
            {mode === 'reset' && 'ENTER NEW PASSWORD'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Enter your registered credentials to join Free Fire tournaments.'}
            {mode === 'register' && 'Register your Free Fire UID to participate and win verified payouts.'}
            {mode === 'admin_login' && 'Restricted to authorized Flaxy tournament operators and administrators.'}
            {mode === 'forgot' && 'Enter your registered email to receive a secure password reset link.'}
            {mode === 'reset' && 'Create a strong new password for your warrior account.'}
          </p>
        </div>

        {/* 3 Main Mode Toggles: User Login | New Register | Admin Login */}
        {(mode === 'login' || mode === 'register' || mode === 'admin_login') && (
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('login');
              }}
              className={`flex-1 py-2 text-xs font-gaming font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('register');
              }}
              className={`flex-1 py-2 text-xs font-gaming font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('admin_login');
              }}
              className={`flex-1 py-2 text-xs font-gaming font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'admin_login'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/30'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Form Container */}
        <div className="overflow-y-auto flex-1 pr-1">
          {/* 1. USER LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Player Username or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your registered username or email"
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Account Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('forgot');
                    }}
                    className="text-xs text-orange-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 text-sm tracking-wider"
              >
                {loading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN AS WARRIOR'}
              </button>

              <div className="text-center pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>New player?</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="text-orange-400 font-semibold hover:underline"
                >
                  Create New Account →
                </button>
              </div>
            </form>
          )}

          {/* 2. NEW PLAYER REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. warrior_ff"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Free Fire UID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1948275931"
                    value={regFfUid}
                    onChange={e => setRegFfUid(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    In-Game Name (IGN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLAXY_OP"
                    value={regFfIgn}
                    onChange={e => setRegFfIgn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Player Full Name"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password (min 6 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 text-sm tracking-wider"
              >
                {loading ? 'CHECKING & REGISTERING...' : 'COMPLETE REGISTRATION'}
              </button>

              <div className="text-center pt-2 text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="text-orange-400 font-semibold hover:underline"
                >
                  Sign In to Account
                </button>
              </div>
            </form>
          )}

          {/* 3. ADMIN PORTAL FORM */}
          {mode === 'admin_login' && (
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-[11px] text-amber-300 leading-tight">
                  <strong className="font-bold block text-white">Administrator Restricted Gateway</strong>
                  Only verified head administrator and tournament staff credentials can access the Command Center.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="ankushsharma"
                    value={adminIdentifier}
                    onChange={e => setAdminIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Security Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-gaming font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 text-sm tracking-wider flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-slate-950" />
                <span>{loading ? 'AUTHENTICATING ADMIN...' : 'ENTER ADMIN COMMAND CENTER'}</span>
              </button>

              <div className="text-center pt-2 text-xs text-slate-400">
                Are you a tournament player?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="text-orange-400 font-semibold hover:underline"
                >
                  Switch to Player Login
                </button>
              </div>
            </form>
          )}

          {/* 4. FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="your_email@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold rounded-xl transition-all disabled:opacity-50 text-sm tracking-wider"
              >
                {loading ? 'CHECKING EMAIL...' : 'GET 6-DIGIT RESET OTP'}
              </button>

              {demoResetToken && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2">
                  <div className="text-amber-400 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><KeyRound className="w-4 h-4" /> Reset OTP:</span>
                    <span className="font-mono font-extrabold text-base text-white tracking-widest bg-slate-950 px-2.5 py-0.5 rounded border border-amber-500/40">{demoResetToken}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetToken(demoResetToken);
                      setMode('reset');
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <span>Use OTP to Enter New Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="pt-2 text-center text-xs text-slate-400 space-y-2">
                <div>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('login');
                    }}
                    className="text-orange-400 font-semibold hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 5. RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reset Token / OTP
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold rounded-xl transition-all disabled:opacity-50 text-sm tracking-wider"
              >
                {loading ? 'UPDATING PASSWORD...' : 'SET NEW PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
