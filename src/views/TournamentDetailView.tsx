import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
  Copy,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  ArrowLeft,
  Flame,
  CheckCircle2,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime, formatISTTime, getTimeRemaining } from '../lib/api.js';
import { DEFAULT_MATCH_BANNER, getSafeImageUrl } from '../lib/assets.js';

interface TournamentDetailViewProps {
  tournamentId: string | number;
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const TournamentDetailView: React.FC<TournamentDetailViewProps> = ({
  tournamentId,
  onNavigate,
  onOpenAuth
}) => {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'room' | 'rules' | 'roster' | 'results'>('room');

  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | number | null>(null);

  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinStep, setJoinStep] = useState<'confirm' | 'payment' | 'done'>('confirm');
  const [registeredSlot, setRegisteredSlot] = useState<number | null>(null);
  const [registrationId, setRegistrationId] = useState<string | number | null>(null);
  const [utrRef, setUtrRef] = useState<string>('');
  const [paymentWhatsapp, setPaymentWhatsapp] = useState<string>(user?.phone || '');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isPast: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  const [roster, setRoster] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const fetchTournamentData = () => {
    setLoading(true);
    apiRequest<{ tournament: any; room: any; registration: any; registeredCount: number }>(`/tournaments/${tournamentId}`)
      .then(res => {
        setTournament(res.tournament);
        setRegistration(res.registration);
        setRegisteredCount(res.registeredCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    apiRequest<any>(`/rooms/${tournamentId}`)
      .then(res => setRoom(res))
      .catch(() => {});

    apiRequest<{ settings: Record<string, string> }>('/settings/public')
      .then(res => setSettings(res.settings || {}))
      .catch(() => {});
  };

  useEffect(() => {
    fetchTournamentData();
    const handleRefresh = () => fetchTournamentData();
    window.addEventListener('flaxy_tournaments_updated', handleRefresh);
    const interval = setInterval(() => {
      apiRequest<any>(`/rooms/${tournamentId}`)
        .then(res => setRoom(res))
        .catch(() => {});
    }, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('flaxy_tournaments_updated', handleRefresh);
    };
  }, [tournamentId, user]);

  useEffect(() => {
    if (user?.phone && !paymentWhatsapp) {
      setPaymentWhatsapp(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (user && tournament?.game_mode === 'Duo') {
      apiRequest<{ teams: any[] }>('/teams/my')
        .then(res => {
          const eligibleTeams = (res.teams || []).filter(t => (t.members || []).length === 2);
          setUserTeams(eligibleTeams);
          if (eligibleTeams.length > 0) setSelectedTeamId(eligibleTeams[0].id);
        })
        .catch(() => {});
    }
  }, [user, tournament]);

  useEffect(() => {
    if (activeTab === 'roster') {
      apiRequest<{ registrations: any[] }>(`/admin/tournaments/${tournamentId}/registrations`)
        .then(res => setRoster(res.registrations || []))
        .catch(() => {});
    } else if (activeTab === 'results') {
      apiRequest<{ results: any[] }>(`/results/tournament/${tournamentId}`)
        .then(res => setResults(res.results || []))
        .catch(() => {});
    }
  }, [activeTab, tournamentId]);

  useEffect(() => {
    if (!room?.opening_time) return;
    const update = () => {
      const rem = getTimeRemaining(room.opening_time);
      setCountdown({
        hours: rem.hours + rem.days * 24,
        minutes: rem.minutes,
        seconds: rem.seconds,
        isPast: rem.isPast
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [room?.opening_time]);

  const handleRegister = async () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    setPaymentError(null);
    setPaymentSubmitting(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        registrationId: string | number;
        slotNumber: number;
        paymentRequired: boolean;
        entryFee: number;
      }>(`/tournaments/${tournamentId}/register`, {
        method: 'POST',
        body: JSON.stringify({ team_id: tournament.game_mode === 'Duo' ? selectedTeamId : null })
      });

      setRegistrationId(res.registrationId);
      setRegisteredSlot(res.slotNumber);

      if (res.paymentRequired) {
        setJoinStep('payment');
      } else {
        setJoinStep('done');
        fetchTournamentData();
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Slot reservation failed.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrRef.trim()) {
      setPaymentError('Please enter your 12-digit UTR/Transaction ID.');
      return;
    }
    if (!paymentWhatsapp.trim()) {
      setPaymentError('Please enter your WhatsApp number.');
      return;
    }

    setPaymentError(null);
    setPaymentSubmitting(true);
    try {
      await apiRequest('/payments/submit', {
        method: 'POST',
        body: JSON.stringify({
          registration_id: registrationId || registration?.id,
          tournament_id: tournamentId,
          amount: tournament.entry_fee,
          transaction_ref: utrRef.trim(),
          screenshot_url: screenshotUrl || DEFAULT_MATCH_BANNER,
          upi_id: settings.upi_id || 'flaxy.esports@icici',
          whatsapp_number: paymentWhatsapp.trim()
        })
      });

      setJoinStep('done');
      fetchTournamentData();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment submission failed.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'id' | 'pass' | 'upi') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'pass') {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    } else {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('Image size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">Loading match details...</div>;
  }

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-gaming font-bold text-slate-900 dark:text-white">Match Not Found</h2>
        <button
          type="button"
          onClick={() => onNavigate('tournaments')}
          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  const filledSlots = tournament.total_slots - tournament.available_slots;
  const isRegistered = Boolean(registration);
  const isApproved = registration?.payment_status === 'approved';
  const isPending = registration?.payment_status === 'pending';
  const isStaff = user && ['super_admin', 'tournament_manager', 'payment_manager'].includes(user.role);

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      <button
        type="button"
        onClick={() => onNavigate('tournaments')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Matches</span>
      </button>

      {/* Match Banner Card */}
      <div className="relative rounded-2xl bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          <img
            src={getSafeImageUrl(tournament.banner_image, DEFAULT_MATCH_BANNER)}
            alt={tournament.title}
            referrerPolicy="no-referrer"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MATCH_BANNER; }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />

          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 text-xs text-white">
            <span className="px-2.5 py-1 rounded-lg bg-black/70 font-semibold">
              {tournament.game_mode} · {tournament.map_name}
            </span>
            <span className={`px-2.5 py-1 rounded-lg font-bold ${
              tournament.status === 'Registration Open'
                ? 'bg-emerald-500 text-slate-950'
                : tournament.status === 'Live'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-200'
            }`}>
              {tournament.status}
            </span>
          </div>

          {isRegistered && (
            <div className="absolute top-3 right-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                isApproved
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-amber-400 text-slate-950'
              }`}>
                {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                <span>{isApproved ? 'Slot Confirmed' : 'Pending Review'}</span>
              </span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="font-gaming font-bold text-xl sm:text-3xl text-white">
                {tournament.title}
              </h1>
              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                <span>{formatISTDateTime(tournament.match_at)}</span>
                <span>·</span>
                <span>{filledSlots}/{tournament.total_slots} Slots</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-3.5 py-2 bg-black/70 border border-white/10 rounded-xl">
                <div className="text-[10px] text-slate-300 uppercase">Prize Pool</div>
                <div className="font-mono font-bold text-emerald-400 text-base tabular-nums">
                  {formatINR(tournament.prize_pool)}
                </div>
              </div>
              <div className="px-3.5 py-2 bg-black/70 border border-white/10 rounded-xl">
                <div className="text-[10px] text-slate-300 uppercase">Entry Fee</div>
                <div className="font-mono font-bold text-orange-400 text-base tabular-nums">
                  {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Evenly-Spaced Navigation Tabs (Fully visible on mobile & desktop) */}
      <div className="w-full bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('room')}
            className={`min-h-[42px] py-2 px-2 text-xs sm:text-sm font-gaming font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'room'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Live Room</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`min-h-[42px] py-2 px-2 text-xs sm:text-sm font-gaming font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`min-h-[42px] py-2 px-2 text-xs sm:text-sm font-gaming font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Players ({filledSlots})</span>
          </button>
        </div>

        {tournament.status === 'Completed' && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`w-full min-h-[40px] py-2 px-3 text-xs sm:text-sm font-gaming font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'results'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Match Results</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: LIVE ROOM & JOIN */}
      {activeTab === 'room' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Room Credentials & Timings */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-gaming font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Custom Room Schedule
                </span>
                <span className="text-xs font-mono text-orange-600 dark:text-orange-400 font-semibold">
                  {room?.status || 'Scheduled'} · IST
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Opens</div>
                  <div className="font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5 tabular-nums">
                    {formatISTTime(room?.opening_time)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Starts</div>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                    {formatISTTime(room?.match_start_time)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Closes</div>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                    {formatISTTime(room?.closing_time)}
                  </div>
                </div>
              </div>

              {user && (isApproved || isStaff) && room && !room.locked && room.room_id_code ? (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-400 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-gaming font-bold text-sm">
                      <Unlock className="w-5 h-5" />
                      <span>Room Credentials Unlocked</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500">Room ID</div>
                        <div className="font-mono font-bold text-xl text-slate-900 dark:text-white">{room.room_id_code}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(room.room_id_code, 'id')}
                        className="p-2 bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white rounded-lg transition-colors"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500">Password</div>
                        <div className="font-mono font-bold text-xl text-orange-600 dark:text-amber-400">{room.room_password}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(room.room_password, 'pass')}
                        className="p-2 bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white rounded-lg transition-colors"
                      >
                        {copiedPass ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 text-center">
                  <div className="inline-flex p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                      {!user
                        ? 'Login Required'
                        : !isRegistered
                          ? 'Register to Unlock Room'
                          : isPending
                            ? 'Payment Under Admin Review'
                            : !countdown.isPast
                              ? 'Room Opens Soon'
                              : 'Room Credentials Locked'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      {!user
                        ? 'Sign in to reserve your slot and unlock Room ID & Password.'
                        : !isRegistered
                          ? 'Join this match to reserve your slot.'
                          : isPending
                            ? 'Your UTR & screenshot have been sent to Admin. Once approved, room credentials will unlock here.'
                            : !countdown.isPast
                              ? `Slot confirmed! Room opens at ${formatISTTime(room?.opening_time)} IST.`
                              : room?.reason || 'Room credentials are for verified players.'}
                    </p>
                  </div>

                  {user && (isApproved || isStaff) && !countdown.isPast && (
                    <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto tabular-nums">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="font-mono font-bold text-xl text-orange-600 dark:text-orange-400">{String(countdown.hours).padStart(2, '0')}</div>
                        <div className="text-[10px] text-slate-500">Hrs</div>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="font-mono font-bold text-xl text-orange-600 dark:text-orange-400">{String(countdown.minutes).padStart(2, '0')}</div>
                        <div className="text-[10px] text-slate-500">Min</div>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="font-mono font-bold text-xl text-red-600 dark:text-red-400">{String(countdown.seconds).padStart(2, '0')}</div>
                        <div className="text-[10px] text-slate-500">Sec</div>
                      </div>
                    </div>
                  )}

                  {!user && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenAuth('login')}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl"
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAuth('register')}
                        className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-gaming font-semibold text-xs rounded-xl"
                      >
                        Create Account
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Registration Status & Join CTA */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
              <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white pb-2.5 border-b border-slate-200 dark:border-slate-800">
                Match Registration
              </h3>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  <span>Available Slots</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    {tournament.available_slots} / {tournament.total_slots} Left
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${Math.round((filledSlots / tournament.total_slots) * 100)}%` }}
                  />
                </div>
              </div>

              {isRegistered ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Your Slot:</span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">#{registration.slot_number || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className={`font-bold uppercase ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {registration.payment_status}
                    </span>
                  </div>
                  {registration.transaction_ref && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">UTR:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{registration.transaction_ref}</span>
                    </div>
                  )}
                  {registration.rejection_reason && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                      Rejected: {registration.rejection_reason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {tournament.game_mode === 'Duo' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Duo Team</label>
                      {userTeams.length > 0 ? (
                        <select
                          value={selectedTeamId || ''}
                          onChange={e => setSelectedTeamId(e.target.value || null)}
                          className={inputClass}
                        >
                          {userTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                          <div>Need a 2-member Duo Team first.</div>
                          <button type="button" onClick={() => onNavigate('dashboard', { tab: 'teams' })} className="text-orange-600 dark:text-orange-400 font-bold hover:underline">
                            Create Duo Team →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) onOpenAuth('login');
                      else setShowJoinModal(true);
                    }}
                    disabled={tournament.available_slots <= 0 || tournament.status !== 'Registration Open'}
                    className="w-full min-h-[44px] py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {tournament.available_slots <= 0
                      ? 'Slots Full'
                      : tournament.status !== 'Registration Open'
                        ? 'Registration Closed'
                        : tournament.entry_fee === 0
                          ? 'Join Match (Free)'
                          : `Join Match · ${formatINR(tournament.entry_fee)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULES */}
      {activeTab === 'rules' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
          <h3 className="font-gaming font-bold text-xl text-slate-900 dark:text-white">Match Rules &amp; Scoring</h3>
          <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-line leading-relaxed">
            {tournament.rules_text || 'Standard Free Fire Battle Royale rules apply. Mobile devices only.'}
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Points</div>
              <div className="text-slate-600 dark:text-slate-400">12 pts Booyah, 9 pts 2nd, 8 pts 3rd + 1 pt per kill.</div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Devices</div>
              <div className="text-slate-600 dark:text-slate-400">Mobile only (Android/iOS). No PC emulators.</div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Room Entry</div>
              <div className="text-slate-600 dark:text-slate-400">Join within 10 minutes of room opening.</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROSTER */}
      {activeTab === 'roster' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
              Registered Players ({roster.length})
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">{roster.length} / {tournament.total_slots}</span>
          </div>

          {roster.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No players joined yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roster.map((player, idx) => (
                <div
                  key={player.id || idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-orange-500/10 font-mono font-bold text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                      #{player.slot_number || idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{player.free_fire_ign || player.username}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">UID: {player.free_fire_uid || 'N/A'}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold uppercase shrink-0 ${
                    (player.payment_status_detail || player.payment_status) === 'approved'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {player.payment_status_detail || player.payment_status || 'Confirmed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESULTS */}
      {activeTab === 'results' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
            Official Match Results
          </h3>
          {results.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">No results published yet.</div>
          ) : (
            <div className="space-y-2.5">
              {results.map((resItem, idx) => (
                <div
                  key={resItem.id || idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-gaming font-bold text-lg text-orange-600 dark:text-amber-400 w-7 text-center">#{resItem.rank}</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{resItem.player_name}</div>
                      <div className="text-xs text-slate-500">Kills: {resItem.kills} · Place: {resItem.placement_points}</div>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">{resItem.total_points} PTS</div>
                    {resItem.prize_amount > 0 && (
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Won {formatINR(resItem.prize_amount)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOIN & UPI PAYMENT MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm touch-pan-y [-webkit-overflow-scrolling:touch]">
          <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-500" />
                <span className="font-gaming font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  {joinStep === 'confirm' && 'Confirm Slot'}
                  {joinStep === 'payment' && 'Pay via UPI'}
                  {joinStep === 'done' && 'Sent for Approval'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setShowJoinModal(false); setPaymentError(null); }}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            {/* 3 Step Bar */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs font-semibold">
              <div className={`py-1.5 rounded-lg ${joinStep === 'confirm' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>1. Slot</div>
              <div className={`py-1.5 rounded-lg ${joinStep === 'payment' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>2. UPI Pay</div>
              <div className={`py-1.5 rounded-lg ${joinStep === 'done' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-500'}`}>3. Done</div>
            </div>

            {paymentError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {joinStep === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Match:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-right">{tournament.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mode:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{tournament.game_mode} ({tournament.map_name})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entry Fee:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 min-h-[42px] py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={paymentSubmitting}
                    className="flex-[2] min-h-[42px] py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl disabled:opacity-50"
                  >
                    {paymentSubmitting ? 'Reserving...' : 'Confirm & Proceed'}
                  </button>
                </div>
              </div>
            )}

            {joinStep === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
                <div className="text-center space-y-2">
                  <div className="p-2.5 bg-white rounded-xl inline-block border border-slate-200 shadow-sm">
                    <img
                      src={settings.payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${settings.upi_id || 'flaxy.esports@icici'}&pn=FlaxyEsports&am=${tournament.entry_fee}&cu=INR`}
                      alt="UPI QR"
                      className="w-36 h-36 object-contain mx-auto"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <a
                      href={`upi://pay?pa=${settings.upi_id || 'flaxy.esports@icici'}&pn=FlaxyEsports&am=${tournament.entry_fee}&cu=INR`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                      <span>Open UPI App</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings.upi_id || 'flaxy.esports@icici', 'upi')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-orange-600 dark:text-orange-400 flex items-center gap-1.5"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{settings.upi_id || 'flaxy.esports@icici'}</span>
                    </button>
                  </div>

                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    Pay Exact: {formatINR(tournament.entry_fee)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number *</label>
                  <input type="tel" required placeholder="+91 9876543210" value={paymentWhatsapp} onChange={e => setPaymentWhatsapp(e.target.value)} className={inputClass} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">12-Digit UTR / Transaction ID *</label>
                  <input type="text" required placeholder="e.g. 482910482910" value={utrRef} onChange={e => setUtrRef(e.target.value)} className={`${inputClass} font-mono`} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Screenshot *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200"
                  />
                  {screenshotUrl && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                      <img src={screenshotUrl} alt="Receipt" className="w-10 h-10 object-cover rounded-lg" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot attached
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowJoinModal(false); setPaymentError(null); }}
                    className="flex-1 min-h-[42px] py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentSubmitting}
                    className="flex-[2] min-h-[42px] py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl disabled:opacity-50"
                  >
                    {paymentSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </div>
              </form>
            )}

            {joinStep === 'done' && (
              <div className="text-center space-y-4 py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">Sent to Admin!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Room ID &amp; Password will unlock here automatically once Admin approves your payment.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowJoinModal(false); onNavigate('dashboard', { tab: 'payments' }); }}
                    className="px-5 py-2.5 bg-orange-600 text-white font-bold text-xs rounded-xl"
                  >
                    Open Wallet
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
