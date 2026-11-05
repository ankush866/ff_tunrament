import React, { useState, useEffect } from 'react';
import { Trophy, Search, Filter, MapPin, Clock, Users, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { apiRequest, formatINR, formatISTDateTime } from '../lib/api.js';

interface TournamentsViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({ onNavigate, onOpenAuth }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedMap, setSelectedMap] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTournaments = () => {
    setLoading(true);
    let url = `/tournaments?game_mode=${selectedMode}&map_name=${selectedMap}&status=${selectedStatus}`;
    apiRequest<{ tournaments: any[] }>(url)
      .then(res => setTournaments(res.tournaments || []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTournaments();
  }, [selectedMode, selectedMap, selectedStatus]);

  const filteredTournaments = tournaments.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.map_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4" />
            <span>Competitive Esports Arena</span>
          </div>
          <h1 className="font-gaming font-extrabold text-3xl sm:text-5xl text-white">
            FREE FIRE TOURNAMENTS
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Choose your match bracket, lock in your slot with transaction-safe reservations, and access the custom room credentials on time.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tournament or map..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        {/* Game Mode Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Mode:
          </span>
          {['all', 'Solo', 'Duo', 'Squad', 'Clash Squad'].map(mode => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedMode === mode
                  ? 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {mode === 'all' ? 'All Modes' : mode}
            </button>
          ))}
        </div>

        {/* Map & Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map filter */}
          <select
            value={selectedMap}
            onChange={e => setSelectedMap(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Maps</option>
            <option value="Bermuda">Bermuda</option>
            <option value="Purgatory">Purgatory</option>
            <option value="Kalahari">Kalahari</option>
            <option value="Alpine">Alpine</option>
            <option value="Nextra">Nextra</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="Registration Open">Registration Open</option>
            <option value="Live">Live Now</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
          <div className="text-sm">Loading active tournaments...</div>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-gaming font-bold text-lg text-slate-300">No Tournaments Match Your Filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your filters or check back later. New Free Fire matches are scheduled daily!
          </p>
          <button
            onClick={() => {
              setSelectedMode('all');
              setSelectedMap('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map(tournament => {
            const filledSlots = tournament.total_slots - tournament.available_slots;
            const fillPercentage = Math.min(100, Math.round((filledSlots / tournament.total_slots) * 100));

            return (
              <div
                key={tournament.id}
                className="group rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col justify-between"
              >
                <div>
                  {/* Banner Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-950">
                    <img
                      src={tournament.banner_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
                      alt={tournament.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900/90 text-orange-400 border border-slate-700/80 backdrop-blur-md uppercase">
                        {tournament.game_mode}
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900/90 text-slate-200 border border-slate-700/80 backdrop-blur-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {tournament.map_name}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                        tournament.status === 'Registration Open'
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : tournament.status === 'Live'
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-slate-800 text-slate-300'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>

                    {/* Prize Pool Tag */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-gaming font-extrabold text-emerald-400 text-sm">
                        {formatINR(tournament.prize_pool)}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-gaming font-bold text-xl text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                        {tournament.title}
                      </h3>
                      <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                        <span>Match: {formatISTDateTime(tournament.match_at)}</span>
                      </div>
                    </div>

                    {/* Slot Fill Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Slots Reserved:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {filledSlots}/{tournament.total_slots} ({fillPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 pt-0 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Entry Fee</div>
                    <div className="font-gaming font-extrabold text-orange-400 text-lg">
                      {tournament.entry_fee === 0 ? 'FREE' : formatINR(tournament.entry_fee)}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('tournament-detail', { id: tournament.id })}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-gaming font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5 tracking-wider"
                  >
                    <span>VIEW & JOIN</span>
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
