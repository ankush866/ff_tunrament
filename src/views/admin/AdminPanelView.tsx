import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Trophy,
  Clock,
  CreditCard,
  FileText,
  Home,
  Menu,
  HelpCircle,
  Bell,
  Image as ImageIcon,
  Settings,
  Users,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Eye,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Key,
  Upload,
  QrCode,
  Ban,
  UserCheck,
  Share2,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime } from '../../lib/api.js';

interface AdminPanelViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth?: (mode?: 'login' | 'register' | 'admin_login') => void;
}

type PrimaryTab = 'overview' | 'users' | 'payments' | 'matches' | 'more';
type MatchSubTab = 'tournaments' | 'rooms' | 'results';
type MoreSubTab = 'settings' | 'tickets' | 'cms' | 'menus_home' | 'faqs_alerts' | 'media_logs';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { user } = useAuth();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('overview');
  const [matchSubTab, setMatchSubTab] = useState<MatchSubTab>('tournaments');
  const [moreSubTab, setMoreSubTab] = useState<MoreSubTab>('settings');

  // Dashboard Stats
  const [stats, setStats] = useState<any>({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Tournaments Admin
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);

  // Room Management
  const [selectedTournamentForRoom, setSelectedTournamentForRoom] = useState<any>(null);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomPassInput, setRoomPassInput] = useState('');
  const [roomOpenTime, setRoomOpenTime] = useState('');
  const [roomMatchTime, setRoomMatchTime] = useState('');
  const [roomCloseTime, setRoomCloseTime] = useState('');
  const [roomStatus, setRoomStatus] = useState('scheduled');
  const [roomMessage, setRoomMessage] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Payments Verification
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentFilter, setPaymentFilter] = useState('pending');
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Results Entry
  const [selectedTournamentForResults, setSelectedTournamentForResults] = useState<any>(null);
  const [resultsEntries, setResultsEntries] = useState<any[]>([]);

  // CMS Pages
  const [pages, setPages] = useState<any[]>([]);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [showPageModal, setShowPageModal] = useState(false);
  const [pageVersions, setPageVersions] = useState<any[]>([]);
  const [showVersionsDrawer, setShowVersionsDrawer] = useState(false);

  // Homepage Builder
  const [sections, setSections] = useState<any[]>([]);

  // Navigation Items
  const [navItems, setNavItems] = useState<any[]>([]);
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavUrl, setNewNavUrl] = useState('');
  const [newNavFooter, setNewNavFooter] = useState(false);

  // FAQs
  const [faqs, setFaqs] = useState<any[]>([]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newFaqCat, setNewFaqCat] = useState('General');

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState('info');

  // Media Library
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [mediaUploadUrl, setMediaUploadUrl] = useState('');
  const [mediaName, setMediaName] = useState('');

  // Global Settings
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Users Admin
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'blocked' | 'staff'>('all');

  // Support Tickets
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [activeAdminTicket, setActiveAdminTicket] = useState<any>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Role permissions
  const role = user?.role || 'user';
  const isSuperAdmin = role === 'super_admin';
  const canTournaments = isSuperAdmin || role === 'tournament_manager';
  const canPayments = isSuperAdmin || role === 'payment_manager';
  const canContent = isSuperAdmin || role === 'content_manager';
  const canSupport = isSuperAdmin || role === 'support_manager';
  const canMore = isSuperAdmin || canContent || canSupport;

  // Ensure initial sub-tab inside Settings & More matches permission
  useEffect(() => {
    if (!isSuperAdmin) {
      if (canSupport) setMoreSubTab('tickets');
      else if (canContent) setMoreSubTab('cms');
    }
  }, [isSuperAdmin, canSupport, canContent]);

  const fetchStats = () => {
    setLoadingStats(true);
    apiRequest('/admin/stats')
      .then(res => setStats(res))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (primaryTab === 'overview') {
      fetchStats();
    } else if (primaryTab === 'users') {
      apiRequest<{ users: any[] }>('/admin/users')
        .then(res => setUsersList(res.users || []))
        .catch(() => {});
    } else if (primaryTab === 'payments') {
      apiRequest<{ payments: any[] }>(`/admin/payments?status=${paymentFilter}`)
        .then(res => setPayments(res.payments || []))
        .catch(() => {});
    } else if (primaryTab === 'matches') {
      apiRequest<{ tournaments: any[] }>('/tournaments')
        .then(res => {
          const list = res.tournaments || [];
          setTournaments(list);
          if (list.length > 0 && !selectedTournamentForRoom) {
            handleSelectTournamentForRoom(list[0]);
          }
          if (list.length > 0 && !selectedTournamentForResults) {
            handleSelectTournamentForResults(list[0]);
          }
        })
        .catch(() => {});
    } else if (primaryTab === 'more') {
      if (moreSubTab === 'settings') {
        apiRequest<{ settings: Record<string, string> }>('/settings/public')
          .then(res => setSettings(res.settings || {}))
          .catch(() => {});
      } else if (moreSubTab === 'tickets') {
        apiRequest<{ tickets: any[] }>('/admin/tickets')
          .then(res => setAdminTickets(res.tickets || []))
          .catch(() => {});
      } else if (moreSubTab === 'cms') {
        apiRequest<{ pages: any[] }>('/cms/pages')
          .then(res => setPages(res.pages || []))
          .catch(() => {});
      } else if (moreSubTab === 'menus_home') {
        apiRequest<{ items: any[] }>('/cms/navigation')
          .then(res => setNavItems(res.items || []))
          .catch(() => {});
        apiRequest<{ sections: any[] }>('/cms/homepage-sections')
          .then(res => setSections(res.sections || []))
          .catch(() => {});
      } else if (moreSubTab === 'faqs_alerts') {
        apiRequest<{ faqs: any[] }>('/admin/faqs')
          .then(res => setFaqs(res.faqs || []))
          .catch(() => {});
        apiRequest<{ announcements: any[] }>('/admin/announcements')
          .then(res => setAnnouncements(res.announcements || []))
          .catch(() => {});
      } else if (moreSubTab === 'media_logs') {
        if (canContent) {
          apiRequest<{ items: any[] }>('/media')
            .then(res => setMediaItems(res.items || []))
            .catch(() => {});
        }
        if (isSuperAdmin) {
          apiRequest<{ logs: any[] }>('/admin/activity-logs')
            .then(res => setActivityLogs(res.logs || []))
            .catch(() => {});
        }
      }
    }
  }, [primaryTab, matchSubTab, moreSubTab, paymentFilter]);

  const handleSelectTournamentForRoom = async (t: any) => {
    setSelectedTournamentForRoom(t);
    setRoomMessage(null);
    try {
      const room = await apiRequest(`/rooms/${t.id}`);
      setRoomIdInput(room.room_id_code || '');
      setRoomPassInput(room.room_password || '');
      setRoomOpenTime(room.opening_time ? new Date(room.opening_time).toISOString().slice(0, 16) : '');
      setRoomMatchTime(room.match_start_time ? new Date(room.match_start_time).toISOString().slice(0, 16) : '');
      setRoomCloseTime(room.closing_time ? new Date(room.closing_time).toISOString().slice(0, 16) : '');
      setRoomStatus(room.status || 'scheduled');
    } catch {
      const mTime = new Date(t.match_at);
      const oTime = new Date(mTime.getTime() - 15 * 60000);
      setRoomOpenTime(oTime.toISOString().slice(0, 16));
      setRoomMatchTime(mTime.toISOString().slice(0, 16));
      setRoomCloseTime(new Date(mTime.getTime() + 45 * 60000).toISOString().slice(0, 16));
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomMessage(null);
    try {
      await apiRequest('/admin/rooms', {
        method: 'POST',
        body: JSON.stringify({
          tournament_id: selectedTournamentForRoom.id,
          room_id_code: roomIdInput.trim(),
          room_password: roomPassInput.trim(),
          opening_time: new Date(roomOpenTime).toISOString(),
          match_start_time: new Date(roomMatchTime).toISOString(),
          closing_time: new Date(roomCloseTime).toISOString(),
          status: roomStatus,
          is_published: 1
        })
      });
      setRoomMessage('Room ID, Password and IST timing saved.');
      setTimeout(() => setRoomMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRescheduleMatch = async () => {
    if (!roomOpenTime || !roomMatchTime || !selectedTournamentForRoom) return;
    try {
      const res = await apiRequest(`/admin/rooms/${selectedTournamentForRoom.id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({
          newOpeningTime: new Date(roomOpenTime).toISOString(),
          newMatchStartTime: new Date(roomMatchTime).toISOString(),
          reason: rescheduleReason
        })
      });
      alert(`Match rescheduled! Alerts sent to ${res.notifiedCount} players.`);
      setRescheduleReason('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyPayment = async (paymentId: string | number, status: 'approved' | 'rejected', reason = '') => {
    try {
      await apiRequest(`/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status, rejection_reason: reason })
      });
      setRejectModalPayment(null);
      setRejectionReason('');
      apiRequest<{ payments: any[] }>(`/admin/payments?status=${paymentFilter}`)
        .then(res => setPayments(res.payments || []));
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelectTournamentForResults = async (t: any) => {
    setSelectedTournamentForResults(t);
    try {
      const res = await apiRequest<{ results: any[] }>(`/results/tournament/${t.id}`);
      if (res.results && res.results.length > 0) {
        setResultsEntries(res.results);
      } else {
        setResultsEntries([
          { rank: 1, player_name: '', kills: 10, placement_points: 12, prize_amount: Math.round(t.prize_pool * 0.5) },
          { rank: 2, player_name: '', kills: 6, placement_points: 9, prize_amount: Math.round(t.prize_pool * 0.3) },
          { rank: 3, player_name: '', kills: 4, placement_points: 8, prize_amount: Math.round(t.prize_pool * 0.2) }
        ]);
      }
    } catch {}
  };

  const handleSaveResults = async () => {
    if (!selectedTournamentForResults) return;
    try {
      await apiRequest(`/admin/results/${selectedTournamentForResults.id}`, {
        method: 'POST',
        body: JSON.stringify({ entries: resultsEntries })
      });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      alert('Results published and winners notified!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPage.id) {
        await apiRequest(`/cms/pages/${editingPage.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingPage)
        });
      } else {
        await apiRequest('/cms/pages', {
          method: 'POST',
          body: JSON.stringify(editingPage)
        });
      }
      setShowPageModal(false);
      setEditingPage(null);
      apiRequest<{ pages: any[] }>('/cms/pages').then(res => setPages(res.pages || []));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewVersions = async (pageId: string | number) => {
    try {
      const res = await apiRequest<{ versions: any[] }>(`/cms/pages/${pageId}/versions`);
      setPageVersions(res.versions || []);
      setShowVersionsDrawer(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreVersion = async (pageId: string | number, versionNum: number) => {
    if (!confirm(`Restore this page back to Version ${versionNum}?`)) return;
    try {
      await apiRequest(`/cms/pages/${pageId}/restore/${versionNum}`, { method: 'POST' });
      setShowVersionsDrawer(false);
      apiRequest<{ pages: any[] }>('/cms/pages').then(res => setPages(res.pages || []));
      alert(`Restored to Version ${versionNum}!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      try {
        localStorage.setItem('flaxy_site_settings', JSON.stringify(settings));
        window.dispatchEvent(new Event('flaxy_settings_updated'));
      } catch {}
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (userId: string | number, targetRole: string, isBlocked: boolean) => {
    const actionText = isBlocked ? 'BLOCK' : 'UNBLOCK';
    if (!window.confirm(`Confirm ${actionText} / role update for this user account?`)) {
      return;
    }
    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: targetRole, is_blocked: isBlocked })
      });
      const res = await apiRequest<{ users: any[] }>('/admin/users');
      setUsersList(res.users || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSettings(prev => ({ ...prev, payment_qr_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdminTicket = async (ticket: any) => {
    setActiveAdminTicket(ticket);
    try {
      const res = await apiRequest<{ replies: any[] }>(`/tickets/${ticket.id}/messages`);
      setTicketReplies(res.replies || []);
    } catch {
      setTicketReplies([]);
    }
  };

  const handleAdminTicketReply = async (ticketId: string | number) => {
    if (!ticketReplyText.trim()) return;
    try {
      await apiRequest(`/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: ticketReplyText })
      });
      setTicketReplyText('');
      const res = await apiRequest<{ replies: any[] }>(`/tickets/${ticketId}/messages`);
      setTicketReplies(res.replies || []);
      apiRequest<{ tickets: any[] }>('/admin/tickets').then(r => setAdminTickets(r.tickets || []));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string | number, status: string) => {
    try {
      await apiRequest(`/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, priority: activeAdminTicket?.priority || 'normal' })
      });
      if (activeAdminTicket?.id === ticketId) {
        setActiveAdminTicket({ ...activeAdminTicket, status });
      }
      apiRequest<{ tickets: any[] }>('/admin/tickets').then(r => setAdminTickets(r.tickets || []));
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isStaff =
    user &&
    ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(
      user.role
    );

  if (!isStaff) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-gaming font-extrabold text-2xl text-slate-900 dark:text-white">
            ADMIN PANEL
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
            {user ? (
              <span>
                Signed in as <strong className="text-orange-600 dark:text-orange-400">@{user.username}</strong>. Only staff and admins can open this panel.
              </span>
            ) : (
              <span>Log in with an Admin account to manage users, payments, and matches.</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          {onOpenAuth && (
            <button
              onClick={() => onOpenAuth('admin_login')}
              className="w-full sm:w-auto px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-gaming font-semibold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>{user ? 'Switch to Admin Account' : 'Admin Login'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-orange-500';
  const cardCls =
    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Compact Header */}
      <div className={`${cardCls} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-gaming font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                FLAXY ADMIN PANEL
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 uppercase">
                {user?.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage Users, Payments, Matches, Rooms, UPI QR & Social Links
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto min-h-[40px]"
        >
          View Site →
        </button>
      </div>

      {/* Primary Simple 5-Tab Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {[
          { id: 'overview' as PrimaryTab, label: 'Overview', icon: LayoutDashboard, show: true },
          { id: 'users' as PrimaryTab, label: 'User Management', icon: Users, show: isSuperAdmin },
          {
            id: 'payments' as PrimaryTab,
            label: 'Payment Management',
            icon: CreditCard,
            count: stats.pendingPayments,
            show: canPayments
          },
          { id: 'matches' as PrimaryTab, label: 'Match Management', icon: Trophy, show: canTournaments },
          {
            id: 'more' as PrimaryTab,
            label: 'Settings & More',
            icon: Settings,
            count: stats.openTickets,
            show: canMore
          }
        ]
          .filter(t => t.show)
          .map(tab => {
            const Icon = tab.icon;
            const isActive = primaryTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPrimaryTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-gaming font-bold rounded-xl transition-all flex items-center gap-1.5 min-h-[40px] ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                      isActive ? 'bg-white text-orange-600' : 'bg-red-500 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* ========================================================= */}
      {/* 1. OVERVIEW */}
      {/* ========================================================= */}
      {primaryTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Users', value: stats.totalUsers || 0, cls: 'text-slate-900 dark:text-white' },
              { label: 'Matches', value: stats.totalTournaments || 0, cls: 'text-orange-600 dark:text-orange-400' },
              { label: 'Pending UPI', value: stats.pendingPayments || 0, cls: 'text-amber-600 dark:text-amber-400' },
              { label: 'Approved ₹', value: formatINR(stats.totalRevenue || 0), cls: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Live Matches', value: stats.liveMatches || 0, cls: 'text-red-600 dark:text-red-400' },
              { label: 'Open Tickets', value: stats.openTickets || 0, cls: 'text-indigo-600 dark:text-indigo-400' }
            ].map(item => (
              <div key={item.label} className={`${cardCls} p-4 text-center space-y-1`}>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  {item.label}
                </div>
                <div className={`font-gaming font-extrabold text-xl tabular-nums ${item.cls}`}>
                  {loadingStats ? '...' : item.value}
                </div>
              </div>
            ))}
          </div>

          {/* 3 Main Core Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isSuperAdmin && (
              <button
                onClick={() => setPrimaryTab('users')}
                className={`${cardCls} p-5 text-left hover:border-orange-500/60 transition-all space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Open →</span>
                </div>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                  User Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Block/Unblock users, reset passwords, and set staff roles.
                </p>
              </button>
            )}

            {canPayments && (
              <button
                onClick={() => setPrimaryTab('payments')}
                className={`${cardCls} p-5 text-left hover:border-orange-500/60 transition-all space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {stats.pendingPayments || 0} Pending →
                  </span>
                </div>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                  Payment Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verify UTR, check screenshots, chat on WhatsApp, and Approve/Reject.
                </p>
              </button>
            )}

            {canTournaments && (
              <button
                onClick={() => {
                  setMatchSubTab('tournaments');
                  setPrimaryTab('matches');
                }}
                className={`${cardCls} p-5 text-left hover:border-orange-500/60 transition-all space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Open →</span>
                </div>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                  Match Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Create matches, update Room ID & Pass, and publish winners.
                </p>
              </button>
            )}
          </div>

          {/* Quick Links to Extra Tools */}
          {canMore && (
            <div className={`${cardCls} p-5 space-y-3`}>
              <h3 className="font-gaming font-bold text-sm text-slate-900 dark:text-white uppercase">
                Quick Tools
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setMoreSubTab('settings');
                      setPrimaryTab('more');
                    }}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-orange-500" />
                    <span>UPI QR, Support & Social Links</span>
                  </button>
                )}
                {canSupport && (
                  <button
                    onClick={() => {
                      setMoreSubTab('tickets');
                      setPrimaryTab('more');
                    }}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span>Support Tickets ({stats.openTickets || 0})</span>
                  </button>
                )}
                {canContent && (
                  <button
                    onClick={() => {
                      setMoreSubTab('cms');
                      setPrimaryTab('more');
                    }}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-cyan-500" />
                    <span>Policy Pages & CMS</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {stats.recentLogs && stats.recentLogs.length > 0 && (
            <div className={`${cardCls} p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-gaming font-bold text-sm text-slate-900 dark:text-white uppercase">
                  Recent Activity
                </h3>
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setMoreSubTab('media_logs');
                      setPrimaryTab('more');
                    }}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold"
                  >
                    View All Logs →
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {stats.recentLogs.slice(0, 6).map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="text-slate-700 dark:text-slate-300">
                      <strong className="text-orange-600 dark:text-orange-400">{log.admin_name}</strong>{' '}
                      <span className="font-mono text-slate-900 dark:text-white">[{log.action}]</span>: {log.details}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatISTDateTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. USER MANAGEMENT */}
      {/* ========================================================= */}
      {primaryTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                USER MANAGEMENT
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search players, Block/Unblock accounts, and change staff roles.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search name, email, IGN, UID..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 w-full sm:w-64"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { id: 'all' as const, label: `All (${usersList.length})`, activeCls: 'bg-orange-500 text-white' },
              {
                id: 'active' as const,
                label: `Active (${usersList.filter(u => !u.is_blocked).length})`,
                activeCls: 'bg-emerald-500 text-white'
              },
              {
                id: 'blocked' as const,
                label: `Blocked (${usersList.filter(u => u.is_blocked).length})`,
                activeCls: 'bg-red-600 text-white'
              },
              {
                id: 'staff' as const,
                label: `Staff (${usersList.filter(u => u.role !== 'user').length})`,
                activeCls: 'bg-amber-500 text-slate-950'
              }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setUserFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  userFilter === f.id
                    ? `${f.activeCls} shadow-sm`
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className={`${cardCls} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden text-xs`}>
            {usersList
              .filter(u => {
                const q = userSearch.toLowerCase();
                const matches =
                  u.username?.toLowerCase().includes(q) ||
                  u.email?.toLowerCase().includes(q) ||
                  u.free_fire_ign?.toLowerCase().includes(q) ||
                  u.free_fire_uid?.includes(userSearch);
                if (!matches) return false;
                if (userFilter === 'active') return !u.is_blocked;
                if (userFilter === 'blocked') return Boolean(u.is_blocked);
                if (userFilter === 'staff') return u.role !== 'user';
                return true;
              })
              .map(u => (
                <div
                  key={u.id}
                  className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    u.is_blocked ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{u.username}</span>
                      <span className="text-slate-500 dark:text-slate-400 break-all">({u.email})</span>
                      {u.is_blocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-bold uppercase text-[10px] border border-red-500/30">
                          Blocked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px] border border-emerald-500/30">
                          Active
                        </span>
                      )}
                      {u.role !== 'user' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase font-bold border border-amber-500/30">
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span>IGN: <strong className="text-slate-900 dark:text-slate-200">{u.free_fire_ign || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>UID: <strong className="text-slate-900 dark:text-slate-200 font-mono">{u.free_fire_uid || 'N/A'}</strong></span>
                      {u.phone && (
                        <>
                          <span>•</span>
                          <span>Phone: <strong className="text-slate-900 dark:text-slate-200">{u.phone}</strong></span>
                        </>
                      )}
                      <span>•</span>
                      <span>Joined: {formatISTDateTime(u.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={u.role}
                      onChange={e => handleUpdateUser(u.id, e.target.value, Boolean(u.is_blocked))}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-orange-600 dark:text-orange-400 font-bold focus:outline-none min-h-[36px]"
                    >
                      <option value="user">Player</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="tournament_manager">Tournament Mgr</option>
                      <option value="payment_manager">Payment Mgr</option>
                      <option value="content_manager">Content Mgr</option>
                      <option value="support_manager">Support Mgr</option>
                    </select>

                    {u.is_blocked ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, u.role, false)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 shadow-sm min-h-[36px]"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, u.role, true)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 shadow-sm min-h-[36px]"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PAYMENT MANAGEMENT */}
      {/* ========================================================= */}
      {primaryTab === 'payments' && canPayments && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                PAYMENT MANAGEMENT
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify player UTR references and UPI screenshots before approving slots.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['pending', 'approved', 'rejected', 'all'].map(status => (
                <button
                  key={status}
                  onClick={() => setPaymentFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold capitalize transition-all ${
                    paymentFilter === status
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {payments.length === 0 ? (
            <div className={`${cardCls} py-14 text-center text-slate-500 text-sm`}>
              No {paymentFilter} payments found.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div
                  key={p.id}
                  className={`${cardCls} p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{p.username}</span>
                      <span className="text-slate-500 font-mono">UID: {p.free_fire_uid || 'N/A'}</span>
                      <span className="text-slate-500">({p.free_fire_ign})</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : p.status === 'rejected'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300">
                      Match: <strong>{p.tournament_title}</strong>
                    </div>

                    <div className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                      UTR: {p.transaction_ref}
                    </div>

                    {p.whatsapp_number && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-slate-500">
                          WhatsApp: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{p.whatsapp_number}</strong>
                        </span>
                        <a
                          href={`https://wa.me/${p.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hello%20${p.username},%20regarding%20your%20Flaxy%20tournament%20payment%20UTR%20${p.transaction_ref}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          <span>WhatsApp</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500">
                      Submitted: {formatISTDateTime(p.created_at)}
                      {p.verified_by_admin_name && ` • Verified by ${p.verified_by_admin_name}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="font-gaming font-extrabold text-lg text-emerald-600 dark:text-emerald-400 tabular-nums mr-1">
                      {formatINR(p.amount)}
                    </div>

                    {p.screenshot_url && (
                      <button
                        onClick={() => setViewingScreenshot(p.screenshot_url)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold inline-flex items-center gap-1.5 min-h-[36px]"
                      >
                        <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {p.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleVerifyPayment(p.id, 'approved')}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl min-h-[36px]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModalPayment(p)}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl min-h-[36px]"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewingScreenshot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-gaming font-bold text-sm text-slate-900 dark:text-white">
                    Payment Receipt Screenshot
                  </span>
                  <button
                    onClick={() => setViewingScreenshot(null)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1"
                  >
                    ✕
                  </button>
                </div>
                <img src={viewingScreenshot} alt="Receipt" className="max-h-[70vh] mx-auto rounded-xl object-contain" />
              </div>
            </div>
          )}

          {rejectModalPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                  REJECT PAYMENT
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter reason for declining this UPI payment.
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. UTR not found or wrong amount"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className={inputCls}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRejectModalPayment(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleVerifyPayment(rejectModalPayment.id, 'rejected', rejectionReason)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MATCH MANAGEMENT (Matches / Rooms / Results) */}
      {/* ========================================================= */}
      {primaryTab === 'matches' && canTournaments && (
        <div className="space-y-5">
          {/* Sub-tab bar */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            {[
              { id: 'tournaments' as MatchSubTab, label: 'Matches', icon: Trophy },
              { id: 'rooms' as MatchSubTab, label: 'Room ID & Time', icon: Clock },
              { id: 'results' as MatchSubTab, label: 'Results & Winners', icon: CheckCircle2 }
            ].map(sub => {
              const Icon = sub.icon;
              const active = matchSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setMatchSubTab(sub.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-gaming font-bold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* 4A: MATCHES LIST */}
          {matchSubTab === 'tournaments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                    MATCH MANAGEMENT
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create, edit, and configure rooms for tournaments.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingTournament({
                      title: '',
                      game_mode: 'Solo',
                      map_name: 'Bermuda',
                      entry_fee: 50,
                      prize_pool: 3000,
                      total_slots: 48,
                      available_slots: 48,
                      match_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                      status: 'Registration Open',
                      rules_text: 'Standard Free Fire Mobile Only rules. No emulators.'
                    });
                    setShowTournamentModal(true);
                  }}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Match</span>
                </button>
              </div>

              <div className="space-y-3">
                {tournaments.map(t => (
                  <div
                    key={t.id}
                    className={`${cardCls} p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm font-gaming">{t.title}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-bold uppercase">
                          {t.game_mode}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {t.map_name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                          {t.status}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                        <span>Slots: <strong>{t.total_slots - t.available_slots}/{t.total_slots}</strong></span>
                        <span>•</span>
                        <span>Entry: <strong>{formatINR(t.entry_fee)}</strong></span>
                        <span>•</span>
                        <span>Prize: <strong>{formatINR(t.prize_pool)}</strong></span>
                        <span>•</span>
                        <span>{formatISTDateTime(t.match_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingTournament({
                            ...t,
                            match_at: t.match_at ? new Date(t.match_at).toISOString().slice(0, 16) : ''
                          });
                          setShowTournamentModal(true);
                        }}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold inline-flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          handleSelectTournamentForRoom(t);
                          setMatchSubTab('rooms');
                        }}
                        className="px-3 py-2 bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white rounded-xl font-bold transition-colors"
                      >
                        Room ID
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showTournamentModal && editingTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                  <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                        {editingTournament.id ? 'EDIT MATCH' : 'CREATE NEW MATCH'}
                      </h3>
                      <button
                        onClick={() => setShowTournamentModal(false)}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>

                    <form
                      onSubmit={async e => {
                        e.preventDefault();
                        try {
                          if (editingTournament.id) {
                            await apiRequest(`/admin/tournaments/${editingTournament.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({
                                ...editingTournament,
                                match_at: new Date(editingTournament.match_at).toISOString()
                              })
                            });
                          } else {
                            await apiRequest('/admin/tournaments', {
                              method: 'POST',
                              body: JSON.stringify({
                                ...editingTournament,
                                match_at: new Date(editingTournament.match_at).toISOString()
                              })
                            });
                          }
                          setShowTournamentModal(false);
                          apiRequest<{ tournaments: any[] }>('/tournaments').then(res =>
                            setTournaments(res.tournaments || [])
                          );
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="space-y-4 text-xs"
                    >
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Match Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingTournament.title}
                          onChange={e => setEditingTournament({ ...editingTournament, title: e.target.value })}
                          className={inputCls}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Mode
                          </label>
                          <select
                            value={editingTournament.game_mode}
                            onChange={e => setEditingTournament({ ...editingTournament, game_mode: e.target.value })}
                            className={inputCls}
                          >
                            <option value="Solo">Solo</option>
                            <option value="Duo">Duo</option>
                            <option value="Squad">Squad</option>
                            <option value="Clash Squad">Clash Squad</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Map
                          </label>
                          <select
                            value={editingTournament.map_name}
                            onChange={e => setEditingTournament({ ...editingTournament, map_name: e.target.value })}
                            className={inputCls}
                          >
                            <option value="Bermuda">Bermuda</option>
                            <option value="Purgatory">Purgatory</option>
                            <option value="Kalahari">Kalahari</option>
                            <option value="Alpine">Alpine</option>
                            <option value="Nextra">Nextra</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Entry (₹)
                          </label>
                          <input
                            type="number"
                            value={editingTournament.entry_fee}
                            onChange={e =>
                              setEditingTournament({
                                ...editingTournament,
                                entry_fee: parseInt(e.target.value, 10) || 0
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Prize (₹)
                          </label>
                          <input
                            type="number"
                            value={editingTournament.prize_pool}
                            onChange={e =>
                              setEditingTournament({
                                ...editingTournament,
                                prize_pool: parseInt(e.target.value, 10) || 0
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Slots
                          </label>
                          <input
                            type="number"
                            value={editingTournament.total_slots}
                            onChange={e =>
                              setEditingTournament({
                                ...editingTournament,
                                total_slots: parseInt(e.target.value, 10) || 48
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Match Time (IST)
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={editingTournament.match_at}
                            onChange={e => setEditingTournament({ ...editingTournament, match_at: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Status
                          </label>
                          <select
                            value={editingTournament.status}
                            onChange={e => setEditingTournament({ ...editingTournament, status: e.target.value })}
                            className={inputCls}
                          >
                            <option value="Registration Open">Registration Open</option>
                            <option value="Registration Closed">Registration Closed</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Live">Live</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Banner Image URL
                        </label>
                        <input
                          type="url"
                          value={editingTournament.banner_image || ''}
                          onChange={e => setEditingTournament({ ...editingTournament, banner_image: e.target.value })}
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Rules
                        </label>
                        <textarea
                          rows={3}
                          value={editingTournament.rules_text || ''}
                          onChange={e => setEditingTournament({ ...editingTournament, rules_text: e.target.value })}
                          className={inputCls}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow"
                      >
                        SAVE MATCH
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4B: ROOM ID & SCHEDULE */}
          {matchSubTab === 'rooms' && (
            <div className="space-y-4">
              {roomMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{roomMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Match:</span>
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTournamentForRoom(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold transition-all ${
                      selectedTournamentForRoom?.id === t.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              {selectedTournamentForRoom && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <form onSubmit={handleSaveRoom} className={`${cardCls} lg:col-span-7 p-5 space-y-4 text-xs`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                        ROOM CREDENTIALS & IST TIME
                      </h3>
                      <span className="font-mono text-orange-600 dark:text-orange-400">IST</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 8492041"
                          value={roomIdInput}
                          onChange={e => setRoomIdInput(e.target.value)}
                          className={`${inputCls} font-mono text-sm`}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room Password
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. FLAXY99"
                          value={roomPassInput}
                          onChange={e => setRoomPassInput(e.target.value)}
                          className={`${inputCls} font-mono text-sm`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room Opens
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={roomOpenTime}
                          onChange={e => setRoomOpenTime(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Match Starts
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={roomMatchTime}
                          onChange={e => setRoomMatchTime(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Room Closes
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={roomCloseTime}
                          onChange={e => setRoomCloseTime(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={roomStatus}
                        onChange={e => setRoomStatus(e.target.value)}
                        className={inputCls}
                      >
                        <option value="scheduled">Scheduled (Locked)</option>
                        <option value="open">Open (Visible to Approved Players)</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow"
                    >
                      SAVE ROOM CREDENTIALS
                    </button>
                  </form>

                  <div className={`${cardCls} lg:col-span-5 p-5 space-y-4 text-xs`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 font-gaming font-bold text-base text-amber-600 dark:text-amber-400">
                      <RotateCcw className="w-4 h-4" />
                      <span>RESCHEDULE & NOTIFY</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Update timings above, add an optional note, and send an alert to registered players.
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Reason (optional)"
                      value={rescheduleReason}
                      onChange={e => setRescheduleReason(e.target.value)}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={handleRescheduleMatch}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-gaming font-bold text-xs rounded-xl"
                    >
                      SEND RESCHEDULE ALERT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4C: RESULTS ENTRY */}
          {matchSubTab === 'results' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Match:</span>
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTournamentForResults(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold transition-all ${
                      selectedTournamentForResults?.id === t.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              {selectedTournamentForResults && (
                <div className={`${cardCls} p-5 space-y-4`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                      WINNERS ({selectedTournamentForResults.title})
                    </h3>
                    <button
                      onClick={() =>
                        setResultsEntries([
                          ...resultsEntries,
                          {
                            rank: resultsEntries.length + 1,
                            player_name: '',
                            kills: 0,
                            placement_points: 0,
                            prize_amount: 0
                          }
                        ])
                      }
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {resultsEntries.map((resItem, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs"
                      >
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Rank</span>
                          <input
                            type="number"
                            value={resItem.rank}
                            onChange={e => {
                              const updated = [...resultsEntries];
                              updated[idx].rank = parseInt(e.target.value, 10) || 1;
                              setResultsEntries(updated);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Player IGN</span>
                          <input
                            type="text"
                            placeholder="IGN"
                            value={resItem.player_name}
                            onChange={e => {
                              const updated = [...resultsEntries];
                              updated[idx].player_name = e.target.value;
                              setResultsEntries(updated);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Kills</span>
                          <input
                            type="number"
                            value={resItem.kills}
                            onChange={e => {
                              const updated = [...resultsEntries];
                              updated[idx].kills = parseInt(e.target.value, 10) || 0;
                              setResultsEntries(updated);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Place Pts</span>
                          <input
                            type="number"
                            value={resItem.placement_points}
                            onChange={e => {
                              const updated = [...resultsEntries];
                              updated[idx].placement_points = parseInt(e.target.value, 10) || 0;
                              setResultsEntries(updated);
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Prize (₹)</span>
                          <input
                            type="number"
                            value={resItem.prize_amount}
                            onChange={e => {
                              const updated = [...resultsEntries];
                              updated[idx].prize_amount = parseInt(e.target.value, 10) || 0;
                              setResultsEntries(updated);
                            }}
                            className={`${inputCls} text-emerald-600 dark:text-emerald-400 font-bold`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveResults}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-extrabold text-xs rounded-xl shadow"
                  >
                    PUBLISH RESULTS & DECLARE WINNERS
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SETTINGS & MORE (All existing features preserved) */}
      {/* ========================================================= */}
      {primaryTab === 'more' && canMore && (
        <div className="space-y-5">
          {/* Sub-tab bar */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            {[
              { id: 'settings' as MoreSubTab, label: 'Site, UPI QR & Social', icon: Settings, show: isSuperAdmin },
              {
                id: 'tickets' as MoreSubTab,
                label: `Support Desk (${stats.openTickets || 0})`,
                icon: MessageSquare,
                show: canSupport
              },
              { id: 'cms' as MoreSubTab, label: 'CMS Pages', icon: FileText, show: canContent },
              { id: 'menus_home' as MoreSubTab, label: 'Menus & Home', icon: Menu, show: canContent },
              { id: 'faqs_alerts' as MoreSubTab, label: 'FAQs & Alerts', icon: Bell, show: canContent },
              { id: 'media_logs' as MoreSubTab, label: 'Media & Logs', icon: ImageIcon, show: canContent || isSuperAdmin }
            ]
              .filter(s => s.show)
              .map(sub => {
                const Icon = sub.icon;
                const active = moreSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setMoreSubTab(sub.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-gaming font-bold flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
          </div>

          {/* 5A: SETTINGS, UPI QR & SOCIAL LINKS */}
          {moreSubTab === 'settings' && isSuperAdmin && (
            <form onSubmit={handleSaveSettings} className={`${cardCls} p-5 sm:p-6 space-y-5 text-xs`}>
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                  SITE SETTINGS, UPI QR & SOCIAL LINKS
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure site name, UPI ID, QR scanner image, support WhatsApp/email, and channel links.
                </p>
              </div>

              {settingsSaved && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-semibold">
                  Settings saved permanently!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Website Name
                  </label>
                  <input
                    type="text"
                    value={settings.site_name || ''}
                    onChange={e => setSettings(prev => ({ ...prev, site_name: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official UPI ID
                  </label>
                  <input
                    type="text"
                    value={settings.upi_id || ''}
                    onChange={e => setSettings(prev => ({ ...prev, upi_id: e.target.value }))}
                    placeholder="flaxy.esports@icici"
                    className={`${inputCls} font-mono text-orange-600 dark:text-orange-400`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Support WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp_number || ''}
                    onChange={e => setSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className={`${inputCls} font-mono text-emerald-600 dark:text-emerald-400`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Chat URL
                  </label>
                  <input
                    type="url"
                    value={settings.whatsapp_url || ''}
                    onChange={e => setSettings(prev => ({ ...prev, whatsapp_url: e.target.value }))}
                    placeholder="https://wa.me/919876543210"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.support_email || ''}
                    onChange={e => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
                    placeholder="support@flaxy.gg"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Support Phone
                  </label>
                  <input
                    type="text"
                    value={settings.contact_phone || ''}
                    onChange={e => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className={inputCls}
                  />
                </div>

                {/* Payment QR */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-orange-500" />
                      Payment UPI Scanner (QR)
                    </label>
                    {settings.payment_qr_url && (
                      <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold">
                        QR Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex-1 w-full space-y-2.5">
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer text-slate-800 dark:text-slate-200 font-semibold">
                        <Upload className="w-4 h-4 text-orange-500" />
                        <span>Upload QR Photo</span>
                        <input type="file" accept="image/*" onChange={handleQrFileUpload} className="hidden" />
                      </label>
                      <input
                        type="url"
                        value={settings.payment_qr_url || ''}
                        onChange={e => setSettings(prev => ({ ...prev, payment_qr_url: e.target.value }))}
                        placeholder="Or paste QR image URL..."
                        className={inputCls}
                      />
                    </div>
                    <div className="w-28 h-28 rounded-xl bg-white p-2 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {settings.payment_qr_url ? (
                        <img
                          src={settings.payment_qr_url}
                          alt="Payment QR Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 text-center">No QR</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-gaming font-bold text-sm text-slate-900 dark:text-white">
                    <Share2 className="w-4 h-4 text-orange-500" />
                    <span>SOCIAL LINKS (YOUTUBE, INSTAGRAM, DISCORD, TELEGRAM)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-red-600 dark:text-red-400 mb-1">
                        YouTube Channel Link / @handle
                      </label>
                      <input
                        type="text"
                        value={settings.social_youtube || ''}
                        onChange={e => setSettings(prev => ({ ...prev, social_youtube: e.target.value }))}
                        placeholder="https://youtube.com/@flaxyesports"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-pink-600 dark:text-pink-400 mb-1">
                        Instagram Link / Username
                      </label>
                      <input
                        type="text"
                        value={settings.social_instagram || ''}
                        onChange={e => setSettings(prev => ({ ...prev, social_instagram: e.target.value }))}
                        placeholder="https://instagram.com/flaxy_esports"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                        Discord Server / Invite Link
                      </label>
                      <input
                        type="text"
                        value={settings.social_discord || ''}
                        onChange={e => setSettings(prev => ({ ...prev, social_discord: e.target.value }))}
                        placeholder="https://discord.gg/flaxy"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-sky-600 dark:text-sky-400 mb-1">
                        Telegram Channel Link
                      </label>
                      <input
                        type="text"
                        value={settings.social_telegram || ''}
                        onChange={e => setSettings(prev => ({ ...prev, social_telegram: e.target.value }))}
                        placeholder="https://t.me/flaxyesports"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow"
              >
                SAVE SETTINGS & SOCIAL LINKS
              </button>
            </form>
          )}

          {/* 5B: SUPPORT DESK */}
          {moreSubTab === 'tickets' && canSupport && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start text-xs">
              <div className={`${cardCls} lg:col-span-5 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
                <div className="p-3.5 font-gaming font-bold text-sm text-slate-900 dark:text-white">
                  PLAYER TICKETS ({adminTickets.length})
                </div>
                {adminTickets.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">No support tickets found.</div>
                ) : (
                  adminTickets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleOpenAdminTicket(t)}
                      className={`w-full p-3.5 text-left transition-colors ${
                        activeAdminTicket?.id === t.id
                          ? 'bg-orange-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{t.subject}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            t.status === 'closed'
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              : t.status === 'answered'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        @{t.username || `User #${t.user_id}`} • {t.ticket_code}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className={`${cardCls} lg:col-span-7 p-5 space-y-4`}>
                {activeAdminTicket ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                          {activeAdminTicket.subject}
                        </h4>
                        <div className="text-[11px] text-slate-500">
                          From @{activeAdminTicket.username || activeAdminTicket.user_id} • {activeAdminTicket.category}
                        </div>
                      </div>
                      <select
                        value={activeAdminTicket.status}
                        onChange={e => handleUpdateTicketStatus(activeAdminTicket.id, e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="open">Open</option>
                        <option value="answered">Answered</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      {activeAdminTicket.message}
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {ticketReplies.map(r => (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl text-xs ${
                            r.sender_role !== 'user'
                              ? 'bg-orange-500/10 border border-orange-500/20'
                              : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                            {r.sender_name || r.sender_role}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">{r.message}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write reply to player..."
                        value={ticketReplyText}
                        onChange={e => setTicketReplyText(e.target.value)}
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => handleAdminTicketReply(activeAdminTicket.id)}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    Select a ticket on the left to view & reply.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5C: CMS PAGES */}
          {moreSubTab === 'cms' && canContent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                    CMS POLICY & CUSTOM PAGES
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Edit policy pages or add custom pages.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPage({
                      title: '',
                      slug: '',
                      content: '<h2>Heading</h2><p>Page content here...</p>',
                      meta_title: '',
                      meta_description: '',
                      is_published: 1
                    });
                    setShowPageModal(true);
                  }}
                  className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Page</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {pages.map(page => (
                  <div
                    key={page.id}
                    className={`${cardCls} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-gaming font-bold text-sm text-slate-900 dark:text-white">
                          {page.title}
                        </span>
                        <span className="font-mono text-[11px] text-orange-600 dark:text-orange-400">
                          /page/{page.slug}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            page.is_published
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {page.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        v{page.version || 1} • {formatISTDateTime(page.updated_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onNavigate('page', { slug: page.slug })}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                        title="View Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewVersions(page.id)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg"
                        title="History"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const full = await apiRequest(`/cms/pages/${page.slug}`);
                          setEditingPage(full.page);
                          setShowPageModal(true);
                        }}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showPageModal && editingPage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                  <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">
                        {editingPage.id ? `EDIT: ${editingPage.title}` : 'NEW PAGE'}
                      </h3>
                      <button onClick={() => setShowPageModal(false)} className="text-slate-500 px-2 py-1">
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSavePage} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            required
                            value={editingPage.title}
                            onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            URL Slug
                          </label>
                          <input
                            type="text"
                            required
                            disabled={editingPage.is_system}
                            value={editingPage.slug}
                            onChange={e => setEditingPage({ ...editingPage, slug: e.target.value })}
                            className={`${inputCls} font-mono disabled:opacity-50`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          HTML Content
                        </label>
                        <textarea
                          rows={10}
                          required
                          value={editingPage.content}
                          onChange={e => setEditingPage({ ...editingPage, content: e.target.value })}
                          className={`${inputCls} font-mono`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            SEO Meta Title
                          </label>
                          <input
                            type="text"
                            value={editingPage.meta_title || ''}
                            onChange={e => setEditingPage({ ...editingPage, meta_title: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Status
                          </label>
                          <select
                            value={editingPage.is_published ? 1 : 0}
                            onChange={e =>
                              setEditingPage({ ...editingPage, is_published: parseInt(e.target.value, 10) })
                            }
                            className={inputCls}
                          >
                            <option value={1}>Published</option>
                            <option value={0}>Draft</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl"
                      >
                        SAVE & PUBLISH
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {showVersionsDrawer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                  <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                        VERSION HISTORY
                      </h4>
                      <button onClick={() => setShowVersionsDrawer(false)} className="text-slate-500 px-2 py-1">
                        ✕
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {pageVersions.map(v => (
                        <div
                          key={v.id}
                          className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              v{v.version_num} • {v.title}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {v.edited_by_admin_name} • {formatISTDateTime(v.created_at)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(v.page_id, v.version_num)}
                            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5D: MENUS & HOMEPAGE */}
          {moreSubTab === 'menus_home' && canContent && (
            <div className="space-y-6 text-xs">
              <div className={`${cardCls} p-5 space-y-3`}>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                  NAVIGATION LINKS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    placeholder="Label"
                    value={newNavLabel}
                    onChange={e => setNewNavLabel(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="URL (/page/rules)"
                    value={newNavUrl}
                    onChange={e => setNewNavUrl(e.target.value)}
                    className={inputCls}
                  />
                  <select
                    value={newNavFooter ? 1 : 0}
                    onChange={e => setNewNavFooter(e.target.value === '1')}
                    className={inputCls}
                  >
                    <option value={0}>Header</option>
                    <option value={1}>Footer</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newNavLabel || !newNavUrl) return;
                      await apiRequest('/cms/navigation', {
                        method: 'POST',
                        body: JSON.stringify({
                          label: newNavLabel,
                          url: newNavUrl,
                          is_footer: newNavFooter ? 1 : 0
                        })
                      });
                      setNewNavLabel('');
                      setNewNavUrl('');
                      apiRequest<{ items: any[] }>('/cms/navigation').then(res => setNavItems(res.items || []));
                    }}
                    className="py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold rounded-xl"
                  >
                    Add Link
                  </button>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {navItems.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                        <span className="font-mono text-slate-500 ml-2">({item.url})</span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400">
                          {item.is_footer ? 'Footer' : 'Header'}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await apiRequest(`/cms/navigation/${item.id}`, { method: 'DELETE' });
                          apiRequest<{ items: any[] }>('/cms/navigation').then(res => setNavItems(res.items || []));
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardCls} p-5 space-y-3`}>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                  HOMEPAGE SECTIONS
                </h3>
                <div className="space-y-2">
                  {sections.map(sec => (
                    <div
                      key={sec.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{sec.title}</div>
                        <div className="text-[11px] text-slate-500">{sec.subtitle}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await apiRequest(`/cms/homepage-sections/${sec.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ ...sec, is_enabled: sec.is_enabled ? 0 : 1 })
                          });
                          apiRequest<{ sections: any[] }>('/cms/homepage-sections').then(res =>
                            setSections(res.sections || [])
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold ${
                          sec.is_enabled
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sec.is_enabled ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5E: FAQs & ANNOUNCEMENTS */}
          {moreSubTab === 'faqs_alerts' && canContent && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              {/* FAQs */}
              <div className={`${cardCls} p-5 space-y-3`}>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-orange-500" />
                  <span>FAQ MANAGER</span>
                </h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Category (General, Payments...)"
                    value={newFaqCat}
                    onChange={e => setNewFaqCat(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Question"
                    value={newFaqQ}
                    onChange={e => setNewFaqQ(e.target.value)}
                    className={inputCls}
                  />
                  <textarea
                    rows={2}
                    placeholder="Answer"
                    value={newFaqA}
                    onChange={e => setNewFaqA(e.target.value)}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newFaqQ || !newFaqA) return;
                      await apiRequest('/admin/faqs', {
                        method: 'POST',
                        body: JSON.stringify({ category: newFaqCat, question: newFaqQ, answer: newFaqA })
                      });
                      setNewFaqQ('');
                      setNewFaqA('');
                      apiRequest<{ faqs: any[] }>('/admin/faqs').then(r => setFaqs(r.faqs || []));
                    }}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                  >
                    Add FAQ
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
                  {faqs.map(f => (
                    <div
                      key={f.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{f.question}</div>
                        <div className="text-slate-500 mt-0.5">{f.answer}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await apiRequest(`/admin/faqs/${f.id}`, { method: 'DELETE' });
                          apiRequest<{ faqs: any[] }>('/admin/faqs').then(r => setFaqs(r.faqs || []));
                        }}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Announcements */}
              <div className={`${cardCls} p-5 space-y-3`}>
                <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-orange-500" />
                  <span>ANNOUNCEMENT BANNERS</span>
                </h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Title"
                    value={newAnnTitle}
                    onChange={e => setNewAnnTitle(e.target.value)}
                    className={inputCls}
                  />
                  <textarea
                    rows={2}
                    placeholder="Banner message"
                    value={newAnnContent}
                    onChange={e => setNewAnnContent(e.target.value)}
                    className={inputCls}
                  />
                  <select
                    value={newAnnType}
                    onChange={e => setNewAnnType(e.target.value)}
                    className={inputCls}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newAnnTitle || !newAnnContent) return;
                      await apiRequest('/admin/announcements', {
                        method: 'POST',
                        body: JSON.stringify({
                          title: newAnnTitle,
                          content: newAnnContent,
                          banner_type: newAnnType,
                          is_banner_visible: 1
                        })
                      });
                      setNewAnnTitle('');
                      setNewAnnContent('');
                      apiRequest<{ announcements: any[] }>('/admin/announcements').then(r =>
                        setAnnouncements(r.announcements || [])
                      );
                    }}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                  >
                    Publish Banner
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
                  {announcements.map(a => (
                    <div
                      key={a.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{a.title}</div>
                        <div className="text-slate-500 mt-0.5">{a.content}</div>
                      </div>
                      <button
                        onClick={async () => {
                          await apiRequest(`/admin/announcements/${a.id}`, { method: 'DELETE' });
                          apiRequest<{ announcements: any[] }>('/admin/announcements').then(r =>
                            setAnnouncements(r.announcements || [])
                          );
                        }}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5F: MEDIA & LOGS */}
          {moreSubTab === 'media_logs' && (
            <div className="space-y-6 text-xs">
              {canContent && (
                <div className={`${cardCls} p-5 space-y-3`}>
                  <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                    MEDIA LIBRARY
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Asset Name"
                      value={mediaName}
                      onChange={e => setMediaName(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={mediaUploadUrl}
                      onChange={e => setMediaUploadUrl(e.target.value)}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!mediaUploadUrl) return;
                        await apiRequest('/media/upload', {
                          method: 'POST',
                          body: JSON.stringify({
                            original_name: mediaName || 'banner.png',
                            url: mediaUploadUrl
                          })
                        });
                        setMediaName('');
                        setMediaUploadUrl('');
                        apiRequest<{ items: any[] }>('/media').then(r => setMediaItems(r.items || []));
                      }}
                      className="py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                    >
                      Save Asset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {mediaItems.map(item => (
                      <div
                        key={item.id}
                        className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <img src={item.url} alt={item.original_name} className="w-full h-24 object-cover rounded-lg" />
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[10px] text-slate-600 dark:text-slate-400">
                            {item.original_name}
                          </span>
                          <button
                            onClick={async () => {
                              await apiRequest(`/media/${item.id}`, { method: 'DELETE' });
                              apiRequest<{ items: any[] }>('/media').then(r => setMediaItems(r.items || []));
                            }}
                            className="text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isSuperAdmin && (
                <div className={`${cardCls} p-5 space-y-3`}>
                  <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">
                    AUDIT LOGS
                  </h3>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    {activityLogs.map(log => (
                      <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                            [{log.action}]
                          </span>{' '}
                          <strong className="text-slate-900 dark:text-white">{log.admin_name}</strong>:{' '}
                          <span className="text-slate-600 dark:text-slate-300">{log.details}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatISTDateTime(log.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
