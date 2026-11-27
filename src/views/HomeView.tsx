import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  ChevronRight,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { apiRequest, formatINR, formatISTDateTime, getTimeRemaining } from '../lib/api.js';
import { DEFAULT_MATCH_BANNER, getSafeImageUrl } from '../lib/assets.js';

interface HomeViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenAuth }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
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

  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isPast: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const loadHomeData = () => {
      apiRequest<{ tournaments: any[] }>('/tournaments')
        .then(res => setTournaments(res.tournaments || []))
        .catch(() => {});

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
    };

    loadHomeData();
    window.addEventListener('flaxy_tournaments_updated', loadHomeData);
    return () => window.removeEventListener('flaxy_tournaments_updated', loadHomeData);
  }, []);

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

  return (
    <div className="space-y-10 pb-12">
      {/* 1. COMPACT HERO & NEXT MATCH COUNTDOWN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5 text-center lg:text-left">
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 tracking-wide">
              {liveStats.activePrizePool > 0
                ? `Active Prize Pool: ${formatINR(liveStats.activePrizePool)} · Mobile Esports Arena`
                : 'Official Free Fire Esports Tournaments'}
            </div>

            <h1 className="font-gaming font-bold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 dark:text-white leading-[1.08] text-balance">
              Compete &amp; Win in{' '}
              <span className="text-orange-600 dark:text-orange-400">Free Fire</span> Arena
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Join daily Solo, Duo &amp; Squad matches. Simple UPI entry, automated room ID unlock, and fast cash rewards.
            </p>

            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('tournaments')}
                className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>Join Live Matches</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('live-rooms')}
                className="w-full sm:w-auto min-h-[44px] px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-gaming font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Live Room ID</span>
              </button>
            </div>
          </div>

          {/* Right Next Match Card */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-gaming font-bold text-sm text-slate-900 dark:text-slate-100">
                  Next Match Countdown
                </span>
                <span className="text-xs font-mono text-orange-600 dark:text-orange-400 font-semibold">
                  IST
                </span>
              </div>

              {tournaments.length > 0 ? (
                <>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {tournaments[0].game_mode} · {tournaments[0].map_name} · {formatISTDateTime(tournaments[0].match_at)}
                    </div>
                    <h2 className="font-gaming font-bold text-lg text-slate-900 dark:text-white mt-1 line-clamp-1">
                      {tournaments[0].title}
                    </h2>
                  </div>

                  {/* Countdown Digits */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="font-mono font-bold text-2xl text-orange-600 dark:text-orange-400 tabular-nums">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-slate-500">Hours</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="font-mono font-bold text-2xl text-orange-600 dark:text-orange-400 tabular-nums">
                        {String(countdown.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-slate-500">Mins</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="font-mono font-bold text-2xl text-red-600 dark:text-red-400 tabular-nums">
                        {String(countdown.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-[11px] text-slate-500">Secs</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-slate-500">Prize: </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        {formatINR(tournaments[0].prize_pool)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Entry: </span>
                      <strong className="text-orange-600 dark:text-orange-400 font-mono tabular-nums">
                        {tournaments[0].entry_fee === 0 ? 'FREE' : formatINR(tournaments[0].entry_fee)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Slots: </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                        {tournaments[0].total_slots - tournaments[0].available_slots}/{tournaments[0].total_slots}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('tournament-detail', { id: tournaments[0].id })}
                    className="w-full min-h-[44px] py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>Join Match</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="py-10 text-center text-slate-500 text-sm">
                  No scheduled matches right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPACT STATS STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="font-gaming font-bold text-2xl sm:text-3xl text-orange-600 dark:text-orange-400 tabular-nums">
              {liveStats.registeredWarriors}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Registered Players</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tabular-nums">
              {liveStats.activeMatches}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Active Matches</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="font-gaming font-bold text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
              {formatINR(liveStats.verifiedPayouts)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Verified Payouts</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tabular-nums">
              {liveStats.tournamentsCompleted}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Completed</div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED MATCHES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-gaming font-bold text-xl sm:text-2xl text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500 shrink-0" />
              <span>Active Matches</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tournaments')}
            className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>See All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredTournaments.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
            No active matches found. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredTournaments.map(tournament => {
              const filledSlots = tournament.total_slots - tournament.available_slots;
              const fillPercentage = Math.min(100, Math.round((filledSlots / tournament.total_slots) * 100));

              return (
                <div
                  key={tournament.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-orange-500/50 transition-colors flex flex-col shadow-sm"
                >
                  <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-950">
                    <img
                      src={getSafeImageUrl(tournament.banner_image, DEFAULT_MATCH_BANNER)}
                      alt={tournament.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MATCH_BANNER; }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        {tournament.game_mode} · {tournament.map_name}
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-300 tabular-nums">
                        {formatINR(tournament.prize_pool)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        <span>{formatISTDateTime(tournament.match_at)}</span>
                        <span className={`font-bold ${
                          tournament.status === 'Registration Open'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tournament.status === 'Live'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-500'
                        }`}>
                          {tournament.status}
                        </span>
                      </div>
                      <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                        {tournament.title}
                      </h3>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        <span>Slots Filled</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {filledSlots}/{tournament.total_slots}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] text-slate-500">Entry Fee</div>
                        <div className="font-gaming font-bold text-orange-600 dark:text-orange-400 text-base tabular-nums">
                          {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('tournament-detail', { id: tournament.id })}
                        className="min-h-[40px] px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>View &amp; Join</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. COMPACT KEY BENEFITS & HELP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Fair Play Arena</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Mobile-only lobbies. Verified players &amp; anti-cheat checks.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Zap className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Fast UPI &amp; Rooms</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Quick UPI approval and automatic Room ID &amp; Password unlock.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('faq')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 flex items-start gap-3 text-left transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Need Help? →</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Read rules, payment guide &amp; FAQs or open a support ticket.</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
