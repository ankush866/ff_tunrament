import React, { useState, useEffect } from 'react';
import { FileText, Shield, ArrowLeft, Clock, Share2, Check, AlertCircle } from 'lucide-react';
import { apiRequest, formatISTDateTime } from '../lib/api.js';

interface PageViewProps {
  slug: string;
  onNavigate: (view: string, params?: any) => void;
}

export const PageView: React.FC<PageViewProps> = ({ slug, onNavigate }) => {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiRequest<{ page: any }>(`/cms/pages/${slug}`)
      .then(res => setPage(res.page))
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: page?.title || 'Flaxy Esports',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-slate-400 space-y-2">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
        <div className="text-sm">Loading page content...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-2xl font-gaming font-bold text-white">Page Not Found</h2>
        <p className="text-sm text-slate-400">The requested page does not exist or has been unpublished.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-24">
      {/* Top Breadcrumb & Share */}
      <div className="flex items-center justify-between text-xs text-slate-400 pb-4 border-b border-slate-800">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
          <span>/</span>
          <span className="text-orange-400 font-semibold">{page.title}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied!' : 'Share Page'}</span>
        </button>
      </div>

      {/* Main Document Content */}
      <article className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 space-y-8 shadow-2xl">
        <header className="space-y-3 pb-6 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase">
            <FileText className="w-3.5 h-3.5" />
            <span>Official Flaxy Esports Document</span>
          </div>
          <h1 className="font-gaming font-extrabold text-3xl sm:text-5xl text-white tracking-wide">
            {page.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Last Updated: {formatISTDateTime(page.updated_at)}
            </span>
            <span>•</span>
            <span className="font-mono text-slate-500">Version {page.version || 1}</span>
          </div>
        </header>

        {/* Dynamic CMS Rendered HTML (Safely sanitized by server) */}
        <div
          className="prose prose-invert prose-orange max-w-none text-slate-300 text-sm leading-relaxed space-y-4 [&_h2]:font-gaming [&_h2]:text-2xl [&_h2]:text-white [&_h2]:font-bold [&_h2]:mt-6 [&_h3]:font-gaming [&_h3]:text-lg [&_h3]:text-orange-400 [&_h3]:font-bold [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:text-white [&_code]:bg-slate-950 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-orange-400 [&_a]:text-orange-400 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>

      {/* Related Policies Footer Strip */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="font-gaming font-bold text-sm text-slate-300">
          RELATED POLICIES & GUIDELINES
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: 'Tournament Rules', slug: 'tournament-rules' },
            { label: 'Privacy Policy', slug: 'privacy-policy' },
            { label: 'Terms & Conditions', slug: 'terms-and-conditions' },
            { label: 'Refund Policy', slug: 'refund-policy' },
            { label: 'Fair Play Policy', slug: 'fair-play-policy' },
            { label: 'How to Join', slug: 'how-to-join-tournament' }
          ].map(p => (
            <button
              key={p.slug}
              onClick={() => onNavigate('page', { slug: p.slug })}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
