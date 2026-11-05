import React, { useState, useEffect } from 'react';
import { HelpCircle, Search, ChevronRight, MessageSquare, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

interface FaqViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const FaqView: React.FC<FaqViewProps> = ({ onNavigate }) => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    apiRequest<{ faqs: any[] }>('/faqs')
      .then(res => setFaqs(res.faqs || []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(f => {
    const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-24">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
          <HelpCircle className="w-4 h-4" />
          <span>Knowledgebase & Support</span>
        </div>
        <h1 className="font-gaming font-extrabold text-4xl sm:text-5xl text-white">
          FREQUENTLY ASKED QUESTIONS
        </h1>
        <p className="text-sm text-slate-400">
          Everything you need to know about Free Fire tournaments, UPI payments, room IDs, and rules.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="absolute left-3.5 top-5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions (e.g. UPI, Room Password, Duo)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
          <div className="text-sm">Loading FAQs...</div>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No matching questions found for "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => (
            <div
              key={faq.id || idx}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-orange-400 border border-slate-800 uppercase">
                    {faq.category}
                  </span>
                  <span>{faq.question}</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-orange-400 transition-transform ${openIdx === idx ? 'rotate-90' : ''}`} />
              </button>

              {openIdx === idx && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Still need help CTA */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-gaming font-bold text-xl text-white">
            Still Have Questions?
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Our 24/7 esports operations team can help you with payment verification or room access.
          </p>
        </div>

        <button
          onClick={() => onNavigate('dashboard', { tab: 'support' })}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-gaming font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Open Support Ticket</span>
        </button>
      </div>
    </div>
  );
};
