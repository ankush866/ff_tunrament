import React, { useState, useEffect } from 'react';
import {
  Home,
  Trophy,
  Flame,
  MessageCircle,
  User,
  Shield,
  Smartphone,
  Monitor,
  Wifi,
  Battery,
  Signal,
  Sparkles
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
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
import { apiRequest } from './lib/api.js';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin_login'>('login');
  const [liveIstTime, setLiveIstTime] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasLiveTournament, setHasLiveTournament] = useState(false);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Public Settings & Live Tournament status
  useEffect(() => {
    apiRequest<{ settings: Record<string, string> }>('/settings/public')
      .then(res => setSettings(res.settings || {}))
      .catch(() => {});

    apiRequest<{ tournaments: any[] }>('/tournaments')
      .then(res => {
        const live = (res.tournaments || []).some(t => t.status === 'Live');
        setHasLiveTournament(live);
      })
      .catch(() => {});
  }, [currentView]);

  // Handle URL hash or initial route
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('/tournament/')) {
        const id = parseInt(hash.replace('/tournament/', ''), 10);
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
      } else if (hash === '/dashboard') {
        setCurrentView('dashboard');
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

    // Sync hash
    if (view === 'home') window.location.hash = '';
    else if (view === 'tournaments') window.location.hash = '/tournaments';
    else if (view === 'live-rooms') window.location.hash = '/live-rooms';
    else if (view === 'leaderboard') window.location.hash = '/leaderboard';
    else if (view === 'faq') window.location.hash = '/faq';
    else if (view === 'tournament-detail' && params.id) window.location.hash = `/tournament/${params.id}`;
    else if (view === 'page' && params.slug) window.location.hash = `/page/${params.slug}`;
    else if (view === 'dashboard') window.location.hash = '/dashboard';
    else if (view === 'admin') window.location.hash = '/admin';
  };

  const openAuth = (mode: 'login' | 'register' | 'admin_login' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const isStaff = user && ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(user.role);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white pb-20 md:pb-0">
      {/* Dynamic Navbar */}
        <Navbar
          currentView={currentView}
          onNavigate={navigate}
          onOpenAuth={openAuth}
        />

        {/* Main View Router */}
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

        {/* Dynamic Footer */}
        <Footer onNavigate={navigate} />

        {/* Mobile Bottom Navigation Dock (Native Smartphone App Experience) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800">
          <div className="max-w-md mx-auto flex items-center justify-around py-2 px-2">
            {/* 1. Home */}
            <button
              onClick={() => navigate('home')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 transition-all ${
                currentView === 'home' ? 'text-orange-500 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Home</span>
            </button>

            {/* 2. Tournaments */}
            <button
              onClick={() => navigate('tournaments')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 transition-all ${
                currentView === 'tournaments' || currentView === 'tournament-detail'
                  ? 'text-orange-500 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span className="text-[10px]">Tournaments</span>
            </button>

            {/* 3. Live Rooms (With Pulsing Indicator) */}
            <button
              onClick={() => navigate('live-rooms')}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-all ${
                currentView === 'live-rooms' ? 'text-red-500 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              </div>
              <span className="text-[10px]">Live Room</span>
            </button>

            {/* 4. Support WhatsApp Direct */}
            <a
              href={settings.whatsapp_url || `https://wa.me/${(settings.whatsapp_number || '919876543210').replace(/[^0-9]/g, '')}?text=Hello%20Flaxy%20Admin%2C%20I%20need%20tournament%20help`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-0.5 flex-1 text-emerald-400 hover:text-emerald-300 transition-all hover:scale-105"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] font-semibold">WhatsApp</span>
            </a>

            {/* 5. User Profile / Login */}
            {user ? (
              <button
                onClick={() => navigate('dashboard')}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 transition-all ${
                  currentView === 'dashboard'
                    ? 'text-orange-500 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-[10px]">Profile</span>
              </button>
            ) : (
              <button
                onClick={() => openAuth('login')}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 text-orange-400 hover:text-orange-300 transition-all font-semibold"
              >
                <User className="w-5 h-5 text-orange-500" />
                <span className="text-[10px]">Login</span>
              </button>
            )}
          </div>
        </nav>

      {/* Auth Modal */}
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
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
