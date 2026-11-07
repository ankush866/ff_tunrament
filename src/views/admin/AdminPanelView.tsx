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
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  RotateCcw,
  Search,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Lock,
  Unlock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Key,
  Upload,
  QrCode,
  Ban,
  UserX,
  UserCheck,
  ShieldAlert,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime, formatISTTime } from '../../lib/api.js';

interface AdminPanelViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth?: (mode?: 'login' | 'register' | 'admin_login') => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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
  const [resetModalUser, setResetModalUser] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Support Tickets
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [activeAdminTicket, setActiveAdminTicket] = useState<any>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Role permissions check helper
  const role = user?.role || 'user';
  const isSuperAdmin = role === 'super_admin';
  const canTournaments = isSuperAdmin || role === 'tournament_manager';
  const canPayments = isSuperAdmin || role === 'payment_manager';
  const canContent = isSuperAdmin || role === 'content_manager';
  const canSupport = isSuperAdmin || role === 'support_manager';

  // Load stats
  const fetchStats = () => {
    setLoadingStats(true);
    apiRequest('/admin/stats')
      .then(res => setStats(res))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  };

  // Load data based on tab
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'tournaments' || activeTab === 'rooms' || activeTab === 'results') {
      apiRequest<{ tournaments: any[] }>('/tournaments')
        .then(res => {
          setTournaments(res.tournaments || []);
          if (res.tournaments?.length > 0 && !selectedTournamentForRoom) {
            handleSelectTournamentForRoom(res.tournaments[0]);
          }
          if (res.tournaments?.length > 0 && !selectedTournamentForResults) {
            handleSelectTournamentForResults(res.tournaments[0]);
          }
        })
        .catch(() => {});
    } else if (activeTab === 'payments') {
      apiRequest<{ payments: any[] }>(`/admin/payments?status=${paymentFilter}`)
        .then(res => setPayments(res.payments || []))
        .catch(() => {});
    } else if (activeTab === 'cms') {
      apiRequest<{ pages: any[] }>('/cms/pages')
        .then(res => setPages(res.pages || []))
        .catch(() => {});
    } else if (activeTab === 'homepage') {
      apiRequest<{ sections: any[] }>('/cms/homepage-sections')
        .then(res => setSections(res.sections || []))
        .catch(() => {});
    } else if (activeTab === 'navigation') {
      apiRequest<{ items: any[] }>('/cms/navigation')
        .then(res => setNavItems(res.items || []))
        .catch(() => {});
    } else if (activeTab === 'faqs') {
      apiRequest<{ faqs: any[] }>('/admin/faqs')
        .then(res => setFaqs(res.faqs || []))
        .catch(() => {});
    } else if (activeTab === 'announcements') {
      apiRequest<{ announcements: any[] }>('/admin/announcements')
        .then(res => setAnnouncements(res.announcements || []))
        .catch(() => {});
    } else if (activeTab === 'media') {
      apiRequest<{ items: any[] }>('/media')
        .then(res => setMediaItems(res.items || []))
        .catch(() => {});
    } else if (activeTab === 'settings') {
      apiRequest<{ settings: Record<string, string> }>('/settings/public')
        .then(res => setSettings(res.settings || {}))
        .catch(() => {});
    } else if (activeTab === 'users') {
      apiRequest<{ users: any[] }>('/admin/users')
        .then(res => setUsersList(res.users || []))
        .catch(() => {});
    } else if (activeTab === 'tickets') {
      apiRequest<{ tickets: any[] }>('/admin/tickets')
        .then(res => setAdminTickets(res.tickets || []))
        .catch(() => {});
    } else if (activeTab === 'logs') {
      apiRequest<{ logs: any[] }>('/admin/activity-logs')
        .then(res => setActivityLogs(res.logs || []))
        .catch(() => {});
    }
  }, [activeTab, paymentFilter]);

  // Handle Room Selection
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
      // Default to match time - 15m
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
      setRoomMessage('Room credentials and live schedule saved successfully!');
      setTimeout(() => setRoomMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRescheduleMatch = async () => {
    if (!roomOpenTime || !roomMatchTime) return;
    try {
      const res = await apiRequest(`/admin/rooms/${selectedTournamentForRoom.id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({
          newOpeningTime: new Date(roomOpenTime).toISOString(),
          newMatchStartTime: new Date(roomMatchTime).toISOString(),
          reason: rescheduleReason
        })
      });
      alert(`Match rescheduled! In-app notifications sent to ${res.notifiedCount} registered players.`);
      setRescheduleReason('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Payment Verification
  const handleVerifyPayment = async (paymentId: number, status: 'approved' | 'rejected', reason = '') => {
    try {
      await apiRequest(`/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status, rejection_reason: reason })
      });
      setRejectModalPayment(null);
      setRejectionReason('');
      // refresh payments
      apiRequest<{ payments: any[] }>(`/admin/payments?status=${paymentFilter}`)
        .then(res => setPayments(res.payments || []));
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Select Tournament for Results Entry
  const handleSelectTournamentForResults = async (t: any) => {
    setSelectedTournamentForResults(t);
    try {
      const res = await apiRequest<{ results: any[] }>(`/results/tournament/${t.id}`);
      if (res.results && res.results.length > 0) {
        setResultsEntries(res.results);
      } else {
        // Default template for top 3
        setResultsEntries([
          { rank: 1, player_name: '', kills: 10, placement_points: 12, prize_amount: Math.round(t.prize_pool * 0.5) },
          { rank: 2, player_name: '', kills: 6, placement_points: 9, prize_amount: Math.round(t.prize_pool * 0.3) },
          { rank: 3, player_name: '', kills: 4, placement_points: 8, prize_amount: Math.round(t.prize_pool * 0.2) }
        ]);
      }
    } catch {}
  };

  const handleSaveResults = async () => {
    try {
      await apiRequest(`/admin/results/${selectedTournamentForResults.id}`, {
        method: 'POST',
        body: JSON.stringify({ entries: resultsEntries })
      });
      // Fire celebratory confetti for declaring winners!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      alert('Results saved and tournament marked as Completed! Winner notifications dispatched.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CMS Save Page
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

  const handleViewVersions = async (pageId: number) => {
    try {
      const res = await apiRequest<{ versions: any[] }>(`/cms/pages/${pageId}/versions`);
      setPageVersions(res.versions || []);
      setShowVersionsDrawer(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreVersion = async (pageId: number, versionNum: number) => {
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

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      // Save locally so changes persist instantly on client
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

  // User Role & Block Toggle
  const handleUpdateUser = async (userId: number, role: string, isBlocked: boolean) => {
    const actionText = isBlocked ? 'BLOCK' : 'UNBLOCK';
    if (!window.confirm(`Are you sure you want to ${actionText} this user account?`)) {
      return;
    }
    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role, is_blocked: isBlocked })
      });
      const res = await apiRequest<{ users: any[] }>('/admin/users');
      setUsersList(res.users || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Direct Admin Password Reset (Securely encrypted with bcrypt)
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordInput.trim()) return;
    setResetPasswordLoading(true);
    try {
      await apiRequest(`/admin/users/${resetModalUser.id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ new_password: newPasswordInput.trim() })
      });
      setResetPasswordSuccess(`Success! Password for ${resetModalUser.username} has been updated & securely encrypted with bcrypt.`);
      setTimeout(() => {
        setResetModalUser(null);
        setNewPasswordInput('');
        setResetPasswordSuccess('');
      }, 2500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Flx@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
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

  // Support Reply
  const handleAdminTicketReply = async (ticketId: number) => {
    if (!ticketReplyText.trim()) return;
    try {
      await apiRequest(`/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: ticketReplyText })
      });
      setTicketReplyText('');
      const res = await apiRequest<{ replies: any[] }>(`/tickets/${ticketId}/messages`);
      setTicketReplies(res.replies || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isStaff = user && ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(user.role);

  if (!isStaff) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xl">
          <Shield className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-gaming font-extrabold text-3xl text-white tracking-wide">
            ADMIN STAFF AREA
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {user ? (
              <span>You are currently signed in as player <strong className="text-orange-400">@{user.username}</strong>. This section is restricted to tournament administrators.</span>
            ) : (
              <span>This panel is for Flaxy Tournament Operators and Staff. If you are looking for tournaments, live rooms, or matches, visit the main public website.</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Go to Main Website (Public Home)</span>
          </button>
          {!user && onOpenAuth && (
            <button
              onClick={() => onOpenAuth('admin_login')}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-gaming font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>Admin Staff Login</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      {/* Admin Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-gaming font-extrabold text-2xl text-white">
                FLAXY COMMAND CENTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                {user?.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Complete tournament management, live room controls, UPI payment verification, and CMS editor.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
        >
          View Public Site →
        </button>
      </div>

      {/* Admin Module Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900/80 rounded-2xl border border-slate-800">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
          { id: 'tournaments', label: 'Tournaments', icon: Trophy, show: canTournaments },
          { id: 'rooms', label: 'Room Management & Schedule', icon: Clock, show: canTournaments },
          { id: 'payments', label: 'Payment Verification', icon: CreditCard, count: stats.pendingPayments, show: canPayments },
          { id: 'results', label: 'Results & Standings', icon: Trophy, show: canTournaments },
          { id: 'cms', label: 'Website CMS (Pages)', icon: FileText, show: canContent },
          { id: 'homepage', label: 'Homepage Builder', icon: Home, show: canContent },
          { id: 'navigation', label: 'Menus & Navigation', icon: Menu, show: canContent },
          { id: 'faqs', label: 'FAQ Manager', icon: HelpCircle, show: canContent },
          { id: 'announcements', label: 'Announcements', icon: Bell, show: canContent },
          { id: 'media', label: 'Media Library', icon: ImageIcon, show: canContent },
          { id: 'settings', label: 'Settings & Appearance', icon: Settings, show: isSuperAdmin },
          { id: 'users', label: 'User Management', icon: Users, show: isSuperAdmin },
          { id: 'tickets', label: 'Support Desk', icon: MessageSquare, count: stats.openTickets, show: canSupport },
          { id: 'logs', label: 'Security & Audit Logs', icon: Shield, show: isSuperAdmin }
        ].filter(t => t.show).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-gaming font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                  isActive ? 'bg-slate-950 text-white' : 'bg-red-500 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 1. DASHBOARD OVERVIEW */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Users</div>
              <div className="font-gaming font-extrabold text-2xl text-white">{stats.totalUsers || 0}</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Tournaments</div>
              <div className="font-gaming font-extrabold text-2xl text-orange-400">{stats.totalTournaments || 0}</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Pending Payments</div>
              <div className="font-gaming font-extrabold text-2xl text-amber-400">{stats.pendingPayments || 0}</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Approved Revenue</div>
              <div className="font-gaming font-extrabold text-2xl text-emerald-400">{formatINR(stats.totalRevenue || 0)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Live Matches</div>
              <div className="font-gaming font-extrabold text-2xl text-red-500">{stats.liveMatches || 0}</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Open Tickets</div>
              <div className="font-gaming font-extrabold text-2xl text-purple-400">{stats.openTickets || 0}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-gaming font-bold text-lg text-white">QUICK ACTIONS</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('tournaments')}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Tournament</span>
              </button>
              <button
                onClick={() => setActiveTab('rooms')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Configure Room Credentials</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Verify Pending UPI Receipts ({stats.pendingPayments || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('cms')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Edit Policy Pages (CMS)</span>
              </button>
            </div>
          </div>

          {/* Recent Audit Feed */}
          {stats.recentLogs && stats.recentLogs.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-gaming font-bold text-lg text-white">RECENT ADMIN ACTIVITY</h3>
                <button onClick={() => setActiveTab('logs')} className="text-xs text-orange-400 hover:underline">
                  View Full Audit Log →
                </button>
              </div>
              <div className="space-y-2">
                {stats.recentLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-950 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <strong className="text-orange-400">{log.admin_name}</strong> performed{' '}
                      <span className="font-mono text-white">[{log.action}]</span>: {log.details}
                    </div>
                    <span className="text-[10px] text-slate-500">{formatISTDateTime(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TOURNAMENTS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'tournaments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-gaming font-bold text-xl text-white">TOURNAMENTS MANAGER</h3>
              <p className="text-xs text-slate-400">Create, edit, publish, and inspect tournament slots.</p>
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
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tournament</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tournaments.map(t => (
              <div key={t.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base font-gaming">{t.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-orange-400 font-bold uppercase">{t.game_mode}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-bold">{t.map_name}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">{t.status}</span>
                  </div>
                  <div className="text-slate-400 mt-1 flex items-center gap-4">
                    <span>Slots: <strong>{t.total_slots - t.available_slots}/{t.total_slots} Filled</strong></span>
                    <span>•</span>
                    <span>Entry: <strong>{formatINR(t.entry_fee)}</strong></span>
                    <span>•</span>
                    <span>Prize: <strong>{formatINR(t.prize_pool)}</strong></span>
                    <span>•</span>
                    <span>Match: <strong>{formatISTDateTime(t.match_at)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTournament({
                        ...t,
                        match_at: t.match_at ? new Date(t.match_at).toISOString().slice(0, 16) : ''
                      });
                      setShowTournamentModal(true);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                    title="Edit Tournament"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTournamentForRoom(t);
                      setActiveTab('rooms');
                    }}
                    className="px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg font-bold"
                  >
                    Configure Room
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tournament Edit / Create Modal */}
          {showTournamentModal && editingTournament && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-gaming font-bold text-xl text-white">
                    {editingTournament.id ? 'EDIT TOURNAMENT' : 'CREATE NEW TOURNAMENT'}
                  </h3>
                  <button onClick={() => setShowTournamentModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form
                  onSubmit={async (e) => {
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
                      apiRequest<{ tournaments: any[] }>('/tournaments').then(res => setTournaments(res.tournaments || []));
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Tournament Title *</label>
                    <input
                      type="text"
                      required
                      value={editingTournament.title}
                      onChange={e => setEditingTournament({ ...editingTournament, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Game Mode</label>
                      <select
                        value={editingTournament.game_mode}
                        onChange={e => setEditingTournament({ ...editingTournament, game_mode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value="Solo">Solo</option>
                        <option value="Duo">Duo</option>
                        <option value="Squad">Squad</option>
                        <option value="Clash Squad">Clash Squad</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Map Name</label>
                      <select
                        value={editingTournament.map_name}
                        onChange={e => setEditingTournament({ ...editingTournament, map_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
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
                      <label className="block font-semibold text-slate-300 mb-1">Entry Fee (₹)</label>
                      <input
                        type="number"
                        value={editingTournament.entry_fee}
                        onChange={e => setEditingTournament({ ...editingTournament, entry_fee: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Prize Pool (₹)</label>
                      <input
                        type="number"
                        value={editingTournament.prize_pool}
                        onChange={e => setEditingTournament({ ...editingTournament, prize_pool: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Total Slots</label>
                      <input
                        type="number"
                        value={editingTournament.total_slots}
                        onChange={e => setEditingTournament({ ...editingTournament, total_slots: parseInt(e.target.value, 10) || 48 })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Match Start Time (IST)</label>
                      <input
                        type="datetime-local"
                        required
                        value={editingTournament.match_at}
                        onChange={e => setEditingTournament({ ...editingTournament, match_at: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Status</label>
                      <select
                        value={editingTournament.status}
                        onChange={e => setEditingTournament({ ...editingTournament, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
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
                    <label className="block font-semibold text-slate-300 mb-1">Banner Image URL</label>
                    <input
                      type="url"
                      value={editingTournament.banner_image || ''}
                      onChange={e => setEditingTournament({ ...editingTournament, banner_image: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Tournament Rules</label>
                    <textarea
                      rows={3}
                      value={editingTournament.rules_text || ''}
                      onChange={e => setEditingTournament({ ...editingTournament, rules_text: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all"
                  >
                    SAVE TOURNAMENT
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ADVANCED ROOM MANAGEMENT & LIVE TIMINGS (REQUIREMENT 6) */}
      {/* ========================================================= */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">
              ROOM MANAGEMENT & LIVE TIME SCHEDULING (ASIA/KOLKATA IST)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Set Free Fire Room ID, Password, Room Opening/Closing timestamps in IST, and reschedule matches.
            </p>
          </div>

          {roomMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{roomMessage}</span>
            </div>
          )}

          {/* Tournament Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Select Tournament:</span>
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTournamentForRoom(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold transition-all ${
                  selectedTournamentForRoom?.id === t.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          {selectedTournamentForRoom && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Credentials & Timings Form */}
              <form onSubmit={handleSaveRoom} className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="font-gaming font-bold text-base text-white">
                    ROOM CREDENTIALS & SCHEDULE
                  </h4>
                  <span className="font-mono text-orange-400 text-xs">IST Zone</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Free Fire Room ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. 8492041"
                      value={roomIdInput}
                      onChange={e => setRoomIdInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Room Password *</label>
                    <input
                      type="text"
                      placeholder="e.g. FLAXY99"
                      value={roomPassInput}
                      onChange={e => setRoomPassInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Room Opening (IST)</label>
                    <input
                      type="datetime-local"
                      required
                      value={roomOpenTime}
                      onChange={e => setRoomOpenTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Credentials unlock</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Match Start (IST)</label>
                    <input
                      type="datetime-local"
                      required
                      value={roomMatchTime}
                      onChange={e => setRoomMatchTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Match begins</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Room Closing (IST)</label>
                    <input
                      type="datetime-local"
                      required
                      value={roomCloseTime}
                      onChange={e => setRoomCloseTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Lobby ends</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Room Status</label>
                  <select
                    value={roomStatus}
                    onChange={e => setRoomStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  >
                    <option value="scheduled">Scheduled (Locked before opening)</option>
                    <option value="open">Open (Credentials visible to confirmed players)</option>
                    <option value="live">Live (Match in progress)</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all tracking-wider"
                >
                  SAVE ROOM CREDENTIALS & SCHEDULE
                </button>
              </form>

              {/* Reschedule Match Panel */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800 font-gaming font-bold text-base text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                  <span>RESCHEDULE MATCH & NOTIFY PLAYERS</span>
                </div>
                <p className="text-slate-400 text-xs">
                  Change the opening and match time above, provide an explanation, and click reschedule to automatically update all player dashboards and fire in-app alerts.
                </p>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Reason for Rescheduling (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Free Fire game maintenance by Garena. Match moved by 30 mins."
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRescheduleMatch}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-gaming font-bold text-xs rounded-xl shadow transition-all"
                >
                  DISPATCH RESCHEDULE ALERT
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MANUAL UPI PAYMENT VERIFICATION (REQUIREMENT 5) */}
      {/* ========================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-gaming font-bold text-xl text-white">
                UPI PAYMENT VERIFICATION DESK
              </h3>
              <p className="text-xs text-slate-400">
                Inspect 12-digit UTR numbers and screenshots. Never approve automatically.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5">
              {['pending', 'approved', 'rejected', 'all'].map(status => (
                <button
                  key={status}
                  onClick={() => setPaymentFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold capitalize transition-all ${
                    paymentFilter === status
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No {paymentFilter} payments found.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{p.username}</span>
                      <span className="text-slate-400 font-mono">UID: {p.free_fire_uid || 'N/A'}</span>
                      <span className="text-slate-400">({p.free_fire_ign})</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="text-slate-300">
                      Tournament: <strong>{p.tournament_title}</strong>
                    </div>

                    <div className="font-mono text-orange-400 font-bold">
                      UTR Ref: {p.transaction_ref}
                    </div>

                    {p.whatsapp_number && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400">WhatsApp: <strong className="text-emerald-400 font-mono">{p.whatsapp_number}</strong></span>
                        <a
                          href={`https://wa.me/${p.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hello%20${p.username},%20regarding%20your%20Flaxy%20tournament%20payment%20UTR%20${p.transaction_ref}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 font-bold text-[10px] flex items-center gap-1"
                        >
                          <span>Chat on WhatsApp</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500">
                      Submitted: {formatISTDateTime(p.created_at)}
                      {p.verified_by_admin_name && ` • Verified by ${p.verified_by_admin_name}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-gaming font-extrabold text-xl text-emerald-400">
                        {formatINR(p.amount)}
                      </div>
                    </div>

                    {p.screenshot_url && (
                      <button
                        onClick={() => setViewingScreenshot(p.screenshot_url)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                        title="View Screenshot"
                      >
                        <Eye className="w-4 h-4 text-cyan-400" />
                      </button>
                    )}

                    {p.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleVerifyPayment(p.id, 'approved')}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModalPayment(p)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Screenshot Preview Modal */}
          {viewingScreenshot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 text-center space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="font-gaming font-bold text-sm text-white">Private Payment Receipt</span>
                  <button onClick={() => setViewingScreenshot(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <img src={viewingScreenshot} alt="Receipt" className="max-h-[70vh] mx-auto rounded-xl object-contain" />
              </div>
            </div>
          )}

          {/* Reject Reason Modal */}
          {rejectModalPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="font-gaming font-bold text-lg text-white">REJECT PAYMENT</h4>
                <p className="text-xs text-slate-400">
                  Provide a clear reason so the player knows why their UPI verification was declined.
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. UTR reference not found in bank statement, or payment amount mismatch."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setRejectModalPayment(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
                  <button
                    onClick={() => handleVerifyPayment(rejectModalPayment.id, 'rejected', rejectionReason)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. RESULTS & LEADERBOARD ENTRY */}
      {/* ========================================================= */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">MATCH RESULTS ENTRY</h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter final match standings, kills, and declare tournament champions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Select Tournament:</span>
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTournamentForResults(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-gaming font-bold transition-all ${
                  selectedTournamentForResults?.id === t.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          {selectedTournamentForResults && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-gaming font-bold text-lg text-white">
                  PODIUM & STANDINGS ({selectedTournamentForResults.title})
                </h4>
                <button
                  onClick={() => setResultsEntries([...resultsEntries, { rank: resultsEntries.length + 1, player_name: '', kills: 0, placement_points: 0, prize_amount: 0 }])}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              <div className="space-y-3">
                {resultsEntries.map((resItem, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs items-center">
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
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-gaming font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Player / Team Name</span>
                      <input
                        type="text"
                        placeholder="Player IGN"
                        value={resItem.player_name}
                        onChange={e => {
                          const updated = [...resultsEntries];
                          updated[idx].player_name = e.target.value;
                          setResultsEntries(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold"
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
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Placement Pts</span>
                      <input
                        type="number"
                        value={resItem.placement_points}
                        onChange={e => {
                          const updated = [...resultsEntries];
                          updated[idx].placement_points = parseInt(e.target.value, 10) || 0;
                          setResultsEntries(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
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
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-gaming font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveResults}
                className="w-full py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 text-slate-950 font-gaming font-extrabold text-sm rounded-xl shadow-xl transition-all"
              >
                PUBLISH OFFICIAL RESULTS & DECLARE CHAMPIONS
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. DYNAMIC WEBSITE CMS (PAGES) (REQUIREMENT 8, 9 & 18) */}
      {/* ========================================================= */}
      {activeTab === 'cms' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-gaming font-bold text-xl text-white">
                WEBSITE CONTENT MANAGEMENT SYSTEM (CMS)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage all 17 default policy pages or create unlimited custom pages without editing source code.
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
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Custom Page</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pages.map(page => (
              <div
                key={page.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-gaming font-bold text-base text-white">{page.title}</span>
                    <span className="font-mono text-[10px] text-orange-400">/page/{page.slug}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                      page.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                    {page.is_system && (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Default Policy
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Version: {page.version || 1} • Last Edited: {formatISTDateTime(page.updated_at)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('page', { slug: page.slug })}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    title="View Public Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewVersions(page.id)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg"
                    title="Version History & Restore"
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
                    Edit Page
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Page Modal */}
          {showPageModal && editingPage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-gaming font-bold text-xl text-white">
                    {editingPage.id ? `EDIT PAGE: ${editingPage.title}` : 'CREATE NEW CMS PAGE'}
                  </h3>
                  <button onClick={() => setShowPageModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSavePage} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Page Title *</label>
                      <input
                        type="text"
                        required
                        value={editingPage.title}
                        onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">URL Slug *</label>
                      <input
                        type="text"
                        required
                        disabled={editingPage.is_system}
                        value={editingPage.slug}
                        onChange={e => setEditingPage({ ...editingPage, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">HTML Content & Rich Text *</label>
                    <textarea
                      rows={12}
                      required
                      value={editingPage.content}
                      onChange={e => setEditingPage({ ...editingPage, content: e.target.value })}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">SEO Meta Title</label>
                      <input
                        type="text"
                        value={editingPage.meta_title || ''}
                        onChange={e => setEditingPage({ ...editingPage, meta_title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Publish Status</label>
                      <select
                        value={editingPage.is_published ? 1 : 0}
                        onChange={e => setEditingPage({ ...editingPage, is_published: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value={1}>Published</option>
                        <option value={0}>Draft (Unpublished)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all"
                  >
                    SAVE & PUBLISH PAGE REVISION
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Versions History Drawer (Requirement 18) */}
          {showVersionsDrawer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="font-gaming font-bold text-lg text-white">PAGE REVISION HISTORY</h4>
                  <button onClick={() => setShowVersionsDrawer(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-3">
                  {pageVersions.map(v => (
                    <div key={v.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">Version #{v.version_num} • {v.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Edited by: {v.edited_by_admin_name} on {formatISTDateTime(v.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(v.page_id, v.version_num)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg"
                      >
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. HOMEPAGE BUILDER (REQUIREMENT 10) */}
      {/* ========================================================= */}
      {activeTab === 'homepage' && (
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">HOMEPAGE BUILDER</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reorder sections, toggle visibility, and update hero texts or promotional blocks.
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-gaming font-bold text-white text-base">{sec.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 font-mono text-[10px] text-orange-400 uppercase">
                      [{sec.section_key}]
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      sec.is_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {sec.is_enabled ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">{sec.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await apiRequest(`/cms/homepage-sections/${sec.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                          ...sec,
                          is_enabled: sec.is_enabled ? 0 : 1
                        })
                      });
                      apiRequest<{ sections: any[] }>('/cms/homepage-sections').then(res => setSections(res.sections || []));
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                      sec.is_enabled ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {sec.is_enabled ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. NAVIGATION & MENUS (REQUIREMENT 11) */}
      {/* ========================================================= */}
      {activeTab === 'navigation' && (
        <div className="space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">NAVIGATION MENU MANAGER</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add or remove links from header navigation and footer policy links.
            </p>
          </div>

          {/* Add Nav Item */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h4 className="font-gaming font-bold text-white">ADD NAVIGATION ITEM</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Label (e.g. Discord)"
                value={newNavLabel}
                onChange={e => setNewNavLabel(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="URL (e.g. /tournaments or /page/rules)"
                value={newNavUrl}
                onChange={e => setNewNavUrl(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
              <select
                value={newNavFooter ? 1 : 0}
                onChange={e => setNewNavFooter(e.target.value === '1')}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              >
                <option value={0}>Header Navigation</option>
                <option value={1}>Footer Links</option>
              </select>
              <button
                type="button"
                onClick={async () => {
                  if (!newNavLabel || !newNavUrl) return;
                  await apiRequest('/cms/navigation', {
                    method: 'POST',
                    body: JSON.stringify({ label: newNavLabel, url: newNavUrl, is_footer: newNavFooter ? 1 : 0 })
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
          </div>

          {/* Nav Items List */}
          <div className="divide-y divide-slate-800 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden text-xs">
            {navItems.map(item => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{item.label}</span>
                  <span className="font-mono text-slate-500 ml-2">({item.url})</span>
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-slate-950 text-orange-400">
                    {item.is_footer ? 'Footer' : 'Header'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await apiRequest(`/cms/navigation/${item.id}`, { method: 'DELETE' });
                    apiRequest<{ items: any[] }>('/cms/navigation').then(res => setNavItems(res.items || []));
                  }}
                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. GLOBAL SETTINGS & APPEARANCE (REQUIREMENTS 12 & 17) */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 text-xs">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">
              WEBSITE SETTINGS & THEME APPEARANCE
            </h3>
            <p className="text-slate-400 mt-0.5">
              Configure website branding, official UPI ID, payment QR URL, and social media handles.
            </p>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
              Website settings and appearance updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Website Name</label>
              <input
                type="text"
                value={settings.site_name || ''}
                onChange={e => setSettings(prev => ({ ...prev, site_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Official UPI ID for Verification</label>
              <input
                type="text"
                value={settings.upi_id || ''}
                onChange={e => setSettings(prev => ({ ...prev, upi_id: e.target.value }))}
                placeholder="e.g. flaxy.esports@icici"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-orange-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Support WhatsApp Number</label>
              <input
                type="text"
                value={settings.whatsapp_number || ''}
                onChange={e => setSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">WhatsApp Group / Direct Chat Link</label>
              <input
                type="url"
                value={settings.whatsapp_url || ''}
                onChange={e => setSettings(prev => ({ ...prev, whatsapp_url: e.target.value }))}
                placeholder="e.g. https://wa.me/919876543210"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.support_email || ''}
                onChange={e => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
                placeholder="e.g. support@flaxy.gg"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Support Contact Phone</label>
              <input
                type="text"
                value={settings.contact_phone || ''}
                onChange={e => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              />
            </div>

            {/* Payment Scanner QR Upload & URL */}
            <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-white text-sm flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-orange-400" />
                    Payment UPI Scanner (QR Code)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload your UPI Scanner image (PhonePe / Google Pay / Paytm QR) or enter an image URL.
                  </p>
                </div>
                {settings.payment_qr_url && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                    Active Scanner Configured
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Option A: Upload QR Image from Device</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-xl cursor-pointer text-slate-200 font-semibold transition-all">
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span>Choose QR Scanner Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Option B: Or Enter Direct Image URL</label>
                    <input
                      type="url"
                      value={settings.payment_qr_url || ''}
                      onChange={e => setSettings(prev => ({ ...prev, payment_qr_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* QR Scanner Preview */}
                <div className="w-32 h-32 rounded-xl bg-white p-2 border border-slate-700 flex flex-col items-center justify-center shrink-0 shadow-lg">
                  {settings.payment_qr_url ? (
                    <img
                      src={settings.payment_qr_url}
                      alt="Payment QR Scanner Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-500 text-[10px]">
                      <QrCode className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                      No QR Set
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Official Social Media Handles & Links (YouTube, Instagram, Discord, Telegram) */}
            <div className="sm:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-2.5">
                <h4 className="font-gaming font-bold text-sm text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-orange-400" />
                  OFFICIAL SOCIAL MEDIA LINKS & IDS (FOOTER REDIRECTS)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enter your channel links or usernames. When players click the YouTube, Instagram, Discord, or Telegram buttons anywhere on the site, they will redirect straight to your channels!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* YouTube */}
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-red-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      YouTube Channel Link / Handle
                    </label>
                    {settings.social_youtube && (
                      <a
                        href={settings.social_youtube.startsWith('http') ? settings.social_youtube : `https://youtube.com/${settings.social_youtube.startsWith('@') ? settings.social_youtube : '@' + settings.social_youtube}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-red-400 hover:text-white flex items-center gap-0.5 font-bold"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.social_youtube || ''}
                    onChange={e => setSettings(prev => ({ ...prev, social_youtube: e.target.value }))}
                    placeholder="e.g. https://youtube.com/@flaxyesports or @flaxyesports"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Full YouTube channel URL or @handle
                  </span>
                </div>

                {/* Instagram */}
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-pink-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                      Instagram Profile / Username
                    </label>
                    {settings.social_instagram && (
                      <a
                        href={settings.social_instagram.startsWith('http') ? settings.social_instagram : `https://instagram.com/${settings.social_instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-pink-400 hover:text-white flex items-center gap-0.5 font-bold"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.social_instagram || ''}
                    onChange={e => setSettings(prev => ({ ...prev, social_instagram: e.target.value }))}
                    placeholder="e.g. https://instagram.com/flaxy_esports or flaxy_esports"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-pink-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Full Instagram URL or profile username
                  </span>
                </div>

                {/* Discord */}
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-indigo-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      Discord Server / Invite Link
                    </label>
                    {settings.social_discord && (
                      <a
                        href={settings.social_discord.startsWith('http') ? settings.social_discord : `https://discord.gg/${settings.social_discord}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-0.5 font-bold"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.social_discord || ''}
                    onChange={e => setSettings(prev => ({ ...prev, social_discord: e.target.value }))}
                    placeholder="e.g. https://discord.gg/flaxy or flaxy"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Discord invite link (e.g. discord.gg/flaxy)
                  </span>
                </div>

                {/* Telegram */}
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                      Telegram Channel / Group Link
                    </label>
                    {settings.social_telegram && (
                      <a
                        href={settings.social_telegram.startsWith('http') ? settings.social_telegram : `https://t.me/${settings.social_telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-cyan-400 hover:text-white flex items-center gap-0.5 font-bold"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.social_telegram || ''}
                    onChange={e => setSettings(prev => ({ ...prev, social_telegram: e.target.value }))}
                    placeholder="e.g. https://t.me/flaxyesports or flaxyesports"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Telegram public channel link or username
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all uppercase tracking-wider"
          >
            SAVE GLOBAL SETTINGS & SOCIAL LINKS
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* 10. USER MANAGEMENT (REQUIREMENT 7 & 23) */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-gaming font-bold text-xl text-white">USER & STAFF MANAGEMENT</h3>
              <p className="text-xs text-slate-400">Manage user accounts, assign staff permissions, and block/unblock players.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by username, email, IGN..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none w-full sm:w-64"
              />
            </div>
          </div>

          {/* Quick Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setUserFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                userFilter === 'all'
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Players ({usersList.length})
            </button>
            <button
              onClick={() => setUserFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                userFilter === 'active'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Active ({usersList.filter(u => !u.is_blocked).length})
            </button>
            <button
              onClick={() => setUserFilter('blocked')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                userFilter === 'blocked'
                  ? 'bg-red-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Ban className="w-3 h-3 text-red-400" />
              <span>Blocked ({usersList.filter(u => u.is_blocked).length})</span>
            </button>
            <button
              onClick={() => setUserFilter('staff')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                userFilter === 'staff'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Staff Roles ({usersList.filter(u => u.role !== 'user').length})</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden text-xs">
            {usersList
              .filter(u => {
                const matchesSearch =
                  u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.free_fire_ign?.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.free_fire_uid?.includes(userSearch);

                if (!matchesSearch) return false;

                if (userFilter === 'active') return !u.is_blocked;
                if (userFilter === 'blocked') return Boolean(u.is_blocked);
                if (userFilter === 'staff') return u.role !== 'user';
                return true;
              })
              .map(u => (
                <div
                  key={u.id}
                  className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    u.is_blocked
                      ? 'bg-red-950/20 border-l-4 border-l-red-500'
                      : 'hover:bg-slate-850'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{u.username}</span>
                      <span className="text-slate-400 text-xs">({u.email})</span>
                      {u.is_blocked ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase text-[10px] flex items-center gap-1 border border-red-500/30">
                          <Ban className="w-3 h-3" />
                          <span>BLOCKED / SUSPENDED</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase text-[10px] flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Player</span>
                        </span>
                      )}
                      {u.role !== 'user' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] uppercase font-bold border border-amber-500/30">
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>IGN: <strong className="text-slate-200">{u.free_fire_ign || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>UID: <strong className="text-slate-200 font-mono">{u.free_fire_uid || 'N/A'}</strong></span>
                      {u.phone && (
                        <>
                          <span>•</span>
                          <span>Phone: <strong className="text-slate-200">{u.phone}</strong></span>
                        </>
                      )}
                      <span>•</span>
                      <span>Registered: {formatISTDateTime(u.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions: Role Select, Reset Password, and prominent BLOCK / UNBLOCK button */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <select
                      value={u.role}
                      onChange={e => handleUpdateUser(u.id, e.target.value, Boolean(u.is_blocked))}
                      className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-orange-400 font-bold focus:outline-none"
                    >
                      <option value="user">Player (user)</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="tournament_manager">Tournament Manager</option>
                      <option value="payment_manager">Payment Manager</option>
                      <option value="content_manager">Content Manager</option>
                      <option value="support_manager">Support Manager</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setResetModalUser(u);
                        setNewPasswordInput('');
                        setResetPasswordSuccess('');
                      }}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all"
                      title="Reset user password with bcrypt encryption"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Reset Pass</span>
                    </button>

                    {/* Prominent High-Visibility Block / Unblock Button */}
                    {u.is_blocked ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, u.role, false)}
                        className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow transition-all border border-emerald-400 cursor-pointer"
                        title="Unblock this player so they can log in"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Unblock User</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, u.role, true)}
                        className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all border border-red-500 cursor-pointer"
                        title="Block this user account immediately"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block User</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Admin Password Reset Modal with Bcrypt Encryption */}
          {resetModalUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 font-bold font-gaming text-base">
                    <Key className="w-5 h-5" />
                    RESET USER PASSWORD
                  </div>
                  <button
                    onClick={() => setResetModalUser(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-white font-bold text-sm">{resetModalUser.username}</div>
                  <div className="text-slate-400">{resetModalUser.email}</div>
                  <div className="text-[11px] text-slate-500 font-mono">UID: {resetModalUser.free_fire_uid || 'N/A'} • Role: {resetModalUser.role}</div>
                </div>

                {resetPasswordSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{resetPasswordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAdminResetPassword} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">New Password (Encrypted with Bcrypt)</label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] text-amber-400 hover:underline font-semibold"
                      >
                        ⚡ Generate Random
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                      {newPasswordInput && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(newPasswordInput);
                            alert('Password copied to clipboard!');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔒 The password will be hashed with 10 salt rounds of bcrypt before saving to SQLite database.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetPasswordLoading || !newPasswordInput.trim()}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-gaming font-bold text-xs rounded-xl shadow transition-all"
                    >
                      {resetPasswordLoading ? 'Encrypting & Saving...' : 'Confirm Reset'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. SECURITY & AUDIT LOGS */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-gaming font-bold text-xl text-white">SECURITY AUDIT & ACTIVITY LOGS</h3>
            <p className="text-xs text-slate-400">Immutable audit logs recording every administrative operation.</p>
          </div>

          <div className="divide-y divide-slate-800 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden text-xs">
            {activityLogs.map(log => (
              <div key={log.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-orange-400 font-bold">[{log.action}]</span>
                    <strong className="text-white">{log.admin_name}</strong>
                  </div>
                  <div className="text-slate-300 mt-0.5">{log.details}</div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <div>{formatISTDateTime(log.created_at)}</div>
                  <div className="font-mono">IP: {log.ip_address}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
