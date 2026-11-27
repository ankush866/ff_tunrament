import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Clock, Share2, Check, AlertCircle } from 'lucide-react';
import { apiRequest, formatISTDateTime } from '../lib/api.js';
import { applyPublicPageSeo } from '../lib/seo.js';

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
      .then(res => {
        setPage(res.page);
        if (res.page) {
          applyPublicPageSeo('page', {
            slug,
            metaTitle: res.page.meta_title || (res.page.title ? `${res.page.title} | Vlexa` : undefined),
            metaDescription: res.page.meta_description || undefined
          });
        }
      })
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: page?.title || 'Vlexa', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">Loading page...</div>;
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-xl font-gaming font-bold text-slate-900 dark:text-white">Page Not Found</h2>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="px-5 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold"
        >
          Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => onNavigate('home')} className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          <span>Home / {page.title}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      <article className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-sm">
        <header className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Official Policy</span>
          </div>
          <h1 className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            {page.title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Updated: {formatISTDateTime(page.updated_at)}
            </span>
          </div>
        </header>

        <div
          className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-4 [&_h2]:font-gaming [&_h2]:text-xl [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:font-bold [&_h2]:mt-5 [&_h3]:font-gaming [&_h3]:text-base [&_h3]:text-orange-600 dark:[&_h3]:text-orange-400 [&_h3]:font-bold [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_a]:text-orange-600 dark:[&_a]:text-orange-400 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </div>
  );
};
