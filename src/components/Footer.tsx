import React, { useEffect, useState } from 'react';
import { Flame, Shield, HelpCircle, FileText, Send, Phone, Mail, Award, Clock } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [footerNav, setFooterNav] = useState<any[]>([]);
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    apiRequest<{ settings: Record<string, string> }>('/settings/public')
      .then(res => setSettings(res.settings || {}))
      .catch(() => {});

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
    return () => clearInterval(interval);
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

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="max-w-3xl text-center md:text-left">
            {settings.footer_text || '© 2026 FLAXY ESPORTS. All rights reserved. Free Fire is a registered trademark of Garena. This tournament platform is an independent esports organizer.'}
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            {settings.social_instagram && (
              <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="hover:text-orange-400">
                Instagram
              </a>
            )}
            {settings.social_youtube && (
              <a href={settings.social_youtube} target="_blank" rel="noreferrer" className="hover:text-orange-400">
                YouTube
              </a>
            )}
            {settings.social_discord && (
              <a href={settings.social_discord} target="_blank" rel="noreferrer" className="hover:text-orange-400">
                Discord
              </a>
            )}
            {settings.social_telegram && (
              <a href={settings.social_telegram} target="_blank" rel="noreferrer" className="hover:text-orange-400">
                Telegram
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
