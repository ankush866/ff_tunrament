import React, { useState, useEffect } from 'react';
import { Home, Trophy, Wallet, User } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { AuthModal } from './components/AuthModal.js';
import { HomeView } from './views/HomeView.js';
import { TournamentsView } from './views/TournamentsView.js';
import { TournamentDetailView } from './views/TournamentDetailView.js';
import { LiveRoomsView } from './views/LiveRoomsView.js';
import { LeaderboardView } from './views/LeaderboardView.js';
import { PageView } from './views/PageView.js';
import { FaqView } from './views/FaqView.js';
import { DashboardView } from './views/DashboardView.js';
import { AdminPanelView } from './views/admin/AdminPanelView.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { apiRequest } from './lib/api.js';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin_login'>('login');

  // Keep site settings cached locally for footer/support
  useEffect(() => {
    const loadSettings = () => {
      apiRequest<{ settings: Record<string, string> }>('/settings/public')
        .then(res => {
          if (res.settings) {
            try {
              localStorage.setItem('flaxy_site_settings', JSON.stringify(res.settings));
            } catch {}
          }
        })
        .catch(() => {});
    };

    loadSettings();
    window.addEventListener('flaxy_settings_updated', loadSettings);
    return () => {
      window.removeEventListener('flaxy_settings_updated', loadSettings);
    };
  }, [currentView]);

  // Handle URL hash routes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('/tournament/')) {
        const id = hash.replace('/tournament/', '').trim();
        if (id) {
          setCurrentView('tournament-detail');
          setViewParams({ id });
        }
      } else if (hash.startsWith('/page/')) {
        const slug = hash.replace('/page/', '');
        setCurrentView('page');
        setViewParams({ slug });
      } else if (hash === '/tournaments') {
        setCurrentView('tournaments');
      } else if (hash === '/live-rooms') {
        setCurrentView('live-rooms');
      } else if (hash === '/leaderboard') {
        setCurrentView('leaderboard');
      } else if (hash === '/faq') {
        setCurrentView('faq');
      } else if (hash === '/wallet') {
        setCurrentView('dashboard');
        setViewParams({ tab: 'payments' });
      } else if (hash === '/dashboard') {
        setCurrentView('dashboard');
        setViewParams({ tab: 'overview' });
      } else if (hash === '/admin') {
        setCurrentView('admin');
      } else if (!hash || hash === '/' || hash === 'home') {
        setCurrentView('home');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (view === 'home') window.location.hash = '';
    else if (view === 'tournaments') window.location.hash = '/tournaments';
    else if (view === 'live-rooms') window.location.hash = '/live-rooms';
    else if (view === 'leaderboard') window.location.hash = '/leaderboard';
    else if (view === 'faq') window.location.hash = '/faq';
    else if (view === 'tournament-detail' && params.id) window.location.hash = `/tournament/${params.id}`;
    else if (view === 'page' && params.slug) window.location.hash = `/page/${params.slug}`;
    else if (view === 'dashboard' && params.tab === 'payments') window.location.hash = '/wallet';
    else if (view === 'dashboard') window.location.hash = '/dashboard';
    else if (view === 'admin') window.location.hash = '/admin';
  };

  const openAuth = (mode: 'login' | 'register' | 'admin_login' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const isHomeActive = currentView === 'home';
  const isMatchActive =
    currentView === 'tournaments' ||
    currentView === 'tournament-detail' ||
    currentView === 'live-rooms';
  const isWalletActive = currentView === 'dashboard' && viewParams.tab === 'payments';
  const isProfileActive =
    (currentView === 'dashboard' && viewParams.tab !== 'payments') ||
    currentView === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-18 md:pb-0 transition-colors duration-200">
      <Navbar
        currentView={currentView}
        onNavigate={navigate}
        onOpenAuth={openAuth}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentView === 'tournaments' && (
          <TournamentsView onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentView === 'tournament-detail' && (
          <TournamentDetailView
            tournamentId={viewParams.id || 1}
            onNavigate={navigate}
            onOpenAuth={openAuth}
          />
        )}

        {currentView === 'live-rooms' && (
          <LiveRoomsView onNavigate={navigate} onOpenAuth={openAuth} />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView onNavigate={navigate} />
        )}

        {currentView === 'page' && (
          <PageView slug={viewParams.slug || 'about-us'} onNavigate={navigate} />
        )}

        {currentView === 'faq' && (
          <FaqView onNavigate={navigate} />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            initialTab={viewParams.tab || 'overview'}
            onNavigate={navigate}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanelView onNavigate={navigate} onOpenAuth={openAuth} />
        )}
      </main>

      <Footer onNavigate={navigate} />

      {/* Mobile Bottom Navigation: Strictly 4 Simple Options (Home, Match, Wallet, Profile) */}
      <nav
        aria-label="Primary bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      >
        <div className="max-w-lg mx-auto grid grid-cols-4 items-center h-16 px-2">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
              isHomeActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Home className="w-5 h-5" strokeWidth={isHomeActive ? 2.4 : 2} />
            <span className="text-[11px] leading-tight">Home</span>
          </button>

          {/* 2. Match */}
          <button
            type="button"
            onClick={() => navigate('tournaments')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
              isMatchActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Trophy className="w-5 h-5" strokeWidth={isMatchActive ? 2.4 : 2} />
            <span className="text-[11px] leading-tight">Match</span>
          </button>

          {/* 3. Wallet */}
          <button
            type="button"
            onClick={() => {
              if (user) {
                navigate('dashboard', { tab: 'payments' });
              } else {
                openAuth('login');
              }
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
              isWalletActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Wallet className="w-5 h-5" strokeWidth={isWalletActive ? 2.4 : 2} />
            <span className="text-[11px] leading-tight">Wallet</span>
          </button>

          {/* 4. Profile */}
          <button
            type="button"
            onClick={() => {
              if (user) {
                navigate('dashboard', { tab: 'overview' });
              } else {
                openAuth('login');
              }
            }}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
              isProfileActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <User className="w-5 h-5" strokeWidth={isProfileActive ? 2.4 : 2} />
            <span className="text-[11px] leading-tight">{user ? 'Profile' : 'Login'}</span>
          </button>
        </div>
      </nav>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onNavigate={navigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
