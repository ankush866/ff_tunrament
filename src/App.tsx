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
import { AboutView } from './views/AboutView.js';
import { FaqView } from './views/FaqView.js';
import { DashboardView } from './views/DashboardView.js';
import { AdminPanelView } from './views/admin/AdminPanelView.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { apiRequest } from './lib/api.js';
import { applyPublicPageSeo, syncEntityGraphJsonLd } from './lib/seo.js';

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
            syncEntityGraphJsonLd({
              founderImageUrl: res.settings.founder_photo_url,
              siteLogoUrl: res.settings.site_logo,
              linkedinUrl: res.settings.founder_linkedin,
              githubUrl: res.settings.founder_github
            });
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

  // Handle clean URL path routes (with backward-compatible hash fallback)
  useEffect(() => {
    const handleRoute = () => {
      const hashRoute = window.location.hash.replace(/^#/, '');
      const rawRoute = hashRoute && hashRoute.startsWith('/') ? hashRoute : window.location.pathname;
      const route = rawRoute.replace(/\/+$/, '') || '/';

      if (route.startsWith('/tournament/')) {
        const id = route.replace('/tournament/', '').trim();
        if (id) {
          setCurrentView('tournament-detail');
          setViewParams({ id });
        }
      } else if (route.startsWith('/page/')) {
        const slug = route.replace('/page/', '').trim();
        setCurrentView('page');
        setViewParams({ slug });
      } else if (route === '/about') {
        setCurrentView('about');
        setViewParams({});
      } else if (route === '/tournaments') {
        setCurrentView('tournaments');
        setViewParams({});
      } else if (route === '/live-rooms') {
        setCurrentView('live-rooms');
        setViewParams({});
      } else if (route === '/leaderboard') {
        setCurrentView('leaderboard');
        setViewParams({});
      } else if (route === '/faq') {
        setCurrentView('faq');
        setViewParams({});
      } else if (route === '/wallet') {
        setCurrentView('dashboard');
        setViewParams({ tab: 'payments' });
      } else if (route === '/dashboard') {
        setCurrentView('dashboard');
        setViewParams({ tab: 'overview' });
      } else if (route === '/admin') {
        setCurrentView('admin');
        setViewParams({});
      } else {
        setCurrentView('home');
        setViewParams({});
      }
    };

    handleRoute();
    window.addEventListener('popstate', handleRoute);
    window.addEventListener('hashchange', handleRoute);
    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('hashchange', handleRoute);
    };
  }, []);

  useEffect(() => {
    applyPublicPageSeo(currentView, viewParams);
  }, [currentView, viewParams]);

  const navigate = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let nextPath = '/';
    if (view === 'about') nextPath = '/about';
    else if (view === 'tournaments') nextPath = '/tournaments';
    else if (view === 'live-rooms') nextPath = '/live-rooms';
    else if (view === 'leaderboard') nextPath = '/leaderboard';
    else if (view === 'faq') nextPath = '/faq';
    else if (view === 'tournament-detail' && params.id) nextPath = `/tournament/${params.id}`;
    else if (view === 'page' && params.slug) nextPath = `/page/${params.slug}`;
    else if (view === 'dashboard' && params.tab === 'payments') nextPath = '/wallet';
    else if (view === 'dashboard') nextPath = '/dashboard';
    else if (view === 'admin') nextPath = '/admin';

    if (window.location.pathname !== nextPath || window.location.hash) {
      window.history.pushState({}, '', nextPath);
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-24 md:pb-0 transition-colors duration-200">
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

        {currentView === 'about' && (
          <AboutView onNavigate={navigate} />
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
