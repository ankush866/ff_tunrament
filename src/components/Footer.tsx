import React, { useEffect, useState } from 'react';
import { Flame, Shield, HelpCircle, FileText, Send, Phone, Mail, Award, Clock } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('flaxy_site_settings') || '{}');
    } catch {
      return {};
    }
  });
  const [footerNav, setFooterNav] = useState<any[]>([]);
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const loadSettings = () => {
      apiRequest<{ settings: Record<string, string> }>('/settings/public')
        .then(res => {
          if (res.settings) {
            setSettings(res.settings);
            try {
              localStorage.setItem('flaxy_site_settings', JSON.stringify(res.settings));
            } catch {}
          }
        })
        .catch(() => {});
    };

    loadSettings();
    window.addEventListener('flaxy_settings_updated', loadSettings);

    apiRequest<{ items: any[] }>('/cms/navigation')
      .then(res => {
        const footers = (res.items || []).filter(item => item.is_footer && item.is_visible);
        setFooterNav(footers);
      })
      .catch(() => {});

    const updateClock = () => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('flaxy_settings_updated', loadSettings);
    };
  }, []);

  const handleNav = (url: string) => {
    if (url.startsWith('/page/')) {
      const slug = url.replace('/page/', '');
      onNavigate('page', { slug });
    } else if (url === '/tournaments') {
      onNavigate('tournaments');
    } else if (url === '/leaderboard') {
      onNavigate('leaderboard');
    } else if (url === '/faq') {
      onNavigate('faq');
    } else {
      onNavigate('home');
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <span className="font-gaming font-extrabold text-xl text-white tracking-wider">
                {settings.site_name || 'FLAXY ESPORTS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.site_tagline || 'India’s premier Free Fire competitive tournament portal with automated room scheduling and instant UPI rewards.'}
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 w-fit">
              <Clock className="w-3.5 h-3.5" />
              <span>Server Clock: {istTime || 'Loading...'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-gaming font-bold text-slate-200 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-400" />
              Tournaments
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('tournaments')} className="hover:text-orange-400 transition-colors">
                  All Active Tournaments
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('live-rooms')} className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  Live Room Credentials
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('leaderboard')} className="hover:text-orange-400 transition-colors">
                  Player Hall of Fame
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('page', { slug: 'how-to-join-tournament' })} className="hover:text-orange-400 transition-colors">
                  How to Join Guide
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('page', { slug: 'winners-and-prizes-information' })} className="hover:text-orange-400 transition-colors">
                  Prize Distribution Details
                </button>
              </li>
            </ul>
          </div>

          {/* Policy & Rules (CMS Pre-seeded) */}
          <div>
            <h4 className="font-gaming font-bold text-slate-200 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Fair Play & Policies
            </h4>
            <ul className="space-y-2 text-xs">
              {footerNav.length > 0 ? (
                footerNav.map((item, idx) => (
                  <li key={idx}>
                    <button onClick={() => handleNav(item.url)} className="hover:text-orange-400 transition-colors">
                      {item.label}
                    </button>
                  </li>
                ))
              ) : (
                <>
                  <li><button onClick={() => onNavigate('page', { slug: 'privacy-policy' })} className="hover:text-orange-400">Privacy Policy</button></li>
                  <li><button onClick={() => onNavigate('page', { slug: 'terms-and-conditions' })} className="hover:text-orange-400">Terms & Conditions</button></li>
                  <li><button onClick={() => onNavigate('page', { slug: 'refund-policy' })} className="hover:text-orange-400">Refund Policy</button></li>
                  <li><button onClick={() => onNavigate('page', { slug: 'tournament-rules' })} className="hover:text-orange-400">Official Tournament Rules</button></li>
                  <li><button onClick={() => onNavigate('page', { slug: 'fair-play-policy' })} className="hover:text-orange-400">Fair Play Policy</button></li>
                </>
              )}
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="font-gaming font-bold text-slate-200 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Contact & Helpline
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{settings.support_email || 'support@flaxy.gg'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{settings.contact_phone || '+91 98765 43210'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-slate-500" />
                <a
                  href={settings.whatsapp_url || 'https://wa.me/919876543210'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  WhatsApp Support Group
                </a>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">Official UPI ID for Verification:</div>
              <div className="font-mono text-xs font-semibold text-orange-400 mt-0.5">
                {settings.upi_id || 'flaxy.esports@icici'}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer, Copyright & Official Social Channels */}
        <div className="pt-8 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="max-w-2xl text-center md:text-left leading-relaxed">
            {settings.footer_text || '© 2026 FLAXY ESPORTS. All rights reserved. Free Fire is a registered trademark of Garena. This tournament platform is an independent esports organizer.'}
          </p>

          {/* Social Channels Configured by Admin */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* YouTube */}
            <a
              href={(() => {
                const val = settings.social_youtube || 'https://youtube.com/@flaxyesports';
                if (val.startsWith('http')) return val;
                if (val.startsWith('@')) return `https://youtube.com/${val}`;
                return `https://youtube.com/@${val}`;
              })()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white text-xs font-gaming font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-red-600/30 group"
              title="Flaxy YouTube Channel"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>YouTube</span>
            </a>

            {/* Instagram */}
            <a
              href={(() => {
                const val = settings.social_instagram || 'https://instagram.com/flaxy_esports';
                if (val.startsWith('http')) return val;
                return `https://instagram.com/${val.replace('@', '')}`;
              })()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-pink-600/10 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 border border-pink-500/30 hover:border-pink-500 text-pink-400 hover:text-white text-xs font-gaming font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-pink-600/30 group"
              title="Flaxy Instagram Profile"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>Instagram</span>
            </a>

            {/* Discord */}
            <a
              href={(() => {
                const val = settings.social_discord || 'https://discord.gg/flaxy';
                if (val.startsWith('http')) return val;
                return `https://discord.gg/${val}`;
              })()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-white text-xs font-gaming font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-indigo-600/30 group"
              title="Flaxy Discord Server"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Discord</span>
            </a>

            {/* Telegram */}
            <a
              href={(() => {
                const val = settings.social_telegram || 'https://t.me/flaxyesports';
                if (val.startsWith('http')) return val;
                return `https://t.me/${val.replace('@', '')}`;
              })()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 hover:text-white text-xs font-gaming font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-cyan-600/30 group"
              title="Flaxy Telegram Channel"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.965z"/>
              </svg>
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
