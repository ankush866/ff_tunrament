import React, { useEffect, useState } from 'react';
import { HelpCircle, Send, Phone, Mail } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { sanitizeVlexaSeoText } from '../lib/seo.js';

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
    return () => {
      window.removeEventListener('flaxy_settings_updated', loadSettings);
    };
  }, []);

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        {/* Support Desk + Social Channels Only */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Support Info */}
          <div className="space-y-2">
            <h4 className="font-gaming font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
              <span>Support</span>
            </h4>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {settings.support_email && !/flaxy/i.test(settings.support_email) && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{settings.support_email}</span>
                </span>
              )}
              {settings.contact_phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{settings.contact_phone}</span>
                </span>
              )}
              <a
                href={settings.whatsapp_url || 'https://wa.me/919876543210'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>

          {/* Official Social Channels (rendered only when configured) */}
          <div className="flex flex-wrap items-center gap-2">
            {settings.social_youtube && !/flaxy/i.test(settings.social_youtube) && (
              <a
                href={(() => {
                  const val = settings.social_youtube;
                  if (val.startsWith('http')) return val;
                  if (val.startsWith('@')) return `https://youtube.com/${val}`;
                  return `https://youtube.com/@${val}`;
                })()}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-600 border border-red-500/25 text-red-600 dark:text-red-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube</span>
              </a>
            )}

            {settings.social_instagram && !/flaxy/i.test(settings.social_instagram) && (
              <a
                href={(() => {
                  const val = settings.social_instagram;
                  if (val.startsWith('http')) return val;
                  return `https://instagram.com/${val.replace('@', '')}`;
                })()}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-600 border border-pink-500/25 text-pink-600 dark:text-pink-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>Instagram</span>
              </a>
            )}

            {settings.social_discord && !/flaxy/i.test(settings.social_discord) && (
              <a
                href={(() => {
                  const val = settings.social_discord;
                  if (val.startsWith('http')) return val;
                  return `https://discord.gg/${val}`;
                })()}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Discord</span>
              </a>
            )}

            {settings.social_telegram && !/flaxy/i.test(settings.social_telegram) && (
              <a
                href={(() => {
                  const val = settings.social_telegram;
                  if (val.startsWith('http')) return val;
                  return `https://t.me/${val.replace('@', '')}`;
                })()}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-600 border border-cyan-500/25 text-cyan-700 dark:text-cyan-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.965z"/>
                </svg>
                <span>Telegram</span>
              </a>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-center md:text-left">
          <span>
            {settings.footer_text && !/flaxy/i.test(settings.footer_text)
              ? sanitizeVlexaSeoText(settings.footer_text)
              : '© 2026 Vlexa. All rights reserved. Founded & Developed by Ankush Sharma.'}
          </span>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('about');
            }}
            className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-600 border border-orange-500/25 text-orange-600 dark:text-orange-400 hover:text-white font-semibold transition-colors whitespace-nowrap"
          >
            About the Founder
          </a>
        </div>
      </div>
    </footer>
  );
};
