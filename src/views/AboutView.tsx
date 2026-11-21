import React from 'react';
import { ArrowLeft, Code2, ExternalLink, Globe, ShieldCheck, Trophy, User } from 'lucide-react';

interface AboutViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  const socialLinks = [
    {
      label: 'LinkedIn',
      handle: 'Ankush Kumar',
      href: 'https://www.linkedin.com/in/ankush-sharma-4a9911414/',
      description: 'Professional developer profile',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      ),
      className:
        'bg-blue-500/10 hover:bg-blue-600 border-blue-500/25 text-blue-600 dark:text-blue-400 hover:text-white'
    },
    {
      label: 'GitHub',
      handle: '@ankush866',
      href: 'https://github.com/ankush866',
      description: 'Open-source code & projects',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      ),
      className:
        'bg-slate-500/10 hover:bg-slate-800 border-slate-500/25 text-slate-800 dark:text-slate-200 hover:text-white'
    },
    {
      label: 'Vlexa',
      handle: 'vlexa.free.nf',
      href: 'https://vlexa.free.nf',
      description: 'Official tournament platform',
      icon: <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />,
      className:
        'bg-orange-500/10 hover:bg-orange-600 border-orange-500/25 text-orange-600 dark:text-orange-400 hover:text-white'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 pb-16">
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-800">
        <a
          href="/"
          onClick={e => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home / About the Founder</span>
        </a>
      </div>

      {/* Main About the Founder Section */}
      <section
        aria-labelledby="about-founder-heading"
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <User className="w-8 h-8" aria-hidden="true" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 tracking-wide uppercase">
              About the Founder
            </div>
            <h1
              id="about-founder-heading"
              className="font-gaming font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white"
            >
              Ankush Kumar
            </h1>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Founder &amp; Developer of Vlexa · Self-taught Aspiring Full-Stack Developer
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            <strong className="text-slate-900 dark:text-white">Ankush Kumar</strong> is a{' '}
            <strong className="text-slate-900 dark:text-white">
              Self-taught Aspiring Full-Stack Developer
            </strong>{' '}
            and the <strong className="text-slate-900 dark:text-white">Founder &amp; Developer of Vlexa</strong>.
          </p>
          <p>
            <strong className="text-slate-900 dark:text-white">Vlexa</strong> is an independently
            developed Free Fire Tournament Management Platform created to give mobile esports players a
            structured, transparent arena for competitive Solo, Duo, and Squad matches, live room
            scheduling, slot tracking, and match results.
          </p>
        </div>

        {/* Social & Official Links */}
        <div className="pt-2 space-y-3">
          <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            Official Profiles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {socialLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`min-h-[48px] px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${link.className}`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {link.icon}
                  <span className="min-w-0">
                    <span className="block font-gaming font-bold text-xs leading-tight">
                      {link.label}
                    </span>
                    <span className="block text-[11px] opacity-80 truncate">{link.handle}</span>
                  </span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-75" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Platform & Developer Focus Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <Code2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">
              Full-Stack Development
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Independently architected and maintained web application for competitive Free Fire tournaments.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">
              Tournament Management
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Organized Solo, Duo &amp; Squad brackets with clear rules, IST schedules, and match standings.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-gaming font-bold text-sm text-slate-900 dark:text-white">
              Player-First Fair Play
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Built for transparent verification, controlled room access, and clean mobile responsiveness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
