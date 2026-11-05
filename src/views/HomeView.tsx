import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  MapPin,
  Sparkles,
  Award,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { apiRequest, formatINR, formatISTDateTime, getTimeRemaining } from '../lib/api.js';

interface HomeViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenAuth }) => {
  const [sections, setSections] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Live real database statistics
  const [liveStats, setLiveStats] = useState<{
    registeredWarriors: number;
    tournamentsCompleted: number;
    activeMatches: number;
    verifiedPayouts: number;
    activePrizePool: number;
  }>({
    registeredWarriors: 0,
    tournamentsCompleted: 0,
    activeMatches: 0,
    verifiedPayouts: 0,
    activePrizePool: 0
  });

  // Live countdown state for featured live room
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isPast: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    // 1. Fetch Homepage Sections from CMS
    apiRequest<{ sections: any[] }>('/cms/homepage-sections')
      .then(res => setSections((res.sections || []).filter(s => s.is_enabled)))
      .catch(() => {});

    // 2. Fetch Active Tournaments
    apiRequest<{ tournaments: any[] }>('/tournaments')
      .then(res => setTournaments(res.tournaments || []))
      .catch(() => {});

    // 3. Fetch FAQs
    apiRequest<{ faqs: any[] }>('/faqs')
      .then(res => setFaqs((res.faqs || []).slice(0, 5)))
      .catch(() => {});

    // 4. Fetch Live Database Stats (Real Matches, Real Users, Real Approved Payments)
    apiRequest<{
      registeredWarriors: number;
      tournamentsCompleted: number;
      activeMatches: number;
      verifiedPayouts: number;
      activePrizePool: number;
    }>('/stats/public')
      .then(res => {
        if (res) setLiveStats(res);
      })
      .catch(() => {});
  }, []);

  // Update live room countdown every second for the first active tournament
  useEffect(() => {
    if (tournaments.length === 0) return;
    const targetTournament = tournaments[0];
    const updateCountdown = () => {
      const remaining = getTimeRemaining(targetTournament.match_at);
      setCountdown({
        hours: remaining.hours + remaining.days * 24,
        minutes: remaining.minutes,
        seconds: remaining.seconds,
        isPast: remaining.isPast
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [tournaments]);

  const featuredTournaments = tournaments.slice(0, 3);
  const heroSection = sections.find(s => s.section_key === 'hero');
  const heroContent = heroSection ? JSON.parse(heroSection.content_json || '{}') : {};

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Background glow and esports grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-transparent to-slate-950 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {liveStats.activePrizePool > 0
                    ? `TOTAL PRIZE POOL: ${formatINR(liveStats.activePrizePool)} IN ACTIVE TOURNAMENTS`
                    : 'OFFICIAL FREE FIRE ESPORTS TOURNAMENTS'}
                </span>
              </div>

              <h1 className="font-gaming font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white leading-none">
                {heroSection?.title || 'DOMINATE THE'} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500">
                  FREE FIRE ARENA
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                {heroSection?.subtitle || 'Enter India’s most prestigious Free Fire esports tournaments. Automated room credentials, verified instant UPI payouts, and rigorous anti-cheat enforcement.'}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => onNavigate('tournaments')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-base rounded-2xl shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2 tracking-wider group"
                >
                  <span>{heroContent.cta_primary_text || 'Join Live Tournaments'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => onNavigate('live-rooms')}
                  className="w-full sm:w-auto px-7 py-4 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-gaming font-semibold text-base rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="relative flex h-2.5 w-2.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span>Live Room Tracker</span>
                </button>
              </div>

              {/* Quick Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>100% Mobile Only (No Emulators)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Instant UPI Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Automated Room Release</span>
                </div>
              </div>
            </div>

            {/* Right Live Ticker Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl glow-orange">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="font-gaming font-bold text-sm text-slate-200 uppercase tracking-wider">
                      Next Live Room Countdown
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                    IST SCHEDULE
                  </span>
                </div>

                {tournaments.length > 0 ? (
                  <div className="py-6 space-y-6">
                    <div>
                      <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider">
                        {tournaments[0].game_mode} Match • {tournaments[0].map_name}
                      </div>
                      <h3 className="font-gaming font-bold text-xl text-white mt-1">
                        {tournaments[0].title}
                      </h3>
                      <div className="text-xs text-slate-400 mt-1">
                        Match Scheduled: {formatISTDateTime(tournaments[0].match_at)}
                      </div>
                    </div>

                    {/* Countdown Clock Display */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                        <div className="font-gaming font-extrabold text-3xl sm:text-4xl text-orange-400">
                          {String(countdown.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                          Hours
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                        <div className="font-gaming font-extrabold text-3xl sm:text-4xl text-orange-400">
                          {String(countdown.minutes).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                          Minutes
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                        <div className="font-gaming font-extrabold text-3xl sm:text-4xl text-red-500 animate-pulse">
                          {String(countdown.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                          Seconds
                        </div>
                      </div>
                    </div>

                    {/* Prize & Entry Fee */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400">Prize Pool:</span>
                        <span className="font-gaming font-bold text-emerald-400 text-sm ml-1.5">
                          {formatINR(tournaments[0].prize_pool)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Entry Fee:</span>
                        <span className="font-gaming font-bold text-orange-400 text-sm ml-1.5">
                          {tournaments[0].entry_fee === 0 ? 'FREE' : formatINR(tournaments[0].entry_fee)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Slots:</span>
                        <span className="font-semibold text-slate-200 ml-1.5">
                          {tournaments[0].total_slots - tournaments[0].available_slots}/{tournaments[0].total_slots}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('tournament-detail', { id: tournaments[0].id })}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Join & Access Room</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No scheduled tournaments found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS SECTION (100% Live Real Database Metrics) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="font-gaming font-extrabold text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              {liveStats.registeredWarriors}
            </div>
            <div className="text-xs text-slate-400 font-medium">Registered Warriors</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="font-gaming font-extrabold text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              {liveStats.tournamentsCompleted}
            </div>
            <div className="text-xs text-slate-400 font-medium">Tournaments Completed</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="font-gaming font-extrabold text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 truncate">
              {formatINR(liveStats.verifiedPayouts)}
            </div>
            <div className="text-xs text-slate-400 font-medium">Verified UPI Payouts</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="font-gaming font-extrabold text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
              {liveStats.activeMatches}
            </div>
            <div className="text-xs text-slate-400 font-medium">Active & Live Matches</div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED TOURNAMENTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
              <Trophy className="w-4 h-4" />
              <span>Battleground Brackets</span>
            </div>
            <h2 className="font-gaming font-extrabold text-3xl sm:text-4xl text-white">
              FEATURED TOURNAMENTS
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select your mode, reserve your slot, and prepare for battle.
            </p>
          </div>
          <button
            onClick={() => onNavigate('tournaments')}
            className="text-xs font-gaming font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>VIEW ALL TOURNAMENTS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredTournaments.map(tournament => {
            const filledSlots = tournament.total_slots - tournament.available_slots;
            const fillPercentage = Math.min(100, Math.round((filledSlots / tournament.total_slots) * 100));

            return (
              <div
                key={tournament.id}
                className="group rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 flex flex-col"
              >
                {/* Banner Image */}
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={tournament.banner_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
                    alt={tournament.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

                  {/* Mode & Map Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900/90 text-orange-400 border border-slate-700/80 backdrop-blur-md uppercase">
                      {tournament.game_mode}
                    </span>
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900/90 text-slate-200 border border-slate-700/80 backdrop-blur-md flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-400" />
                      {tournament.map_name}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                      tournament.status === 'Registration Open'
                        ? 'bg-emerald-500 text-slate-950'
                        : tournament.status === 'Live'
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-300'
                    }`}>
                      {tournament.status}
                    </span>
                  </div>

                  {/* Prize Badge bottom right */}
                  <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Prize Pool: </span>
                    <span className="font-gaming font-extrabold text-emerald-400 text-sm">
                      {formatINR(tournament.prize_pool)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-gaming font-bold text-lg text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                      {tournament.title}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatISTDateTime(tournament.match_at)}</span>
                    </div>
                  </div>

                  {/* Slot progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Slots Filled:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {filledSlots}/{tournament.total_slots} ({fillPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Entry & CTA */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Entry Fee</div>
                      <div className="font-gaming font-bold text-orange-400 text-base">
                        {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('tournament-detail', { id: tournament.id })}
                      className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500 font-gaming font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <span>Join Tournament</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. WHY CHOOSE FLAXY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-gaming font-extrabold text-3xl sm:text-4xl text-white">
              BUILT FOR FREE FIRE WARRIORS
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Every feature on Flaxy is engineered to eliminate delays, verify real skills, and deliver cash rewards directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-gaming font-bold text-lg text-white">Zero Cheat Policy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emulators and scripts are permanently banned. Every lobby is actively monitored by referee staff to maintain fair play.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-gaming font-bold text-lg text-white">Automated Room Timers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No manual delays. Free Fire Room ID and Password unlock exactly when the server countdown hits zero for confirmed players.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-gaming font-bold text-lg text-white">Instant UPI Payouts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Win cash prizes and receive payouts directly to PhonePe, Google Pay, or Paytm within 2 hours of match result confirmation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-gaming font-bold text-lg text-white">Duo Teams System</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create your team roster, invite your partner, and compete together in 2v2 and Clash Squad Duo tournaments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE FAQ ACCORDION PREVIEW */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="font-gaming font-extrabold text-3xl text-white">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Need help understanding rooms, UPI transactions, or tournament rules?
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={faq.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white"
              >
                <span>{faq.question}</span>
                <ChevronRight className={`w-4 h-4 text-orange-400 transition-transform ${activeFaq === idx ? 'rotate-90' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('faq')}
            className="text-xs text-orange-400 font-semibold hover:underline"
          >
            Browse all questions in FAQ Hub →
          </button>
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 p-8 sm:p-14 text-center overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="font-gaming font-extrabold text-3xl sm:text-5xl text-white tracking-wide">
              READY TO CLAIM YOUR BOOYAH?
            </h2>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed">
              Register now, lock in your slot for tonight’s tournament, and experience India’s premier Free Fire esports platform.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-gaming font-bold text-sm rounded-xl shadow-xl transition-all"
              >
                Create Free Account
              </button>
              <button
                onClick={() => onNavigate('tournaments')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-gaming font-bold text-sm rounded-xl transition-all"
              >
                Explore Tournaments
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
