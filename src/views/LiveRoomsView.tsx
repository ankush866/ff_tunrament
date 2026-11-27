import React, { useState, useEffect } from 'react';
import { Clock, Shield, Lock, Copy, Check, ChevronRight, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest, formatINR, formatISTTime } from '../lib/api.js';

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

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-14 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Login Required for Live Rooms
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Custom Room IDs &amp; Passwords unlock only for signed-in registered players.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-sm rounded-xl"
          >
            Login Now
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-gaming font-semibold text-sm rounded-xl"
          >
            Create Account
          </button>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 text-left">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Credentials unlock automatically at scheduled Room Opening Time.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Live Match Rooms
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Room ID &amp; Password unlock at Room Opening time for approved players.
          </p>
        </div>

        <div className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 font-mono text-orange-600 dark:text-orange-400 text-xs font-semibold w-fit">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{istClock || 'Loading IST...'}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading rooms...</div>
      ) : roomsList.length === 0 ? (
        <div className="py-14 text-center text-slate-500 text-sm">No rooms scheduled right now.</div>
      ) : (
        <div className="space-y-3">
          {roomsList.map(item => {
            const room = item.room;
            const isApproved = room?.isApprovedParticipant;
            const isUnlocked = room && !room.locked && room.room_id_code && isApproved;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
                  isUnlocked
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-5 space-y-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{item.game_mode} · {item.map_name} · {room?.status || 'Scheduled'}</span>
                    </div>
                    <h2 className="font-gaming font-bold text-lg text-slate-900 dark:text-white">{item.title}</h2>
                    <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      Prize: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(item.prize_pool)}</strong> · Entry:{' '}
                      <strong className="text-orange-600 dark:text-orange-400">{item.entry_fee === 0 ? 'FREE' : formatINR(item.entry_fee)}</strong>
                    </div>
                  </div>

                  <div className="md:col-span-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Room Opens</div>
                      <div className="font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                        {room ? formatISTTime(room.opening_time) : 'TBA'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500">Match Starts</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {room ? formatISTTime(room.match_start_time) : 'TBA'}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3 flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-2">
                    {isUnlocked ? (
                      <div className="font-mono text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-400 flex items-center gap-2">
                        <span>ID: <strong className="text-orange-600 dark:text-orange-400">{room.room_id_code}</strong></span>
                        <span>Pass: <strong>{room.room_password}</strong></span>
                        <button
                          type="button"
                          onClick={() => copyCredentials(`${room.room_id_code} / ${room.room_password}`, item.id)}
                          className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          title="Copy"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{isApproved ? 'Unlocks at Room Open' : 'Registered Only'}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onNavigate('tournament-detail', { id: item.id })}
                      className="min-h-[38px] px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <span>Open Match</span>
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
