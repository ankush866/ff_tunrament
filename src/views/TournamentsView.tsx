import React, { useState, useEffect } from 'react';
import { Trophy, Search, MapPin, Clock, ArrowRight } from 'lucide-react';
import { apiRequest, formatINR, formatISTDateTime } from '../lib/api.js';
import { DEFAULT_MATCH_BANNER, getSafeImageUrl } from '../lib/assets.js';

interface TournamentsViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({ onNavigate }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTournaments = () => {
    setLoading(true);
    const url = `/tournaments?game_mode=${selectedMode}&map_name=all&status=${selectedStatus}`;
    apiRequest<{ tournaments: any[] }>(url)
      .then(res => setTournaments(res.tournaments || []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTournaments();
  }, [selectedMode, selectedStatus]);

  const filteredTournaments = tournaments.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.map_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
      {/* Compact Header + Quick Live Room Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-500 shrink-0" />
            <span>Matches &amp; Tournaments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Select a match to reserve your slot and view room details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('live-rooms')}
            className="min-h-[40px] px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Live Rooms</span>
          </button>
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search match..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full min-h-[40px] pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Simple Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {['all', 'Solo', 'Duo', 'Squad', 'Clash Squad'].map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedMode === mode
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mode === 'all' ? 'All Modes' : mode}
            </button>
          ))}
        </div>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="min-h-[38px] px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500"
        >
          <option value="all">All Status</option>
          <option value="Registration Open">Open</option>
          <option value="Live">Live Now</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading matches...</div>
      ) : filteredTournaments.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
          <Trophy className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="font-gaming font-bold text-base text-slate-900 dark:text-white">No Matches Found</div>
          <button
            type="button"
            onClick={() => { setSelectedMode('all'); setSelectedStatus('all'); setSearchQuery(''); }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTournaments.map(tournament => {
            const filledSlots = tournament.total_slots - tournament.available_slots;
            const fillPercentage = Math.min(100, Math.round((filledSlots / tournament.total_slots) * 100));

            return (
              <div
                key={tournament.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-orange-500/50 transition-colors flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-950">
                    <img
                      src={getSafeImageUrl(tournament.banner_image, DEFAULT_MATCH_BANNER)}
                      alt={tournament.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_MATCH_BANNER; }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        {tournament.game_mode} · {tournament.map_name}
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-300 tabular-nums">
                        {formatINR(tournament.prize_pool)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        <span>{formatISTDateTime(tournament.match_at)}</span>
                        <span className={`font-bold ${
                          tournament.status === 'Registration Open'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tournament.status === 'Live'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-500'
                        }`}>
                          {tournament.status}
                        </span>
                      </div>
                      <h3 className="font-gaming font-bold text-lg text-slate-900 dark:text-white line-clamp-1">
                        {tournament.title}
                      </h3>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        <span>Slots Reserved</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {filledSlots}/{tournament.total_slots} ({fillPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500">Entry Fee</div>
                    <div className="font-gaming font-bold text-orange-600 dark:text-orange-400 text-base tabular-nums">
                      {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('tournament-detail', { id: tournament.id })}
                    className="min-h-[40px] px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Join Match</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
