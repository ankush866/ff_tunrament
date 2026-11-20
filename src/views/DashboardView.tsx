import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Trophy,
  Users,
  Wallet,
  Bell,
  HelpCircle,
  Settings,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Plus,
  Swords,
  Camera,
  Upload,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime } from '../lib/api.js';
import { DEFAULT_MATCH_BANNER, DEFAULT_PLAYER_AVATAR, getSafeImageUrl } from '../lib/assets.js';

interface DashboardViewProps {
  initialTab?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ initialTab = 'overview', onNavigate }) => {
  const { user, logout, updateProfile, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [matchStats, setMatchStats] = useState<any>({ total_matches: 0, wins: 0, top_3: 0, total_kills: 0, total_prize_won: 0 });
  const [matchFilter, setMatchFilter] = useState<'all' | 'won' | 'top3' | 'rewarded'>('all');

  const [teams, setTeams] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamTag, setNewTeamTag] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [teamMsg, setTeamMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  const [tickets, setTickets] = useState<any[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('Payment');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileUid, setProfileUid] = useState(user?.free_fire_uid || '');
  const [profileIgn, setProfileIgn] = useState(user?.free_fire_ign || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg('Please choose a photo under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setProfileAvatar(base64);
        setProfileMsg('Photo selected! Click "Save Profile" to update.');
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchUserData = () => {
    apiRequest<{ payments: any[] }>('/payments/my')
      .then(res => setPayments(res.payments || []))
      .catch(() => {});

    apiRequest<{ settings: Record<string, string> }>('/settings/public')
      .then(res => setSiteSettings(res.settings || {}))
      .catch(() => {});

    apiRequest<{ tournaments: any[] }>('/tournaments')
      .then(async (res) => {
        const allT = res.tournaments || [];
        const myRegistered: any[] = [];
        for (const t of allT) {
          try {
            const detail = await apiRequest(`/tournaments/${t.id}`);
            if (detail.registration) {
              myRegistered.push({ ...t, registration: detail.registration, room: detail.room });
            }
          } catch {}
        }
        setMyTournaments(myRegistered);
      })
      .catch(() => {});

    apiRequest<{ teams: any[]; pendingInvites: any[] }>('/teams/my')
      .then(res => {
        setTeams(res.teams || []);
        setPendingInvites(res.pendingInvites || []);
      })
      .catch(() => {});

    apiRequest<{ tickets: any[] }>('/tickets/my')
      .then(res => setTickets(res.tickets || []))
      .catch(() => {});

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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamMsg(null);
    try {
      await apiRequest('/teams', { method: 'POST', body: JSON.stringify({ name: newTeamName, tag: newTeamTag }) });
      setNewTeamName('');
      setNewTeamTag('');
      setTeamMsg({ text: 'Duo team created!', isError: false });
      fetchUserData();
    } catch (err: any) {
      setTeamMsg({ text: err.message, isError: true });
    }
  };

  const handleInviteTeammate = async (teamId: string | number) => {
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

  const handleInviteResponse = async (inviteId: string | number, accept: boolean) => {
    try {
      await apiRequest(`/teams/invites/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept })
      });
      fetchUserData();
    } catch {}
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({ category: ticketCategory, subject: ticketSubject, message: ticketMessage })
      });
      setShowNewTicket(false);
      setTicketSubject('');
      setTicketMessage('');
      fetchUserData();
    } catch {}
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
    } catch {}
  };

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
      setProfileMsg('Profile saved!');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg(err.message);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-gaming font-bold text-slate-900 dark:text-white">Please Login</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Sign in to open your Wallet &amp; Profile.</p>
        <button type="button" onClick={() => onNavigate('home')} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold">
          Back Home
        </button>
      </div>
    );
  }

  const isStaff = ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(user.role);

  const tabs = [
    { id: 'overview', label: 'Profile', icon: UserIcon },
    { id: 'payments', label: 'Wallet', icon: Wallet, count: payments.length },
    { id: 'tournaments', label: 'Joined', icon: Trophy, count: myTournaments.length },
    { id: 'matches', label: 'History', icon: Swords, count: myMatches.length },
    { id: 'teams', label: 'Teams', icon: Users, count: teams.length },
    { id: 'notifications', label: 'Alerts', icon: Bell, count: unreadCount },
    { id: 'support', label: 'Support', icon: HelpCircle, count: tickets.length },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Compact Profile Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="relative group shrink-0 cursor-pointer"
            title="Change profile photo"
          >
            <img
              src={getSafeImageUrl(user.avatar_url, DEFAULT_PLAYER_AVATAR)}
              alt={user.username}
              referrerPolicy="no-referrer"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500/50"
            />
            <span className="absolute -bottom-1 -right-1 p-1 bg-orange-600 rounded-lg text-white shadow">
              <Camera className="w-3 h-3" />
            </span>
          </button>
          <div className="min-w-0">
            <h2 className="font-gaming font-bold text-lg sm:text-xl text-slate-900 dark:text-white truncate">
              {user.free_fire_ign || user.username}
            </h2>
            <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
              <span className="font-mono">UID: {user.free_fire_uid || 'Not set'}</span>
              <span>·</span>
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isStaff && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="min-h-[38px] px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-gaming font-bold text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('tournaments')}
            className="min-h-[38px] px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Matches</span>
          </button>
        </div>
      </div>

      {/* Responsive Tab Switcher: Scrollable Pills on Mobile, Sidebar on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setSelectedTicket(null); }}
                className={`min-h-[40px] px-3.5 py-2.5 rounded-xl text-xs font-gaming font-bold flex items-center justify-between gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                    isActive ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => logout()}
            className="min-h-[40px] px-3.5 py-2.5 rounded-xl text-xs font-gaming font-bold flex items-center justify-between gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer bg-red-500/10 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-500/30"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </span>
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          {/* PROFILE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">Joined</div>
                  <div className="font-gaming font-bold text-2xl text-orange-600 dark:text-orange-400 tabular-nums mt-0.5">{myTournaments.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">Prize Won</div>
                  <div className="font-gaming font-bold text-2xl text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{formatINR(matchStats.total_prize_won || 0)}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">Teams</div>
                  <div className="font-gaming font-bold text-2xl text-slate-900 dark:text-white tabular-nums mt-0.5">{teams.length}</div>
                </div>
              </div>

              {myTournaments.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-orange-500/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Next Match
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Slot #{myTournaments[0].registration?.slot_number || 1}
                    </span>
                  </div>
                  <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">{myTournaments[0].title}</h3>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{formatISTDateTime(myTournaments[0].match_at)}</div>
                  <button
                    type="button"
                    onClick={() => onNavigate('tournament-detail', { id: myTournaments[0].id })}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl"
                  >
                    Open Room ID
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 text-left space-y-1 cursor-pointer"
                >
                  <Wallet className="w-5 h-5 text-emerald-500" />
                  <div className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Wallet &amp; UPI</div>
                  <div className="text-xs text-slate-500">View payments &amp; winnings</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 text-left space-y-1 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-orange-500" />
                  <div className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Edit Profile &amp; Photo</div>
                  <div className="text-xs text-slate-500">Update photo, UID &amp; password</div>
                </button>
              </div>
            </div>
          )}

          {/* WALLET TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Total Winnings</div>
                  <div className="font-gaming font-bold text-2xl text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                    {formatINR(matchStats.total_prize_won || 0)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Approved Entries</div>
                  <div className="font-gaming font-bold text-2xl text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {payments.filter(p => p.status === 'approved').length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">Official UPI ID</div>
                  <div className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400 truncate mt-1">
                    {siteSettings.upi_id || 'flaxy.esports@icici'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Wallet &amp; UPI Transactions</h3>
                  <span className="text-xs text-slate-500 tabular-nums">{payments.length} Total</span>
                </div>
                {payments.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">No UPI transactions yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.map(p => (
                      <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{p.tournament_title}</div>
                          <div className="text-slate-600 dark:text-slate-400 font-mono mt-0.5">UTR: {p.transaction_ref}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{formatISTDateTime(p.created_at)}</div>
                          {p.rejection_reason && (
                            <div className="text-red-600 dark:text-red-400 mt-1">Reason: {p.rejection_reason}</div>
                          )}
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 tabular-nums">
                          <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">{formatINR(p.amount)}</div>
                          <span className={`font-bold uppercase text-[11px] ${
                            p.status === 'approved'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : p.status === 'rejected'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JOINED TOURNAMENTS */}
          {activeTab === 'tournaments' && (
            <div className="space-y-3">
              {myTournaments.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm text-slate-600 dark:text-slate-400">You haven't joined any matches yet.</div>
                  <button type="button" onClick={() => onNavigate('tournaments')} className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl">
                    Browse Matches
                  </button>
                </div>
              ) : (
                myTournaments.map(t => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">
                        <strong className="text-orange-600 dark:text-orange-400">Slot #{t.registration?.slot_number || 1}</strong> · {t.game_mode} ·{' '}
                        <span className={t.registration?.payment_status === 'approved' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                          {t.registration?.payment_status}
                        </span>
                      </div>
                      <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">{t.title}</h4>
                      <div className="text-xs text-slate-500">{formatISTDateTime(t.match_at)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('tournament-detail', { id: t.id })}
                      className="min-h-[38px] px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl whitespace-nowrap self-start sm:self-auto"
                    >
                      View Room →
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MATCH HISTORY */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Matches</div>
                  <div className="font-gaming font-bold text-xl text-slate-900 dark:text-white tabular-nums">{matchStats.total_matches || myMatches.length}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Wins</div>
                  <div className="font-gaming font-bold text-xl text-amber-600 dark:text-amber-400 tabular-nums">{matchStats.wins || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Kills</div>
                  <div className="font-gaming font-bold text-xl text-red-600 dark:text-red-400 tabular-nums">{matchStats.total_kills || 0}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Rewards</div>
                  <div className="font-gaming font-bold text-xl text-emerald-600 dark:text-emerald-400 tabular-nums">{formatINR(matchStats.total_prize_won || 0)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: `All (${myMatches.length})` },
                  { id: 'won', label: 'Wins' },
                  { id: 'top3', label: 'Top 3' },
                  { id: 'rewarded', label: 'Prizes' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMatchFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      matchFilter === f.id
                        ? 'bg-orange-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {(() => {
                const filtered = myMatches.filter(m => {
                  if (matchFilter === 'won') return m.rank === 1;
                  if (matchFilter === 'top3') return m.rank && m.rank <= 3;
                  if (matchFilter === 'rewarded') return Number(m.prize_amount || 0) > 0;
                  return true;
                });
                if (filtered.length === 0) {
                  return <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">No completed matches yet.</div>;
                }
                return (
                  <div className="space-y-3">
                    {filtered.map(m => (
                      <div key={m.tournament_id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getSafeImageUrl(m.banner_image, DEFAULT_MATCH_BANNER)}
                            alt={m.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MATCH_BANNER; }}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                          />
                          <div>
                            <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">{m.title}</h4>
                            <div className="text-xs text-slate-500">{m.game_mode} · {formatISTDateTime(m.match_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs tabular-nums">
                          <div>
                            <span className="text-slate-500">Rank </span>
                            <strong className="text-orange-600 dark:text-amber-400">#{m.rank || '-'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Kills </span>
                            <strong className="text-slate-900 dark:text-white">{m.kills || 0}</strong>
                          </div>
                          {Number(m.prize_amount || 0) > 0 && (
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatINR(m.prize_amount)}</div>
                          )}
                          <button type="button" onClick={() => onNavigate('tournament-detail', { id: m.tournament_id })} className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1">
                            <span>View</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TEAMS */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              {teamMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  teamMsg.isError ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {teamMsg.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{teamMsg.text}</span>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="font-gaming font-bold text-xs text-amber-700 dark:text-amber-400">Pending Invites ({pendingInvites.length})</div>
                  {pendingInvites.map(inv => (
                    <div key={inv.invite_id} className="p-3 bg-white dark:bg-slate-950 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-800 dark:text-slate-200">{inv.captain_name} invited you to <strong>{inv.team_name}</strong></span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleInviteResponse(inv.invite_id, true)} className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg">Accept</button>
                        <button type="button" onClick={() => handleInviteResponse(inv.invite_id, false)} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleCreateTeam} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">Create Duo Team</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input type="text" required placeholder="Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className={`${inputClass} sm:col-span-2`} />
                  <input type="text" placeholder="Tag (e.g. FLX)" value={newTeamTag} onChange={e => setNewTeamTag(e.target.value)} className={`${inputClass} uppercase`} />
                </div>
                <button type="submit" className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl">
                  Create Team
                </button>
              </form>

              {teams.map(team => (
                <div key={team.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                      {team.name} <span className="text-orange-600 dark:text-orange-400">[{team.tag}]</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{team.members?.length || 0}/2</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {team.members?.map((m: any) => (
                      <div key={m.membership_id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={getSafeImageUrl(m.avatar_url, DEFAULT_PLAYER_AVATAR)}
                            alt={m.username}
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <span className="font-bold text-slate-900 dark:text-white">{m.free_fire_ign || m.username}</span>
                        </div>
                        <span className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">{m.status}</span>
                      </div>
                    ))}
                  </div>
                  {team.captain_id === user.id && (team.members?.length || 0) < 2 && (
                    <div className="flex gap-2">
                      <input type="text" placeholder="Partner username..." value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} className={inputClass} />
                      <button type="button" onClick={() => handleInviteTeammate(team.id)} className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl whitespace-nowrap">
                        Invite
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllNotificationsRead} className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No notifications yet.</div>
              ) : (
                notifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { if (!item.is_read) markNotificationRead(item.id); }}
                    className={`p-4 rounded-2xl border cursor-pointer ${
                      item.is_read
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
                        : 'bg-white dark:bg-slate-900 border-orange-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                      <span className="text-[11px] text-slate-500">{formatISTDateTime(item.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUPPORT TICKETS */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">Support Tickets</h3>
                <button
                  type="button"
                  onClick={() => { setShowNewTicket(!showNewTicket); setSelectedTicket(null); }}
                  className="px-4 py-2 bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> New Ticket
                </button>
              </div>

              {showNewTicket && (
                <form onSubmit={handleCreateTicket} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={ticketCategory} onChange={e => setTicketCategory(e.target.value)} className={inputClass}>
                      <option value="Payment">Payment Issue</option>
                      <option value="Tournament">Match Slot Issue</option>
                      <option value="Room Issue">Room ID Issue</option>
                      <option value="Account">Account Help</option>
                    </select>
                    <input type="text" required placeholder="Subject" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} className={inputClass} />
                  </div>
                  <textarea required rows={3} placeholder="Describe your issue..." value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} className={inputClass} />
                  <button type="submit" className="px-5 py-2.5 bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl">
                    Submit Ticket
                  </button>
                </form>
              )}

              {selectedTicket ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-bold">{selectedTicket.ticket_code}</span>
                      <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">{selectedTicket.subject}</h4>
                    </div>
                    <button type="button" onClick={() => setSelectedTicket(null)} className="text-xs text-slate-500">Close</button>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                    {selectedTicket.message}
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {ticketReplies.map(reply => (
                      <div key={reply.id} className={`p-3 rounded-xl text-xs ${reply.is_admin ? 'bg-amber-500/10 ml-6' : 'bg-slate-50 dark:bg-slate-950 mr-6'}`}>
                        <div className="font-bold text-orange-600 dark:text-orange-400 text-[11px]">{reply.is_admin ? 'Admin' : reply.username}</div>
                        <div className="text-slate-700 dark:text-slate-300 mt-0.5">{reply.message}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendTicketReply} className="flex gap-2">
                    <input type="text" placeholder="Type reply..." value={replyText} onChange={e => setReplyText(e.target.value)} className={inputClass} />
                    <button type="submit" className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tickets.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500">No support tickets.</div>
                  ) : (
                    tickets.map(t => (
                      <div key={t.id} onClick={() => handleOpenTicketThread(t)} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 cursor-pointer flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">{t.ticket_code}</span> · <span className="text-slate-500">{t.category}</span>
                          <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{t.subject}</div>
                        </div>
                        <span className="font-bold uppercase text-[11px] text-amber-600 dark:text-amber-400">{t.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* PROFILE & PASSWORD SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">Profile &amp; Photo Settings</h4>
                {profileMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl">
                    {profileMsg}
                  </div>
                )}

                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <img
                    src={getSafeImageUrl(profileAvatar || user?.avatar_url, DEFAULT_PLAYER_AVATAR)}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500 shrink-0"
                  />
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoFileUpload} className="hidden" />
                    </label>
                    {profileAvatar && (
                      <button type="button" onClick={() => setProfileAvatar('')} className="ml-2 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Free Fire IGN *</label>
                    <input type="text" required value={profileIgn} onChange={e => setProfileIgn(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Free Fire UID *</label>
                    <input type="text" required value={profileUid} onChange={e => setProfileUid(e.target.value)} className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone / WhatsApp</label>
                    <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <button type="submit" className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl">
                  Save Profile
                </button>
              </form>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-gaming font-bold text-base text-slate-900 dark:text-white">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Google Sign-In Security</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Your account is protected by Firebase Google Authentication ({user.email}). Passwords are managed directly via your Google account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
