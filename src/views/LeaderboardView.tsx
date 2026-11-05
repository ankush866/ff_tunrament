import React, { useState, useEffect } from 'react';
import { Trophy, Award, Flame, Skull, DollarSign, Shield, ArrowUpRight } from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.js';

interface LeaderboardViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onNavigate }) => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          <Trophy className="w-4 h-4" />
          <span>Esports Hall of Fame</span>
        </div>
        <h1 className="font-gaming font-extrabold text-4xl sm:text-5xl text-white">
          WARRIOR LEADERBOARD
        </h1>
        <p className="text-sm text-slate-400">
          Top Free Fire champions ranked by total tournament points, wins, and UPI cash earnings on Flaxy.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
          <div className="text-sm">Calculating warrior standings...</div>
        </div>
      ) : (
        <>
          {/* Podium for Top 3 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Rank 2 (Silver) */}
              {top3[1] && (
                <div className="rounded-3xl bg-slate-900 border border-slate-700/80 p-6 text-center space-y-4 relative order-2 md:order-1 mt-0 md:mt-8">
                  <div className="w-12 h-12 rounded-full bg-slate-700 text-slate-200 font-gaming font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                    #2
                  </div>
                  <img
                    src={top3[1].avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                    alt={top3[1].player_name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto border-2 border-slate-400"
                  />
                  <div>
                    <h3 className="font-gaming font-bold text-xl text-white">
                      {top3[1].free_fire_ign || top3[1].player_name}
                    </h3>
                    <div className="text-xs text-slate-400">{top3[1].player_name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                    <div className="p-2 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">POINTS</div>
                      <div className="font-gaming font-bold text-orange-400 text-sm">{top3[1].total_points}</div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">EARNINGS</div>
                      <div className="font-gaming font-bold text-emerald-400 text-sm">{formatINR(top3[1].total_earnings)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 1 (Gold) */}
              {top3[0] && (
                <div className="rounded-3xl bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/50 p-8 text-center space-y-4 relative order-1 md:order-2 glow-orange">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-gaming font-extrabold text-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
                    #1
                  </div>
                  <img
                    src={top3[0].avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={top3[0].player_name}
                    className="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-amber-400 shadow-xl"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
                      GRAND CHAMPION
                    </span>
                    <h3 className="font-gaming font-extrabold text-2xl text-white">
                      {top3[0].free_fire_ign || top3[0].player_name}
                    </h3>
                    <div className="text-xs text-slate-400">{top3[0].player_name}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800">
                    <div className="p-2.5 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">POINTS</div>
                      <div className="font-gaming font-bold text-amber-400 text-base">{top3[0].total_points}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">WINS</div>
                      <div className="font-gaming font-bold text-white text-base">{top3[0].wins}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">WON</div>
                      <div className="font-gaming font-bold text-emerald-400 text-base">{formatINR(top3[0].total_earnings)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 3 (Bronze) */}
              {top3[2] && (
                <div className="rounded-3xl bg-slate-900 border border-slate-700/80 p-6 text-center space-y-4 relative order-3 mt-0 md:mt-8">
                  <div className="w-12 h-12 rounded-full bg-amber-800 text-amber-200 font-gaming font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                    #3
                  </div>
                  <img
                    src={top3[2].avatar_url || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'}
                    alt={top3[2].player_name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto border-2 border-amber-700"
                  />
                  <div>
                    <h3 className="font-gaming font-bold text-xl text-white">
                      {top3[2].free_fire_ign || top3[2].player_name}
                    </h3>
                    <div className="text-xs text-slate-400">{top3[2].player_name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                    <div className="p-2 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">POINTS</div>
                      <div className="font-gaming font-bold text-orange-400 text-sm">{top3[2].total_points}</div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl">
                      <div className="text-[10px] text-slate-500">EARNINGS</div>
                      <div className="font-gaming font-bold text-emerald-400 text-sm">{formatINR(top3[2].total_earnings)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table for Rank 4+ */}
          {rest.length > 0 && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 font-gaming font-bold text-sm text-slate-300">
                ALL WARRIORS STANDINGS
              </div>
              <div className="divide-y divide-slate-800/80">
                {rest.map((p, idx) => (
                  <div key={p.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-gaming font-bold text-slate-400 w-6">#{idx + 4}</span>
                      <img
                        src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={p.player_name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-bold text-white">{p.free_fire_ign || p.player_name}</div>
                        <div className="text-[10px] text-slate-500">{p.player_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-bold text-orange-400 font-gaming">{p.total_points} PTS</div>
                        <div className="text-[10px] text-slate-500">{p.total_kills} Kills</div>
                      </div>
                      <div className="text-right w-24">
                        <div className="font-bold text-emerald-400 font-gaming">{formatINR(p.total_earnings)}</div>
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
