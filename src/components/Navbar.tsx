import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Bell,
  User as UserIcon,
  Shield,
  LogOut,
  X,
  Wallet,
  Users,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  MoreVertical,
  Swords,
  FileText
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

  const policyLinks = [
    { slug: 'privacy-policy', label: 'Privacy Policy' },
    { slug: 'terms-and-conditions', label: 'Terms & Conditions' },
    { slug: 'refund-policy', label: 'Refund Policy' },
    { slug: 'tournament-rules', label: 'Tournament Rules' }
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

      {/* Main Single-Row Top Bar (Brand truncates safely so 3-Dot is ALWAYS visible on mobile) */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1 lg:flex-initial text-left"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-sm shrink-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="font-gaming font-bold text-sm sm:text-lg tracking-wide text-slate-900 dark:text-white truncate">
            {siteName}
          </span>
        </button>

        {/* Zone 2: Clean Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0">
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
        </nav>

        {/* Zone 3: Theme, Admin, Alerts, Profile, Always-Visible 3-Dot Menu */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1-Click Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
              title="Admin Panel"
              className={`h-9 sm:h-10 px-2 sm:px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
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
                  setShowMobileMenu(false);
                }}
                aria-label="Notifications"
                title="Notifications"
                className={`h-9 sm:h-10 px-2 sm:px-3 rounded-xl border flex items-center justify-center gap-1.5 relative transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  unreadCount > 0
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400'
                    : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs font-semibold">Alerts</span>
                {unreadCount > 0 && (
                  <span className="px-1 min-w-[16px] h-4 bg-orange-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center tabular-nums">
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
                  <div className="max-h-[65dvh] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] divide-y divide-slate-100 dark:divide-slate-800/70 mt-2 space-y-1">
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

          {/* User Profile Badge (opens Profile directly) or Login CTA */}
          {user ? (
            <button
              type="button"
              onClick={() => {
                setShowNotifications(false);
                setShowMobileMenu(false);
                onNavigate('dashboard', { tab: 'overview' });
              }}
              title="Open Profile"
              className="h-9 sm:h-10 flex items-center gap-1.5 px-1.5 sm:px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <img
                src={getSafeImageUrl(user.avatar_url, DEFAULT_PLAYER_AVATAR)}
                alt={user.username}
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-orange-500/40 shrink-0"
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 hidden sm:inline max-w-[90px] truncate">
                {user.free_fire_ign || user.username}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="h-9 sm:h-10 px-3 sm:px-4 text-xs font-gaming font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Login</span>
            </button>
          )}

          {/* Always-Visible 3-Dot Menu (Mobile + Desktop) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowMobileMenu(!showMobileMenu);
                setShowNotifications(false);
              }}
              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                showMobileMenu
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              aria-label="Open 3-dot menu"
              title="Menu"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
            </button>

            {showMobileMenu && (
              <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 space-y-3 max-h-[82dvh] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] z-50">
                {user && (
                  <div className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <img
                      src={getSafeImageUrl(user.avatar_url, DEFAULT_PLAYER_AVATAR)}
                      alt={user.username}
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                      className="w-9 h-9 rounded-xl object-cover border border-orange-500/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        @{user.username} · {user.email}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Navigation Links */}
                <div className="lg:hidden space-y-1">
                  {navLinks.map(link => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onNavigate(link.id); }}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>

                {user && (
                  <div className="pt-1 lg:pt-0 lg:border-t-0 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Account Options
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { tab: 'overview', label: 'Profile', icon: UserIcon, color: 'text-orange-500' },
                        { tab: 'payments', label: 'Wallet', icon: Wallet, color: 'text-emerald-500' },
                        { tab: 'tournaments', label: 'Joined', icon: Trophy, color: 'text-amber-500' },
                        { tab: 'matches', label: 'History', icon: Swords, color: 'text-red-500' },
                        { tab: 'teams', label: 'Teams', icon: Users, color: 'text-cyan-500' },
                        { tab: 'notifications', label: 'Alerts', icon: Bell, color: 'text-orange-500', badge: unreadCount },
                        { tab: 'support', label: 'Support', icon: HelpCircle, color: 'text-purple-500' },
                        { tab: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-500' }
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.tab}
                            type="button"
                            onClick={() => { setShowMobileMenu(false); onNavigate('dashboard', { tab: item.tab }); }}
                            className="text-left px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-1.5 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                              <span className="truncate">{item.label}</span>
                            </span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-600 text-white tabular-nums shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Policies, Info & Founder */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Policies &amp; Info
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowMobileMenu(false); onNavigate('about'); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>About the Founder</span>
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    {policyLinks.map(pol => (
                      <button
                        key={pol.slug}
                        type="button"
                        onClick={() => { setShowMobileMenu(false); onNavigate('page', { slug: pol.slug }); }}
                        className="text-left px-2.5 py-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{pol.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {isStaff ? (
                  <button
                    type="button"
                    onClick={() => { setShowMobileMenu(false); onNavigate('admin'); }}
                    className="w-full text-left px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Admin Panel</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowMobileMenu(false); onOpenAuth('admin_login'); }}
                    className="w-full text-left px-3 py-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>Admin Login</span>
                  </button>
                )}

                {!user ? (
                  <button
                    type="button"
                    onClick={() => { setShowMobileMenu(false); onOpenAuth('login'); }}
                    className="w-full py-2.5 px-4 text-xs font-gaming font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Login / Register</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowMobileMenu(false); logout(); }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/25 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
