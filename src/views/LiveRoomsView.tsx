import React, { useState, useEffect } from 'react';
import { Clock, Shield, Lock, Unlock, Copy, Check, ChevronRight, MapPin, Trophy, Flame, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatINR, formatISTDateTime, formatISTTime } from '../lib/api.js';

interface LiveRoomsViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LiveRoomsView: React.FC<LiveRoomsViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { user } = useAuth();
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [istClock, setIstClock] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchRooms = () => {
      apiRequest<{ tournaments: any[] }>('/tournaments')
        .then(async (res) => {
          const list = res.tournaments || [];
          const enriched = await Promise.all(
            list.map(async (t) => {
              try {
                const roomRes = await apiRequest(`/rooms/${t.id}`);
                return { ...t, room: roomRes };
              } catch {
                return { ...t, room: null };
              }
            })
          );
          setRoomsList(enriched);
        })
        .catch(() => setRoomsList([]))
        .finally(() => setLoading(false));
    };

    fetchRooms();
    const interval = setInterval(() => {
      const now = new Date();
      setIstClock(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const copyCredentials = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If user is not logged in: Strictly gate access with authentication prompt
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/20">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider">
            Authentication Required
          </div>
          <h1 className="font-gaming font-extrabold text-3xl sm:text-5xl text-white tracking-wide">
            LIVE ROOM ACCESS RESTRICTED
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Free Fire Custom Room IDs and Passwords are confidential and strictly restricted to registered players. Please log in or register with your Free Fire UID to access match lobbies.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => onOpenAuth('login')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-sm rounded-2xl shadow-xl shadow-orange-500/25 transition-all tracking-wider"
          >
            Sign In to Access Rooms
          </button>
          <button
            onClick={() => onOpenAuth('register')}
            className="w-full sm:w-auto px-7 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-gaming font-semibold text-sm rounded-2xl transition-all"
          >
            Create New Player Account
          </button>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl max-w-md mx-auto text-xs text-slate-400 flex items-center gap-3 text-left mt-8">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Fair Play Rule: Credentials release strictly at scheduled IST room opening time only for verified paid slots.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>Real-Time Free Fire Lobbies</span>
          </div>
          <h1 className="font-gaming font-extrabold text-3xl sm:text-5xl text-white">
            LIVE ROOM TIMINGS & CREDENTIALS
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Live schedule for all scheduled Free Fire rooms. Credentials unlock automatically at scheduled Room Opening Time for verified players.
          </p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-2 font-mono text-orange-400 text-sm font-semibold">
          <Clock className="w-4 h-4 text-orange-400" />
          <span>Server Time: {istClock || 'Loading...'}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
          <div className="text-sm">Fetching live room schedules...</div>
        </div>
      ) : roomsList.length === 0 ? (
        <div className="py-16 text-center text-slate-500">No rooms scheduled today.</div>
      ) : (
        <div className="space-y-4">
          {roomsList.map(item => {
            const room = item.room;
            const isApproved = room?.isApprovedParticipant;
            const isUnlocked = room && !room.locked && room.room_id_code && isApproved;

            return (
              <div
                key={item.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isUnlocked
                    ? 'bg-emerald-950/20 border-emerald-500/40 glow-orange'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Tournament Info */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-950 text-orange-400 border border-slate-800 uppercase">
                        {item.game_mode}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {item.map_name}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        room?.status === 'open'
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : room?.status === 'live'
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {room?.status || 'Scheduled'}
                      </span>
                    </div>

                    <h3 className="font-gaming font-bold text-xl text-white">
                      {item.title}
                    </h3>
                    <div className="text-xs text-slate-400">
                      Prize Pool: <strong className="text-emerald-400 font-gaming">{formatINR(item.prize_pool)}</strong> • Entry: <strong className="text-orange-400">{item.entry_fee === 0 ? 'FREE' : formatINR(item.entry_fee)}</strong>
                    </div>
                  </div>

                  {/* Schedule Timings */}
                  <div className="md:col-span-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 uppercase">Room Opening</div>
                      <div className="font-bold text-orange-400 mt-0.5">
                        {room ? formatISTTime(room.opening_time) : 'TBA'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-500 uppercase">Match Starts</div>
                      <div className="font-bold text-emerald-400 mt-0.5">
                        {room ? formatISTTime(room.match_start_time) : 'TBA'}
                      </div>
                    </div>
                  </div>

                  {/* Credentials / Status */}
                  <div className="md:col-span-3 flex flex-col items-end justify-center gap-2">
                    {isUnlocked ? (
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-emerald-400 font-bold block mb-1">
                          Room Unlocked
                        </span>
                        <div className="font-mono text-xs text-white bg-slate-950 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-2">
                          <span>ID: <strong className="text-orange-400">{room.room_id_code}</strong></span>
                          <span>Pass: <strong className="text-amber-400">{room.room_password}</strong></span>
                          <button
                            onClick={() => copyCredentials(`${room.room_id_code} / ${room.room_password}`, item.id)}
                            className="text-slate-400 hover:text-white"
                            title="Copy credentials"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-orange-400" />
                        <span>{isApproved ? 'Unlocks at Room Open' : 'Registered Access Only'}</span>
                      </div>
                    )}

                    <button
                      onClick={() => onNavigate('tournament-detail', { id: item.id })}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1"
                    >
                      <span>Match Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
