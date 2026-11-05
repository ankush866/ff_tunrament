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
  CreditCard,
  Users,
  Settings,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatISTDateTime } from '../lib/api.js';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register' | 'admin_login') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user, logout, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();
  const [navItems, setNavItems] = useState<{ label: string; url: string }[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [siteName, setSiteName] = useState('FLAXY ESPORTS');

  useEffect(() => {
    // Fetch CMS navigation items
    apiRequest<{ items: any[] }>('/cms/navigation')
      .then(res => {
        const headerItems = (res.items || []).filter(item => !item.is_footer && item.is_visible);
        if (headerItems.length > 0) {
          setNavItems(headerItems);
        } else {
          // Defaults
          setNavItems([
            { label: 'Home', url: '/' },
            { label: 'Tournaments', url: '/tournaments' },
            { label: 'Live Rooms', url: '/live-rooms' },
            { label: 'Leaderboard', url: '/leaderboard' },
            { label: 'Rules', url: '/page/tournament-rules' },
            { label: 'FAQ', url: '/faq' }
          ]);
        }
      })
      .catch(() => {
        setNavItems([
          { label: 'Home', url: '/' },
          { label: 'Tournaments', url: '/tournaments' },
          { label: 'Live Rooms', url: '/live-rooms' },
          { label: 'Leaderboard', url: '/leaderboard' },
          { label: 'Rules', url: '/page/tournament-rules' },
          { label: 'FAQ', url: '/faq' }
        ]);
      });

    // Fetch announcements
    apiRequest<{ announcements: any[] }>('/announcements')
      .then(res => setAnnouncements(res.announcements || []))
      .catch(() => {});

    // Fetch site name
    apiRequest<{ settings: Record<string, string> }>('/settings/public')
      .then(res => {
        if (res.settings?.site_name) setSiteName(res.settings.site_name);
      })
      .catch(() => {});
  }, []);

  const handleNavClick = (url: string) => {
    setShowMobileMenu(false);
    if (url === '/') onNavigate('home');
    else if (url === '/tournaments') onNavigate('tournaments');
    else if (url === '/live-rooms') onNavigate('live-rooms');
    else if (url === '/leaderboard') onNavigate('leaderboard');
    else if (url === '/faq') onNavigate('faq');
    else if (url.startsWith('/page/')) {
      const slug = url.replace('/page/', '');
      onNavigate('page', { slug });
    } else {
      onNavigate('home');
    }
  };

  const isStaff = user && ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(user.role);

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Urgent Announcement Banner */}
      {announcements.length > 0 && announcements[0].is_banner_visible && (
        <div className={`px-4 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2 ${
          announcements[0].banner_type === 'urgent'
            ? 'bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white font-semibold animate-pulse'
            : 'bg-orange-500/10 text-orange-400 border-b border-orange-500/20'
        }`}>
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span>{announcements[0].title}</span>
          <span className="hidden md:inline text-white/80 font-normal">— {announcements[0].content}</span>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none min-w-0" onClick={() => onNavigate('home')}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-400/30 shrink-0">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-gaming font-extrabold text-base sm:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 truncate">
                {siteName}
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                ESPORTS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:block">
              Free Fire Arena
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item, idx) => {
            const isActive =
              (item.url === '/' && currentView === 'home') ||
              (item.url === '/tournaments' && currentView === 'tournaments') ||
              (item.url === '/live-rooms' && currentView === 'live-rooms') ||
              (item.url === '/leaderboard' && currentView === 'leaderboard') ||
              (item.url === '/faq' && currentView === 'faq');

            return (
              <button
                key={idx}
                onClick={() => handleNavClick(item.url)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {item.url === '/live-rooms' && (
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Admin, Notifications, Auth */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Admin Panel Direct Button (if staff, desktop only) */}
          {isStaff && (
            <button
              onClick={() => onNavigate('admin')}
              className={`hidden md:flex px-3 py-1.5 text-xs font-bold rounded-lg transition-all items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* Notifications Icon (if user logged in) */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-orange-400" />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-orange-400 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-2 space-y-1">
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
                          className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            item.is_read ? 'opacity-70 hover:opacity-100' : 'bg-orange-500/10 border-l-2 border-orange-500'
                          }`}
                        >
                          <div className="font-semibold text-slate-200">{item.title}</div>
                          <div className="text-slate-400 mt-0.5">{item.message}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{formatISTDateTime(item.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account or Login CTA */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/60 border border-slate-800 transition-all"
              >
                <img
                  src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg object-cover border border-orange-500/40"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-100 leading-tight flex items-center gap-1">
                    {user.free_fire_ign || user.username}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    UID: {user.free_fire_uid || 'N/A'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <div className="font-semibold text-xs text-slate-200">{user.full_name || user.username}</div>
                    <div className="text-[11px] text-slate-400">{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'overview' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-orange-400" />
                    <span>User Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'tournaments' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>My Tournaments</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'matches' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>My Matches</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'teams' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>My Duo Teams</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'payments' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span>Payment History</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'support' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>Support Tickets</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('dashboard', { tab: 'settings' });
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 border-t border-slate-800 mt-1"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs font-gaming font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 tracking-wider shrink-0 cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 shrink-0"
            aria-label="Toggle navigation menu"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {showMobileMenu && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-4 space-y-2">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleNavClick(item.url)}
              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 rounded-lg"
            >
              {item.label}
            </button>
          ))}
          {isStaff && (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                onNavigate('admin');
              }}
              className="w-full text-left px-3 py-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg font-bold flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
          {!user && (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                onOpenAuth('login');
              }}
              className="w-full mt-2 py-2.5 px-4 text-xs font-gaming font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login / Register</span>
            </button>
          )}
          {user && (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                logout();
              }}
              className="w-full mt-2 py-2 px-4 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl flex items-center justify-center gap-2"
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
