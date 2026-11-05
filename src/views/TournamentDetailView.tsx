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
  QrCode,
  Upload,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  Award,
  CheckCircle2,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime, formatISTTime, getTimeRemaining } from '../lib/api.js';

interface TournamentDetailViewProps {
  tournamentId: number;
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
  const [activeTab, setActiveTab] = useState<'room' | 'rules' | 'roster' | 'results'>('rules');

  // Duo Teams state
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Join & Payment Modal
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinStep, setJoinStep] = useState<'confirm' | 'payment' | 'done'>('confirm');
  const [registeredSlot, setRegisteredSlot] = useState<number | null>(null);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [utrRef, setUtrRef] = useState<string>('');
  const [paymentWhatsapp, setPaymentWhatsapp] = useState<string>(user?.phone || '');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Real-time Room Countdown
  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isPast: false });

  // Roster and Results
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

    // Fetch Room Status & Credentials (with security rules enforced by server)
    apiRequest<any>(`/rooms/${tournamentId}`)
      .then(res => setRoom(res))
      .catch(() => {});

    // Fetch public settings for UPI ID & QR
    apiRequest<{ settings: Record<string, string> }>('/settings/public')
      .then(res => setSettings(res.settings || {}))
      .catch(() => {});
  };

  useEffect(() => {
    fetchTournamentData();
    const interval = setInterval(() => {
      apiRequest<any>(`/rooms/${tournamentId}`)
        .then(res => setRoom(res))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [tournamentId, user]);

  // Load Duo teams if tournament is Duo
  useEffect(() => {
    if (user && tournament?.game_mode === 'Duo') {
      apiRequest<{ teams: any[] }>('/teams/my')
        .then(res => {
          const eligibleTeams = (res.teams || []).filter(t => (t.members || []).length === 2);
          setUserTeams(eligibleTeams);
          if (eligibleTeams.length > 0) {
            setSelectedTeamId(eligibleTeams[0].id);
          }
        })
        .catch(() => {});
    }
  }, [user, tournament]);

  // Load roster or results when tabs change
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

  // Real-time ticking countdown for Room Opening
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

  // Handle Registration / Slot Reservation
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
        registrationId: number;
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

  // Handle Manual UPI Payment Submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrRef.trim()) {
      setPaymentError('Please enter the 12-digit UTR/Transaction reference number.');
      return;
    }
    if (!paymentWhatsapp.trim()) {
      setPaymentError('Please provide your active WhatsApp number so admin can contact you.');
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
          screenshot_url: screenshotUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500',
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

  // Convert uploaded image file to Data URL
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
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-slate-400 space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
        <div className="text-sm font-semibold">Loading tournament arena...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-gaming font-bold text-slate-200">Tournament Not Found</h2>
        <button
          onClick={() => onNavigate('tournaments')}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold"
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  const filledSlots = tournament.total_slots - tournament.available_slots;
  const isRegistered = Boolean(registration);
  const isApproved = registration?.payment_status === 'approved';
  const isPending = registration?.payment_status === 'pending';
  const isStaff = user && ['super_admin', 'tournament_manager', 'payment_manager'].includes(user.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('tournaments')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tournaments</span>
      </button>

      {/* Hero Header Card */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img
            src={tournament.banner_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200'}
            alt={tournament.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-900/90 text-orange-400 border border-slate-700 backdrop-blur-md uppercase">
              {tournament.game_mode}
            </span>
            <span className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-md flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              {tournament.map_name}
            </span>
            <span className={`px-3 py-1 text-xs font-bold rounded-xl uppercase tracking-wider ${
              tournament.status === 'Registration Open'
                ? 'bg-emerald-500 text-slate-950 font-extrabold'
                : tournament.status === 'Live'
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-200'
            }`}>
              {tournament.status}
            </span>
          </div>

          {/* User Registration Status Tag (if registered) */}
          {isRegistered && (
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold flex items-center gap-1.5 shadow-lg ${
                isApproved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 backdrop-blur-md'
              }`}>
                {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                <span>{isApproved ? 'CONFIRMED (SLOT LOCKED)' : 'PAYMENT PENDING'}</span>
              </span>
            </div>
          )}

          {/* Bottom Title & Details */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-gaming font-extrabold text-2xl sm:text-4xl text-white tracking-wide">
                {tournament.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
                  <Clock className="w-4 h-4" />
                  Match Date: {formatISTDateTime(tournament.match_at)}
                </span>
                <span>•</span>
                <span>Slots: {filledSlots}/{tournament.total_slots} Filled</span>
              </div>
            </div>

            {/* Price Cards */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl backdrop-blur-md">
                <div className="text-[10px] text-slate-400 uppercase">Prize Pool</div>
                <div className="font-gaming font-extrabold text-emerald-400 text-xl">
                  {formatINR(tournament.prize_pool)}
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl backdrop-blur-md">
                <div className="text-[10px] text-slate-400 uppercase">Entry Fee</div>
                <div className="font-gaming font-extrabold text-orange-400 text-xl">
                  {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('room')}
          className={`px-5 py-2.5 text-sm font-gaming font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'room'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live Room & Timings</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-2.5 text-sm font-gaming font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Tournament Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-5 py-2.5 text-sm font-gaming font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Participants Roster</span>
        </button>

        {tournament.status === 'Completed' && (
          <button
            onClick={() => setActiveTab('results')}
            className={`px-5 py-2.5 text-sm font-gaming font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'results'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Match Results & Standings</span>
          </button>
        )}
      </div>

      {/* TAB 1: LIVE ROOM & TIMINGS (CRITICAL REQUIREMENT 6) */}
      {activeTab === 'room' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Room Status & Countdown */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-gaming font-bold text-lg text-white">
                    FREE FIRE CUSTOM ROOM
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                    room?.status === 'open'
                      ? 'bg-emerald-500 text-slate-950 font-extrabold'
                      : room?.status === 'live'
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                  }`}>
                    {room?.status || 'Scheduled'}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Timezone: <span className="text-orange-400 font-bold">Asia/Kolkata (IST)</span>
                </div>
              </div>

              {/* Room Schedule Timings Table */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Room Opening</div>
                  <div className="font-semibold text-orange-400 mt-1">
                    {formatISTTime(room?.opening_time)}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Match Start</div>
                  <div className="font-semibold text-emerald-400 mt-1">
                    {formatISTTime(room?.match_start_time)}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Room Closing</div>
                  <div className="font-semibold text-slate-300 mt-1">
                    {formatISTTime(room?.closing_time)}
                  </div>
                </div>
              </div>

              {/* AUTOMATED CREDENTIALS REVEAL / LOCK LOGIC */}
              {user && (isApproved || isStaff) && room && !room.locked && room.room_id_code ? (
                // UNLOCKED STATE
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-950 to-orange-500/10 border-2 border-emerald-500/40 space-y-5 glow-orange">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-gaming font-bold text-sm tracking-wider">
                      <Unlock className="w-5 h-5" />
                      <span>ROOM CREDENTIALS UNLOCKED</span>
                    </div>
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                      Verified Access
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Room ID Box */}
                    <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Free Fire Room ID
                        </div>
                        <div className="font-gaming font-extrabold text-2xl text-white tracking-wider font-mono mt-0.5">
                          {room.room_id_code}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(room.room_id_code, 'id')}
                        className="p-2.5 bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl transition-all"
                        title="Copy Room ID"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Room Password Box */}
                    <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Room Password
                        </div>
                        <div className="font-gaming font-extrabold text-2xl text-amber-400 tracking-wider font-mono mt-0.5">
                          {room.room_password}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(room.room_password, 'pass')}
                        className="p-2.5 bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl transition-all"
                        title="Copy Room Password"
                      >
                        {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Joining instructions */}
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      How to Join in Free Fire Client:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Launch Free Fire on your mobile device.</li>
                      <li>Select Game Mode selector → tap <strong>Custom</strong>.</li>
                      <li>Paste the Room ID in the search bar and tap <strong>Join</strong>.</li>
                      <li>Enter the Room Password and take your assigned slot!</li>
                    </ol>
                  </div>
                </div>
              ) : (
                // LOCKED / GATED STATE
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-gaming font-bold text-xl text-white">
                      {!user
                        ? 'LOGIN REQUIRED TO ACCESS ROOM'
                        : !isRegistered
                          ? 'REGISTRATION REQUIRED'
                          : isPending
                            ? 'PAYMENT VERIFICATION PENDING'
                            : !countdown.isPast
                              ? 'ROOM NOT OPEN YET'
                              : 'ROOM CREDENTIALS LOCKED'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {!user
                        ? 'You must sign in with your player account to access live match rooms and view Free Fire credentials.'
                        : !isRegistered
                          ? 'Only registered and confirmed tournament players can access this room. Please register below to book your slot.'
                          : isPending
                            ? 'Your payment submission is currently under review by Admin. Room credentials and countdown will activate as soon as your slot is approved.'
                            : !countdown.isPast
                              ? `Your slot is confirmed! Room opens at ${formatISTTime(room?.opening_time)} IST. Credentials will reveal automatically when the timer reaches zero.`
                              : room?.reason || 'Room credentials are restricted to verified participants.'}
                    </p>
                  </div>

                  {/* Countdown Blocks - only show when user is approved or staff and time is future */}
                  {user && (isApproved || isStaff) && !countdown.isPast && (
                    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="font-gaming font-extrabold text-2xl text-orange-400">
                          {String(countdown.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Hours</div>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="font-gaming font-extrabold text-2xl text-orange-400">
                          {String(countdown.minutes).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Mins</div>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="font-gaming font-extrabold text-2xl text-red-500 animate-pulse">
                          {String(countdown.seconds).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Secs</div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!user ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => onOpenAuth('login')}
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow-lg transition-all"
                      >
                        Sign In to Access Room
                      </button>
                      <button
                        onClick={() => onOpenAuth('register')}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-gaming font-semibold text-xs rounded-xl transition-all"
                      >
                        Create New Account
                      </button>
                    </div>
                  ) : !isRegistered ? (
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-xs rounded-xl shadow-lg transition-all"
                    >
                      Join Tournament & Book Slot
                    </button>
                  ) : isPending ? (
                    <div className="text-xs text-amber-400 font-semibold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 max-w-sm mx-auto">
                      ⏳ Payment screenshot submitted! Admin will verify your transaction shortly.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right: Registration & Slot Action Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
              <h3 className="font-gaming font-bold text-lg text-white pb-3 border-b border-slate-800">
                REGISTRATION STATUS
              </h3>

              {/* Slot Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Available Capacity:</span>
                  <span className="font-mono font-bold text-orange-400">
                    {tournament.available_slots} / {tournament.total_slots} Slots Left
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full"
                    style={{ width: `${Math.round((filledSlots / tournament.total_slots) * 100)}%` }}
                  />
                </div>
              </div>

              {/* User Join Status Display */}
              {isRegistered ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Your Reserved Slot:</span>
                    <span className="font-gaming font-extrabold text-orange-400 text-base">
                      #{registration.slot_number || 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Verification Status:</span>
                    <span className={`text-xs font-bold uppercase ${
                      isApproved ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {registration.payment_status}
                    </span>
                  </div>
                  {registration.transaction_ref && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Submitted UTR:</span>
                      <span className="font-mono text-slate-200">{registration.transaction_ref}</span>
                    </div>
                  )}
                  {registration.rejection_reason && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                      Rejection Reason: {registration.rejection_reason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {tournament.game_mode === 'Duo' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Select Your Duo Team
                      </label>
                      {userTeams.length > 0 ? (
                        <select
                          value={selectedTeamId || ''}
                          onChange={e => setSelectedTeamId(parseInt(e.target.value, 10))}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                        >
                          {userTeams.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} [{t.tag}] (2/2 Warriors)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-2">
                          <div>You must have a Duo Team with 2 members to join this tournament.</div>
                          <button
                            onClick={() => onNavigate('dashboard', { tab: 'teams' })}
                            className="text-orange-400 font-bold hover:underline"
                          >
                            Go to My Teams to create a team →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!user) {
                        onOpenAuth('login');
                      } else {
                        setShowJoinModal(true);
                      }
                    }}
                    disabled={tournament.available_slots <= 0 || tournament.status !== 'Registration Open'}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-sm rounded-2xl shadow-xl shadow-orange-500/25 transition-all disabled:opacity-50 tracking-wider"
                  >
                    {tournament.available_slots <= 0
                      ? 'SLOTS ARE FULL'
                      : tournament.status !== 'Registration Open'
                        ? 'REGISTRATION CLOSED'
                        : tournament.entry_fee === 0
                          ? 'JOIN TOURNAMENT (FREE)'
                          : `JOIN FOR ${formatINR(tournament.entry_fee)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULES */}
      {activeTab === 'rules' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6">
          <h3 className="font-gaming font-bold text-2xl text-white">
            TOURNAMENT RULES & FAIR PLAY
          </h3>
          <div className="prose prose-invert max-w-none text-slate-300 text-sm whitespace-pre-line leading-relaxed">
            {tournament.rules_text || 'Standard competitive Free Fire Battle Royale rules apply. Mobile devices only.'}
          </div>
          <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="font-bold text-white mb-1">Scoring Criteria</div>
              <div className="text-slate-400">12 Points for Booyah, 9 for 2nd, 8 for 3rd. 1 Point per confirmed kill.</div>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="font-bold text-white mb-1">Device Restrictions</div>
              <div className="text-slate-400">Strictly mobile devices (iOS/Android). PC Emulators result in immediate disqualification.</div>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="font-bold text-white mb-1">Room Protocol</div>
              <div className="text-slate-400">Join room within 10 minutes of release. Never share password with non-participants.</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROSTER */}
      {activeTab === 'roster' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">
              CONFIRMED PARTICIPANTS ROSTER ({roster.length})
            </h3>
            <span className="text-xs text-slate-400">
              Slots filled: {roster.length} / {tournament.total_slots}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {roster.map((player, idx) => (
              <div
                key={player.id || idx}
                className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 font-gaming font-extrabold text-orange-400 flex items-center justify-center text-xs">
                    #{player.slot_number || idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {player.free_fire_ign || player.username}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      UID: {player.free_fire_uid || 'N/A'} {player.team_name ? `• [${player.team_name}]` : ''}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                  player.payment_status_detail === 'approved' || player.payment_status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {player.payment_status_detail || player.payment_status || 'Confirmed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RESULTS */}
      {activeTab === 'results' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">
              OFFICIAL MATCH RESULTS & PODIUM
            </h3>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Verified by Referee
            </span>
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No results published yet for this tournament.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((resItem, idx) => (
                <div
                  key={resItem.id || idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    resItem.rank === 1
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : resItem.rank === 2
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                        : resItem.rank === 3
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="font-gaming font-extrabold text-xl w-8 text-center">
                      #{resItem.rank}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">
                        {resItem.player_name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Kills: {resItem.kills} • Placement Points: {resItem.placement_points}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-gaming font-extrabold text-lg text-emerald-400">
                      {resItem.total_points} PTS
                    </div>
                    {resItem.prize_amount > 0 && (
                      <div className="text-xs font-semibold text-amber-400">
                        Won {formatINR(resItem.prize_amount)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOIN & PAYMENT MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-400" />
                <span className="font-gaming font-bold text-lg text-white">
                  {joinStep === 'confirm' && 'CONFIRM REGISTRATION'}
                  {joinStep === 'payment' && 'MANUAL UPI PAYMENT'}
                  {joinStep === 'done' && 'REGISTRATION COMPLETED'}
                </span>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* STEP 1: CONFIRM */}
            {joinStep === 'confirm' && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tournament:</span>
                    <span className="font-bold text-white">{tournament.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Match Mode:</span>
                    <span className="font-bold text-orange-400">{tournament.game_mode} ({tournament.map_name})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Entry Fee:</span>
                    <span className="font-gaming font-bold text-emerald-400 text-sm">
                      {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>• Your slot will be reserved immediately in our database.</div>
                  <div>• Ensure your Free Fire UID and IGN match your profile.</div>
                  <div>• Room credentials will unlock on this page at the scheduled time.</div>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={paymentSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  {paymentSubmitting ? 'RESERVING SLOT...' : 'CONFIRM & PROCEED'}
                </button>
              </div>
            )}

            {/* STEP 2: MANUAL UPI PAYMENT (REQUIREMENT 5) */}
            {joinStep === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="text-center space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300">
                    Scan Scanner or Click to Pay via UPI App:
                  </div>

                  {/* Payment Scanner Image */}
                  <div className="p-3 bg-white rounded-2xl inline-block shadow-xl mx-auto border-2 border-orange-500/40">
                    <img
                      src={settings.payment_qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${settings.upi_id || 'flaxy.esports@icici'}&pn=FlaxyEsports&am=${tournament.entry_fee}&cu=INR`}
                      alt="Payment Scanner"
                      className="w-44 h-44 object-contain mx-auto"
                    />
                  </div>

                  {/* Quick UPI App Deep Links */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <a
                      href={`upi://pay?pa=${settings.upi_id || 'flaxy.esports@icici'}&pn=FlaxyEsports&am=${tournament.entry_fee}&cu=INR`}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 hover:border-orange-500 font-semibold flex items-center gap-1.5 shadow"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                      <span>Open UPI App</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings.upi_id || 'flaxy.esports@icici', 'upi')}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-orange-400 hover:text-white font-mono flex items-center gap-1.5 shadow"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{settings.upi_id || 'flaxy.esports@icici'}</span>
                    </button>
                  </div>

                  <div className="text-xs font-gaming font-extrabold text-emerald-400 text-sm">
                    Exact Payable Amount: {formatINR(tournament.entry_fee)}
                  </div>
                </div>

                {/* User's WhatsApp Number (Required) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Active WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={paymentWhatsapp}
                    onChange={e => setPaymentWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Admin will contact you on this WhatsApp if payment needs clarification.
                  </span>
                </div>

                {/* 12-Digit UTR Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    12-Digit UPI Transaction ID / UTR Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 482910482910"
                    value={utrRef}
                    onChange={e => setUtrRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Found in your Google Pay, PhonePe, or Paytm payment receipt.
                  </span>
                </div>

                {/* Screenshot Upload with live preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Upload Payment Screenshot Receipt *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  />
                  {screenshotUrl && (
                    <div className="mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                      <img src={screenshotUrl} alt="Receipt preview" className="w-12 h-12 object-cover rounded-lg border border-slate-700" />
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Screenshot attached for Admin review</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verification Notice */}
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] leading-relaxed">
                  🔒 <strong>Verification Rule:</strong> Payment goes directly to the Admin Panel. Once verified by Admin, Room ID and Password will unlock on your match screen at Room Opening time!
                </div>

                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 tracking-wider"
                >
                  {paymentSubmitting ? 'SENDING TO ADMIN REVIEW...' : 'SUBMIT PAYMENT FOR ADMIN APPROVAL'}
                </button>
              </form>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {joinStep === 'done' && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-gaming font-bold text-2xl text-white">
                    WARRIOR REGISTERED!
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Your tournament slot has been locked in. Track your room credentials on this page or under My Tournaments in your Dashboard.
                  </p>
                </div>

                <button
                  onClick={() => setShowJoinModal(false)}
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow-lg"
                >
                  Back to Match Screen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
