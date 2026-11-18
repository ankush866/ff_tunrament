import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.js';
import { DEFAULT_PLAYER_AVATAR, getSafeImageUrl } from '../lib/assets.js';

interface LeaderboardViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ leaderboard: any[] }>('/leaderboard')
      .then(res => setPlayers(res.leaderboard || []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
      <div className="text-center max-w-xl mx-auto space-y-1.5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Trophy className="w-4 h-4" />
          <span>Hall of Fame</span>
        </div>
        <h1 className="font-gaming font-bold text-2xl sm:text-4xl text-slate-900 dark:text-white">
          Player Rankings
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Top players ranked by tournament points, wins, and cash prizes.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading rankings...</div>
      ) : players.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-500">
          No leaderboard standings published yet.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className={`rounded-2xl bg-white dark:bg-slate-900 border p-5 text-center space-y-3 ${
                    idx === 0
                      ? 'border-amber-500/60 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-xs font-gaming font-bold text-amber-600 dark:text-amber-400">
                    Rank #{idx + 1}
                  </div>
                  <img
                    src={getSafeImageUrl(p.avatar_url, DEFAULT_PLAYER_AVATAR)}
                    alt={p.player_name}
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                    className="w-16 h-16 rounded-2xl object-cover mx-auto border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white truncate">
                      {p.free_fire_ign || p.player_name}
                    </h3>
                    <div className="text-xs text-slate-500 truncate">{p.player_name}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[11px] text-slate-500">Points</div>
                      <div className="font-mono font-bold text-orange-600 dark:text-orange-400 tabular-nums">{p.total_points}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Wins</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">{p.wins}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Won</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatINR(p.total_earnings)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-gaming font-bold text-xs text-slate-700 dark:text-slate-300">
                All Standings
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rest.map((p, idx) => (
                  <div key={p.id || idx} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-slate-500 w-7 shrink-0">#{idx + 4}</span>
                      <img
                        src={getSafeImageUrl(p.avatar_url, DEFAULT_PLAYER_AVATAR)}
                        alt={p.player_name}
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PLAYER_AVATAR; }}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">{p.free_fire_ign || p.player_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{p.player_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 tabular-nums">
                      <div className="text-right">
                        <div className="font-mono font-bold text-orange-600 dark:text-orange-400">{p.total_points} PTS</div>
                        <div className="text-[10px] text-slate-500">{p.total_kills} Kills</div>
                      </div>
                      <div className="text-right w-20">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatINR(p.total_earnings)}</div>
                        <div className="text-[10px] text-slate-500">{p.wins} Wins</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
