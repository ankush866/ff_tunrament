import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Trophy,
  Users,
  CreditCard,
  Bell,
  HelpCircle,
  Settings,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  LogOut,
  ExternalLink,
  Flame,
  MessageSquare,
  KeyRound,
  Award,
  Swords
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime, formatISTTime, getTimeRemaining } from '../lib/api.js';

interface DashboardViewProps {
  initialTab?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ initialTab = 'overview', onNavigate }) => {
  const { user, updateProfile, notifications, unreadCount, markNotificationRead, markAllNotificationsRead, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  // My Tournaments State
  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // My Matches State (Requirement: Completed tournaments history with rank & rewards)
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [matchStats, setMatchStats] = useState<any>({ total_matches: 0, wins: 0, top_3: 0, total_kills: 0, total_prize_won: 0 });
  const [matchFilter, setMatchFilter] = useState<'all' | 'won' | 'top3' | 'rewarded'>('all');

  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamTag, setNewTeamTag] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [teamMsg, setTeamMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Payments State
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Support Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('Payment');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketScreenshot, setTicketScreenshot] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  // Settings State
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileUid, setProfileUid] = useState(user?.free_fire_uid || '');
  const [profileIgn, setProfileIgn] = useState(user?.free_fire_ign || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password Change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Deactivate
  const [deactivatePass, setDeactivatePass] = useState('');
  const [deactivateMsg, setDeactivateMsg] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load Tournaments & Payments
  const fetchUserData = () => {
    // Fetch payments
    apiRequest<{ payments: any[] }>('/payments/my')
      .then(res => setPayments(res.payments || []))
      .catch(() => {});

    // Fetch user joined tournaments
    apiRequest<{ tournaments: any[] }>('/tournaments')
      .then(async (res) => {
        const allT = res.tournaments || [];
        const myRegistered: any[] = [];
        for (const t of allT) {
          try {
            const detail = await apiRequest(`/tournaments/${t.id}`);
            if (detail.registration) {
              myRegistered.push({
                ...t,
                registration: detail.registration,
                room: detail.room
              });
            }
          } catch {}
        }
        setMyTournaments(myRegistered);
      })
      .catch(() => {});

    // Fetch teams
    apiRequest<{ teams: any[]; pendingInvites: any[] }>('/teams/my')
      .then(res => {
        setTeams(res.teams || []);
        setPendingInvites(res.pendingInvites || []);
      })
      .catch(() => {});

    // Fetch tickets
    apiRequest<{ tickets: any[] }>('/tickets/my')
      .then(res => setTickets(res.tickets || []))
      .catch(() => {});

    // Fetch user matches history (Completed tournaments with rank and rewards)
    apiRequest<{ matches: any[]; stats: any }>('/user/matches')
      .then(res => {
        setMyMatches(res.matches || []);
        setMatchStats(res.stats || { total_matches: 0, wins: 0, top_3: 0, total_kills: 0, total_prize_won: 0 });
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
      setProfileName(user.full_name || '');
      setProfileUid(user.free_fire_uid || '');
      setProfileIgn(user.free_fire_ign || '');
      setProfilePhone(user.phone || '');
      setProfileAvatar(user.avatar_url || '');
    }
  }, [user]);

  // Team Actions
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamMsg(null);
    try {
      await apiRequest('/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName, tag: newTeamTag })
      });
      setNewTeamName('');
      setNewTeamTag('');
      setTeamMsg({ text: 'Duo team created successfully!', isError: false });
      fetchUserData();
    } catch (err: any) {
      setTeamMsg({ text: err.message, isError: true });
    }
  };

  const handleInviteTeammate = async (teamId: number) => {
    if (!inviteUsername.trim()) return;
    setTeamMsg(null);
    try {
      const res = await apiRequest(`/teams/${teamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ username: inviteUsername.trim() })
      });
      setInviteUsername('');
      setTeamMsg({ text: res.message || 'Invitation sent!', isError: false });
      fetchUserData();
    } catch (err: any) {
      setTeamMsg({ text: err.message, isError: true });
    }
  };

  const handleInviteResponse = async (inviteId: number, accept: boolean) => {
    try {
      await apiRequest(`/teams/invites/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept })
      });
      fetchUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Support Ticket Actions
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category: ticketCategory,
          subject: ticketSubject,
          message: ticketMessage,
          screenshot_url: ticketScreenshot
        })
      });
      setShowNewTicket(false);
      setTicketSubject('');
      setTicketMessage('');
      setTicketScreenshot('');
      fetchUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenTicketThread = async (ticket: any) => {
    setSelectedTicket(ticket);
    try {
      const res = await apiRequest<{ replies: any[] }>(`/tickets/${ticket.id}/messages`);
      setTicketReplies(res.replies || []);
    } catch {}
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    try {
      await apiRequest(`/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText })
      });
      setReplyText('');
      handleOpenTicketThread(selectedTicket);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile({
        full_name: profileName,
        free_fire_uid: profileUid,
        free_fire_ign: profileIgn,
        phone: profilePhone,
        avatar_url: profileAvatar
      });
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg(err.message);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirmPass) {
      setPassMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    try {
      await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setPassMsg({ text: 'Password updated successfully.', isError: false });
    } catch (err: any) {
      setPassMsg({ text: err.message, isError: true });
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-gaming font-bold text-white">Please Sign In</h2>
        <p className="text-sm text-slate-400">You must be logged in to access your warrior dashboard.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isStaff = ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(user.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-24">
      {/* Top Profile Strip */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt={user.username}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500/50 shadow-md shadow-orange-500/20"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-gaming font-extrabold text-2xl text-white">
                {user.free_fire_ign || user.username}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
              <span>UID: <strong className="font-mono text-slate-200">{user.free_fire_uid || 'Not set'}</strong></span>
              <span>•</span>
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <button
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-gaming font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('tournaments')}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5"
          >
            <Trophy className="w-4 h-4" />
            <span>Join Tournaments</span>
          </button>
        </div>
      </div>

      {/* Dashboard Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: UserIcon },
            { id: 'tournaments', label: 'My Tournaments', icon: Trophy, count: myTournaments.length },
            { id: 'matches', label: 'My Matches', icon: Swords, count: myMatches.length },
            { id: 'teams', label: 'My Duo Teams', icon: Users, count: teams.length },
            { id: 'payments', label: 'Payment History', icon: CreditCard, count: payments.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
            { id: 'support', label: 'Support Tickets', icon: HelpCircle, count: tickets.length },
            { id: 'settings', label: 'Account Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedTicket(null);
                }}
                className={`w-full p-3.5 rounded-2xl text-xs font-gaming font-bold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-800 text-orange-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="lg:col-span-9">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Tournaments Joined</div>
                  <div className="font-gaming font-extrabold text-3xl text-orange-400">
                    {myTournaments.length}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Active Duo Teams</div>
                  <div className="font-gaming font-extrabold text-3xl text-emerald-400">
                    {teams.length}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Total UPI Transactions</div>
                  <div className="font-gaming font-extrabold text-3xl text-cyan-400">
                    {payments.length}
                  </div>
                </div>
              </div>

              {/* Next Upcoming Match Banner */}
              {myTournaments.length > 0 && (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-500/10 via-slate-900 to-slate-900 border border-orange-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Next Registered Tournament</span>
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Slot #{myTournaments[0].registration?.slot_number || 1} Locked
                    </span>
                  </div>
                  <h3 className="font-gaming font-bold text-xl text-white">
                    {myTournaments[0].title}
                  </h3>
                  <div className="text-xs text-slate-300">
                    Match Scheduled: {formatISTDateTime(myTournaments[0].match_at)}
                  </div>
                  <button
                    onClick={() => onNavigate('tournament-detail', { id: myTournaments[0].id })}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all mt-2"
                  >
                    Open Live Room Credentials
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. MY TOURNAMENTS TAB */}
          {activeTab === 'tournaments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-gaming font-bold text-xl text-white">
                  MY REGISTERED TOURNAMENTS
                </h3>
                <span className="text-xs text-slate-400">Total: {myTournaments.length}</span>
              </div>

              {myTournaments.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
                  <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">You haven't joined any tournaments yet</div>
                  <p className="text-xs text-slate-500">Browse the active brackets and claim your slot now!</p>
                  <button
                    onClick={() => onNavigate('tournaments')}
                    className="px-5 py-2.5 bg-orange-500 text-white text-xs font-gaming font-bold rounded-xl"
                  >
                    Explore Tournaments
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTournaments.map(t => {
                    const isApproved = t.registration?.payment_status === 'approved';
                    const isPending = t.registration?.payment_status === 'pending';

                    return (
                      <div
                        key={t.id}
                        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-gaming font-extrabold text-orange-400 text-sm">
                              Slot #{t.registration?.slot_number || 1}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-400">{t.game_mode} ({t.map_name})</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {t.registration?.payment_status}
                            </span>
                          </div>
                          <h4 className="font-gaming font-bold text-lg text-white">
                            {t.title}
                          </h4>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatISTDateTime(t.match_at)}</span>
                          </div>
                          {t.registration?.rejection_reason && (
                            <div className="text-xs text-red-400 mt-1">
                              Payment Rejected: {t.registration.rejection_reason}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => onNavigate('tournament-detail', { id: t.id })}
                          className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 rounded-xl text-xs font-gaming font-bold transition-all self-start sm:self-auto"
                        >
                          View Room & Timings →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MY MATCHES HISTORY & RESULTS SECTION */}
          {activeTab === 'matches' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-1">
                    <Swords className="w-3.5 h-3.5 text-orange-400" />
                    <span>Battleground History</span>
                  </div>
                  <h3 className="font-gaming font-extrabold text-2xl text-white">
                    MY MATCHES & TOURNAMENT RESULTS
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    History of all completed Free Fire tournaments you competed in, with official standings, kill counts, and cash rewards earned.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('tournaments')}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all self-start sm:self-auto"
                >
                  Join New Tournament
                </button>
              </div>

              {/* Match Performance Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Completed Matches</div>
                  <div className="font-gaming font-extrabold text-2xl text-white">
                    {matchStats.total_matches || myMatches.length}
                  </div>
                  <div className="text-[10px] text-slate-500">Official tournament brackets</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-[11px] text-amber-400 uppercase font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Booyah! (1st Place)</span>
                  </div>
                  <div className="font-gaming font-extrabold text-2xl text-amber-400">
                    {matchStats.wins || 0}
                  </div>
                  <div className="text-[10px] text-slate-500">Champions of the lobby</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-[11px] text-red-400 uppercase font-semibold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Total Kills</span>
                  </div>
                  <div className="font-gaming font-extrabold text-2xl text-red-400">
                    {matchStats.total_kills || 0}
                  </div>
                  <div className="text-[10px] text-slate-500">Eliminations confirmed</div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <div className="text-[11px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Total Rewards Won</span>
                  </div>
                  <div className="font-gaming font-extrabold text-2xl text-emerald-400">
                    {formatINR(matchStats.total_prize_won || 0)}
                  </div>
                  <div className="text-[10px] text-emerald-500/80">Paid directly via UPI</div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: `All Matches (${myMatches.length})` },
                  { id: 'won', label: `🏆 Booyah Wins (${myMatches.filter(m => m.rank === 1).length})` },
                  { id: 'top3', label: `🎖️ Top 3 Podium (${myMatches.filter(m => m.rank && m.rank <= 3).length})` },
                  { id: 'rewarded', label: `💰 Cash Prizes (${myMatches.filter(m => Number(m.prize_amount || 0) > 0).length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setMatchFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      matchFilter === f.id
                        ? 'bg-orange-500 text-white font-bold shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Match List */}
              {(() => {
                const filteredMatches = myMatches.filter(m => {
                  if (matchFilter === 'won') return m.rank === 1;
                  if (matchFilter === 'top3') return m.rank && m.rank <= 3;
                  if (matchFilter === 'rewarded') return Number(m.prize_amount || 0) > 0;
                  return true;
                });

                if (filteredMatches.length === 0) {
                  return (
                    <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                        <Swords className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-gaming font-bold text-lg text-white">No Completed Matches Yet</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          {matchFilter === 'all'
                            ? "You haven't participated in any completed tournaments yet. Enter active tournaments to battle for Booyah and cash prizes!"
                            : "No matches found matching this filter criteria."}
                        </p>
                      </div>
                      {matchFilter === 'all' && (
                        <button
                          onClick={() => onNavigate('tournaments')}
                          className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all"
                        >
                          Browse Active Tournaments
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredMatches.map(m => {
                      const isBooyah = m.rank === 1;
                      const isTop3 = m.rank && m.rank <= 3;
                      const hasPrize = Number(m.prize_amount || 0) > 0;

                      return (
                        <div
                          key={m.tournament_id}
                          className={`p-5 rounded-3xl border transition-all ${
                            isBooyah
                              ? 'bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                              : isTop3
                                ? 'bg-slate-900 border-slate-700'
                                : 'bg-slate-900/80 border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Left: Tournament Image & Info */}
                            <div className="flex items-start gap-4">
                              <img
                                src={m.banner_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'}
                                alt={m.title}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-800 shrink-0"
                              />
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-slate-950 text-orange-400 font-bold text-[10px] uppercase border border-slate-800">
                                    {m.game_mode}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-semibold text-[10px] border border-slate-800">
                                    {m.map_name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30">
                                    Completed
                                  </span>
                                </div>

                                <h4 className="font-gaming font-bold text-base sm:text-lg text-white">
                                  {m.title}
                                </h4>

                                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    {formatISTDateTime(m.match_at)}
                                  </span>
                                  {m.slot_number && (
                                    <>
                                      <span>•</span>
                                      <span>Slot #{m.slot_number}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Middle / Right: Rank & Performance Badge */}
                            <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                              {/* Standing Badge */}
                              <div className="text-left md:text-right">
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Final Standing</div>
                                {m.rank ? (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {isBooyah ? (
                                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-gaming font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                                        🏆 BOOYAH #1
                                      </span>
                                    ) : m.rank === 2 ? (
                                      <span className="px-3 py-1 rounded-xl bg-slate-300/20 border border-slate-300/40 text-slate-200 font-gaming font-extrabold text-sm flex items-center gap-1.5">
                                        🥈 RUNNER UP #2
                                      </span>
                                    ) : m.rank === 3 ? (
                                      <span className="px-3 py-1 rounded-xl bg-amber-700/20 border border-amber-700/40 text-amber-500 font-gaming font-extrabold text-sm flex items-center gap-1.5">
                                        🥉 3RD PLACE #3
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-gaming font-bold text-xs">
                                        RANK #{m.rank}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">Scoreboard Verified</span>
                                )}
                              </div>

                              {/* Performance Stats Pill */}
                              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                <div className="text-center px-2">
                                  <div className="text-[10px] text-slate-500 uppercase">Kills</div>
                                  <div className="font-gaming font-bold text-red-400">{m.kills || 0}</div>
                                </div>
                                <div className="w-px h-6 bg-slate-800"></div>
                                <div className="text-center px-2">
                                  <div className="text-[10px] text-slate-500 uppercase">Points</div>
                                  <div className="font-gaming font-bold text-orange-400">{m.total_points || 0}</div>
                                </div>
                              </div>

                              {/* Cash Reward Badge */}
                              {hasPrize && (
                                <div className="text-right">
                                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">Earned Reward</div>
                                  <div className="font-gaming font-extrabold text-lg text-emerald-400">
                                    +{formatINR(m.prize_amount)}
                                  </div>
                                </div>
                              )}

                              {/* Details Button */}
                              <button
                                onClick={() => onNavigate('tournament-detail', { id: m.tournament_id })}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                              >
                                <span>Leaderboard</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {m.notes && (
                            <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{m.notes}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 4. MY DUO TEAMS TAB (REQUIREMENT 4) */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-gaming font-bold text-xl text-white">
                    DUO TEAMS MANAGEMENT
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Create your 2-player team and invite your partner to conquer Duo tournament brackets.
                  </p>
                </div>
              </div>

              {teamMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  teamMsg.isError
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {teamMsg.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{teamMsg.text}</span>
                </div>
              )}

              {/* Pending Invitations Box */}
              {pendingInvites.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="font-gaming font-bold text-sm text-amber-400">
                    PENDING TEAM INVITATIONS ({pendingInvites.length})
                  </div>
                  {pendingInvites.map(inv => (
                    <div key={inv.invite_id} className="p-3 bg-slate-950 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{inv.captain_name}</span> invited you to join{' '}
                        <strong className="text-orange-400">{inv.team_name} [{inv.tag}]</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInviteResponse(inv.invite_id, true)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleInviteResponse(inv.invite_id, false)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Team Form */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h4 className="font-gaming font-bold text-sm text-slate-200">
                  CREATE NEW DUO TEAM
                </h4>
                <form onSubmit={handleCreateTeam} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Team Name (e.g. Apex Predators)"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    className="sm:col-span-2 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Tag (e.g. APEX)"
                    value={newTeamTag}
                    onChange={e => setNewTeamTag(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all"
                  >
                    CREATE DUO TEAM
                  </button>
                </form>
              </div>

              {/* Active Teams List */}
              <div className="space-y-4">
                <h4 className="font-gaming font-bold text-sm text-slate-200">
                  YOUR TEAMS ({teams.length})
                </h4>
                {teams.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center">
                    You are not part of any team yet. Create one above to compete in Duo brackets.
                  </div>
                ) : (
                  teams.map(team => (
                    <div key={team.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <div className="font-gaming font-extrabold text-xl text-white">
                            {team.name} <span className="text-orange-400">[{team.tag}]</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Role: <strong className="capitalize text-slate-300">{team.member_role}</strong>
                          </div>
                        </div>
                        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                          {team.members?.length || 0}/2 Members
                        </span>
                      </div>

                      {/* Members list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {team.members?.map((m: any) => (
                          <div key={m.membership_id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={m.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                alt={m.username}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{m.free_fire_ign || m.username}</span>
                                  {m.role === 'captain' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded">Captain</span>}
                                </div>
                                <div className="text-[10px] text-slate-500">UID: {m.free_fire_uid || 'N/A'}</div>
                              </div>
                            </div>
                            <span className={`text-[10px] uppercase font-bold ${
                              m.status === 'accepted' ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Invite input if captain and team not full */}
                      {team.captain_id === user.id && (team.members?.length || 0) < 2 && (
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter teammate Flaxy username..."
                            value={inviteUsername}
                            onChange={e => setInviteUsername(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleInviteTeammate(team.id)}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl"
                          >
                            Send Invite
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. PAYMENTS & TRANSACTIONS TAB (REQUIREMENT 5) */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-gaming font-bold text-xl text-white">
                  TRANSACTION & UPI HISTORY
                </h3>
                <span className="text-xs text-slate-400">Total Submissions: {payments.length}</span>
              </div>

              {payments.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500 text-sm">
                  No transaction records found.
                </div>
              ) : (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800">
                  {payments.map(p => (
                    <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-sm text-white">{p.tournament_title}</div>
                        <div className="text-slate-400 font-mono mt-0.5">
                          UTR Ref: <strong className="text-slate-200">{p.transaction_ref}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Submitted: {formatISTDateTime(p.created_at)}
                        </div>
                        {p.rejection_reason && (
                          <div className="text-red-400 mt-1 text-[11px]">
                            Reason: {p.rejection_reason}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                        <div className="font-gaming font-extrabold text-lg text-emerald-400">
                          {formatINR(p.amount)}
                        </div>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase mt-1 ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : p.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : p.status === 'refunded'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-gaming font-bold text-xl text-white">
                  IN-APP NOTIFICATIONS
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-orange-400 hover:underline font-semibold"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-sm">
                  You have no notifications yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!item.is_read) markNotificationRead(item.id);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        item.is_read
                          ? 'bg-slate-900 border-slate-800/80 opacity-70'
                          : 'bg-slate-900 border-orange-500/40 glow-orange'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-gaming font-bold text-white text-sm">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatISTDateTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. SUPPORT TICKETS TAB (REQUIREMENT 22) */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-gaming font-bold text-xl text-white">
                    SUPPORT DESK & TICKETS
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Have an issue with payments or room credentials? Chat with tournament staff.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNewTicket(!showNewTicket);
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Ticket</span>
                </button>
              </div>

              {/* Create Ticket Form */}
              {showNewTicket && (
                <form onSubmit={handleCreateTicket} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="font-gaming font-bold text-base text-white">CREATE SUPPORT TICKET</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                      <select
                        value={ticketCategory}
                        onChange={e => setTicketCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      >
                        <option value="Payment">Payment Verification Dispute</option>
                        <option value="Tournament">Tournament Slot Issue</option>
                        <option value="Room Issue">Room Credentials Missing</option>
                        <option value="Account">Account Settings & Ban Appeal</option>
                        <option value="Bug">Bug Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="Brief summary of your query"
                        value={ticketSubject}
                        onChange={e => setTicketSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Message</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describe what happened, including any relevant UTRs or match details..."
                      value={ticketMessage}
                      onChange={e => setTicketMessage(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all"
                  >
                    SUBMIT TICKET
                  </button>
                </form>
              )}

              {/* Thread Viewer */}
              {selectedTicket ? (
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono text-orange-400 font-bold">{selectedTicket.ticket_code}</span>
                      <h4 className="font-gaming font-bold text-lg text-white">{selectedTicket.subject}</h4>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Close Chat
                    </button>
                  </div>

                  {/* Initial message */}
                  <div className="p-4 bg-slate-950 rounded-2xl text-xs space-y-1">
                    <div className="text-slate-500 text-[10px]">{formatISTDateTime(selectedTicket.created_at)}</div>
                    <div className="text-slate-200">{selectedTicket.message}</div>
                  </div>

                  {/* Replies thread */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {ticketReplies.map(reply => (
                      <div
                        key={reply.id}
                        className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                          reply.is_admin
                            ? 'bg-amber-500/10 border border-amber-500/30 text-slate-200 ml-6'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-orange-400">
                            {reply.is_admin ? 'Staff Referee' : reply.username}
                          </span>
                          <span className="text-slate-500">{formatISTDateTime(reply.created_at)}</span>
                        </div>
                        <div>{reply.message}</div>
                      </div>
                    ))}
                  </div>

                  {/* Send reply */}
                  <form onSubmit={handleSendTicketReply} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your reply to staff..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">
                      No tickets open. Use "New Ticket" if you need assistance.
                    </div>
                  ) : (
                    tickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => handleOpenTicketThread(ticket)}
                        className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/40 cursor-pointer transition-all flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-orange-400 font-bold">{ticket.ticket_code}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400">
                              {ticket.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-sm mt-0.5">{ticket.subject}</h4>
                          <div className="text-[10px] text-slate-500 mt-1">{formatISTDateTime(ticket.created_at)}</div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          ticket.status === 'open'
                            ? 'bg-amber-500/20 text-amber-400'
                            : ticket.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* 7. ACCOUNT SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Profile Information */}
              <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h4 className="font-gaming font-bold text-lg text-white">
                  WARRIOR PROFILE SETTINGS
                </h4>

                {profileMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl">
                    {profileMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Free Fire In-Game Name (IGN) *</label>
                    <input
                      type="text"
                      required
                      value={profileIgn}
                      onChange={e => setProfileIgn(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Free Fire UID *</label>
                    <input
                      type="text"
                      required
                      value={profileUid}
                      onChange={e => setProfileUid(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={e => setProfilePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Avatar Image URL</label>
                    <input
                      type="url"
                      value={profileAvatar}
                      onChange={e => setProfileAvatar(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all"
                >
                  SAVE PROFILE CHANGES
                </button>
              </form>

              {/* Change Password */}
              <form onSubmit={handleChangePassword} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h4 className="font-gaming font-bold text-lg text-white">CHANGE ACCOUNT PASSWORD</h4>

                {passMsg && (
                  <div className={`p-3 rounded-xl text-xs ${
                    passMsg.isError ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {passMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPass}
                      onChange={e => setCurrentPass(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">New Password (min 6)</label>
                    <input
                      type="password"
                      required
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-gaming font-bold text-xs rounded-xl"
                >
                  UPDATE PASSWORD
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
