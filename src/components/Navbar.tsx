import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Bell,
  User as UserIcon,
  Shield,
  LogOut,
  Menu,
  X,
  Wallet,
  Users,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { apiRequest, formatISTDateTime } from '../lib/api.js';
import { DEFAULT_PLAYER_AVATAR, getSafeImageUrl } from '../lib/assets.js';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register' | 'admin_login') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user, logout, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [siteName, setSiteName] = useState('FLAXY ESPORTS');

  useEffect(() => {
    apiRequest<{ announcements: any[] }>('/announcements')
      .then(res => setAnnouncements(res.announcements || []))
      .catch(() => {});

    const loadSiteName = () => {
      apiRequest<{ settings: Record<string, string> }>('/settings/public')
        .then(res => {
          if (res.settings?.site_name) setSiteName(res.settings.site_name);
        })
        .catch(() => {});
    };

    loadSiteName();
    window.addEventListener('flaxy_settings_updated', loadSiteName);
    return () => window.removeEventListener('flaxy_settings_updated', loadSiteName);
  }, []);

  const isStaff = user && ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(user.role);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'tournaments', label: 'Match' },
    { id: 'live-rooms', label: 'Live Room' },
    { id: 'leaderboard', label: 'Rankings' },
    { id: 'faq', label: 'FAQ' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Compact Urgent Banner */}
      {announcements.length > 0 && announcements[0].is_banner_visible === 1 && (
        <div className={`px-3 py-1 text-xs text-center font-medium flex items-center justify-center gap-2 ${
          announcements[0].banner_type === 'urgent'
            ? 'bg-orange-600 text-white font-semibold'
            : 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-b border-orange-200 dark:border-orange-500/20'
        }`}>
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{announcements[0].title}</span>
        </div>
      )}

      {/* Main Single-Row Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none min-w-0 text-left shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-sm shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-gaming font-bold text-base sm:text-lg tracking-wide text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            {siteName}
          </span>
        </button>

        {/* Zone 2: Clean Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => {
            const isActive =
              currentView === link.id ||
              (link.id === 'tournaments' && currentView === 'tournament-detail');
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {link.label}
              </button>
            );
          })}
          {user && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard', { tab: 'payments' })}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'dashboard'
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              Wallet
            </button>
          )}
        </nav>

        {/* Zone 3: 1-Click Theme Switch, Admin, Notifications, Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* 1-Click Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Admin Panel Direct Button (if staff) */}
          {isStaff && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Notifications */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                aria-label="Notifications"
                title="Notifications"
                className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1.5 relative transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  unreadCount > 0
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400'
                    : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs font-semibold">Alerts</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 min-w-[18px] h-[18px] bg-orange-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-orange-500" />
                      Notifications
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        aria-label="Close notifications"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 mt-2 space-y-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!item.is_read) markNotificationRead(item.id);
                          }}
                          className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                            item.is_read
                              ? 'opacity-75 hover:opacity-100'
                              : 'bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{item.message}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{formatISTDateTime(item.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Dropdown or Login CTA */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="min-h-[40px] flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              >
                <img
                  src={getSafeImageUrl(user.avatar_url, DEFAULT_PLAYER_AVATAR)}
                  alt={user.username}
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                  className="w-7 h-7 rounded-lg object-cover border border-orange-500/40 shrink-0"
                />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 hidden sm:inline max-w-[100px] truncate">
                  {user.free_fire_ign || user.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block shrink-0" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-1">
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{user.full_name || user.username}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onNavigate('dashboard', { tab: 'overview' }); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-orange-500" />
                    <span>My Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onNavigate('dashboard', { tab: 'payments' }); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span>Wallet & Payments</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onNavigate('dashboard', { tab: 'tournaments' }); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>My Matches</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onNavigate('dashboard', { tab: 'teams' }); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-cyan-500" />
                    <span>Duo Teams</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onNavigate('dashboard', { tab: 'support' }); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-purple-500" />
                    <span>Support Tickets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onNavigate('dashboard', { tab: 'settings' }); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Account Settings</span>
                  </button>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => { setShowUserMenu(false); onNavigate('admin'); }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="min-h-[40px] px-4 py-2 text-xs font-gaming font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Login</span>
            </button>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden min-h-[40px] min-w-[40px] p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Compact Mobile Drawer */}
      {showMobileMenu && (
        <div className="lg:hidden bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1.5">
          {navLinks.map(link => (
            <button
              key={link.id}
              type="button"
              onClick={() => { setShowMobileMenu(false); onNavigate(link.id); }}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {link.label}
            </button>
          ))}
          {isStaff && (
            <button
              type="button"
              onClick={() => { setShowMobileMenu(false); onNavigate('admin'); }}
              className="w-full text-left px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-xl font-bold flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
          {!user ? (
            <button
              type="button"
              onClick={() => { setShowMobileMenu(false); onOpenAuth('login'); }}
              className="w-full mt-2 py-2.5 px-4 text-xs font-gaming font-bold bg-orange-600 text-white rounded-xl flex items-center justify-center gap-2"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login / Register</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setShowMobileMenu(false); logout(); }}
              className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out ({user.username})</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
