import React, { useState, useEffect } from 'react';
import { HelpCircle, Search, ChevronRight, MessageSquare } from 'lucide-react';
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
    const matchesSearch =
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
          <HelpCircle className="w-4 h-4" />
          <span>Help &amp; FAQ</span>
        </div>
        <h1 className="font-gaming font-bold text-2xl sm:text-4xl text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h1>
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="absolute left-3.5 top-4.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search UPI, Room ID, Duo, Rules..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading FAQs...</div>
      ) : filteredFaqs.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">No matching questions found.</div>
      ) : (
        <div className="space-y-2.5">
          {filteredFaqs.map((faq, idx) => (
            <div
              key={faq.id || idx}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                <span>{faq.question}</span>
                <ChevronRight className={`w-4 h-4 text-orange-500 shrink-0 transition-transform ${openIdx === idx ? 'rotate-90' : ''}`} />
              </button>
              {openIdx === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-gaming font-bold text-base text-slate-900 dark:text-white">Still need help?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Open a support ticket directly from your profile.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('dashboard', { tab: 'support' })}
          className="min-h-[40px] px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Open Ticket</span>
        </button>
      </div>
    </div>
  );
};
