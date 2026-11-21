import { formatINR, formatISTDateTime } from './api.js';
import { DEFAULT_MATCH_BANNER, getSafeImageUrl } from './assets.js';

export const DEFAULT_SITE_URL = 'https://vlexa.free.nf';
export const DEFAULT_SEO_TITLE = 'Vlexa – Free Fire Tournament Platform';
export const DEFAULT_SEO_DESCRIPTION =
  'Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by Ankush Kumar, featuring competitive matches, live room schedules & rankings.';

export interface TournamentSeoData {
  id: string | number;
  slug?: string;
  title: string;
  game_mode?: string;
  map_name?: string;
  entry_fee?: number;
  prize_pool?: number;
  total_slots?: number;
  available_slots?: number;
  match_at?: string;
  status?: string;
  banner_image?: string | null;
  rules_text?: string;
}

const JSON_LD_SCRIPT_ID = 'vlexa-tournament-jsonld';

function getCanonicalOrigin(): string {
  return DEFAULT_SITE_URL;
}

function upsertMetaTag(
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMetaTag(attrName: 'name' | 'property', attrValue: string): void {
  if (typeof document === 'undefined') return;
  const el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (el) el.remove();
}

function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(id: string, payload: Record<string, unknown> | null): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id);
  if (!payload) {
    if (existing) existing.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

function resolveAbsoluteImageUrl(rawBanner?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  const safe = getSafeImageUrl(rawBanner, DEFAULT_MATCH_BANNER);
  if (!safe || safe.startsWith('data:')) return null;
  if (safe.startsWith('http://') || safe.startsWith('https://')) return safe;
  const origin = getCanonicalOrigin();
  if (safe.startsWith('/')) return `${origin}${safe}`;
  return `${origin}/${safe}`;
}

export function applyPublicPageSeo(view: string, params: Record<string, any> = {}): void {
  if (typeof document === 'undefined') return;
  if (view === 'tournament-detail') return;

  const origin = getCanonicalOrigin();
  let title = DEFAULT_SEO_TITLE;
  let description = DEFAULT_SEO_DESCRIPTION;
  let path = '/';
  let isPrivate = false;

  if (view === 'about') {
    title = 'About Ankush Kumar – Founder & Developer of Vlexa';
    description =
      'Ankush Kumar is a Self-taught Aspiring Full-Stack Developer and Founder & Developer of Vlexa, an independently developed Free Fire Tournament Management Platform.';
    path = '/about';
  } else if (view === 'tournaments') {
    title = 'Free Fire Tournaments & Matches | Vlexa';
    description =
      'Browse Solo, Duo, Squad & Clash Squad Free Fire tournaments on Vlexa. Check entry fees, prize pools, match schedules, and available slots.';
    path = '/tournaments';
  } else if (view === 'live-rooms') {
    title = 'Live Free Fire Custom Rooms & Schedules | Vlexa';
    description =
      'Track upcoming and live Free Fire tournament room opening times and IST match countdowns on Vlexa.';
    path = '/live-rooms';
  } else if (view === 'leaderboard') {
    title = 'Player Rankings & Tournament Leaderboard | Vlexa';
    description =
      'View verified Free Fire tournament winners, kill leaders, and top-ranked players across matches on Vlexa.';
    path = '/leaderboard';
  } else if (view === 'faq') {
    title = 'Frequently Asked Questions & Rules | Vlexa';
    description =
      'Find answers about joining Free Fire tournaments, room credentials, payment verification, and fair play guidelines on Vlexa.';
    path = '/faq';
  } else if (view === 'page') {
    const slug = String(params.slug || 'privacy-policy');
    const pageMeta: Record<string, { title: string; description: string }> = {
      'privacy-policy': {
        title: 'Privacy Policy | Vlexa',
        description: 'Read how Vlexa handles tournament registration data and player privacy.'
      },
      'terms-and-conditions': {
        title: 'Terms & Conditions | Vlexa',
        description: 'Review official platform terms and conditions for participating on Vlexa.'
      },
      'refund-policy': {
        title: 'Refund Policy | Vlexa',
        description: 'Understand match cancellation and entry fee refund guidelines on Vlexa.'
      },
      'tournament-rules': {
        title: 'Tournament Rules & Fair Play | Vlexa',
        description: 'Read official Free Fire mobile tournament rules and fair play policies on Vlexa.'
      }
    };
    const matched = pageMeta[slug];
    title = matched ? matched.title : `${slug.replace(/-/g, ' ')} | Vlexa`;
    description = matched ? matched.description : DEFAULT_SEO_DESCRIPTION;
    path = `/page/${slug}`;
  } else if (view === 'dashboard' || view === 'admin') {
    isPrivate = true;
    title = view === 'admin' ? 'Admin Panel | Vlexa' : 'Player Account | Vlexa';
    description = DEFAULT_SEO_DESCRIPTION;
    path = view === 'admin' ? '/admin' : '/dashboard';
  }

  const canonicalUrl = `${origin}${path}`;

  document.title = title;
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('name', 'robots', isPrivate ? 'noindex, nofollow' : 'index, follow');
  upsertMetaTag('property', 'og:type', view === 'about' ? 'profile' : 'website');
  upsertMetaTag('property', 'og:site_name', 'Vlexa');
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);

  if (!isPrivate) {
    upsertCanonical(canonicalUrl);
  }
}

export function buildTournamentMeta(
  tournament: TournamentSeoData,
  registeredCount?: number
): { title: string; description: string; canonicalUrl: string; imageUrl: string | null } {
  const mode = tournament.game_mode || 'Squad';
  const map = tournament.map_name || 'Bermuda';
  const prize = formatINR(Number(tournament.prize_pool || 0));
  const feeNum = Number(tournament.entry_fee || 0);
  const feeText = feeNum === 0 ? 'Free Entry' : `Entry ${formatINR(feeNum)}`;

  const totalSlots = Number(tournament.total_slots || 48);
  const availableSlots =
    tournament.available_slots !== undefined
      ? Number(tournament.available_slots)
      : Math.max(0, totalSlots - Number(registeredCount || 0));

  const matchTimeText = tournament.match_at
    ? formatISTDateTime(tournament.match_at)
    : 'IST Scheduled';

  const rawTitle = `${tournament.title} (${mode} · ${map}) – ${prize} Prize | Vlexa`;
  const title = rawTitle.length > 70 ? `${tournament.title} | ${mode} · ${map} – Vlexa` : rawTitle;

  const statusLabel = tournament.status || 'Registration Open';
  const description = `Join ${tournament.title} Free Fire ${mode} match on ${map}. Prize Pool: ${prize}, ${feeText}, ${availableSlots}/${totalSlots} slots left. Match: ${matchTimeText} (${statusLabel}).`;

  const origin = getCanonicalOrigin();
  const canonicalUrl = `${origin}/tournament/${tournament.id}`;
  const imageUrl = resolveAbsoluteImageUrl(tournament.banner_image);

  return { title, description, canonicalUrl, imageUrl };
}

export function injectTournamentSeo(
  tournament: TournamentSeoData,
  registeredCount?: number
): () => void {
  if (typeof document === 'undefined') return () => {};

  const { title, description, canonicalUrl, imageUrl } = buildTournamentMeta(
    tournament,
    registeredCount
  );

  document.title = title;
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('name', 'robots', 'index, follow');

  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:site_name', 'Vlexa');
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  if (imageUrl) {
    upsertMetaTag('property', 'og:image', imageUrl);
    upsertMetaTag('name', 'twitter:image', imageUrl);
  }

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);

  upsertCanonical(canonicalUrl);

  const totalSlots = Number(tournament.total_slots || 48);
  const availableSlots =
    tournament.available_slots !== undefined
      ? Number(tournament.available_slots)
      : Math.max(0, totalSlots - Number(registeredCount || 0));

  const eventStatusMap: Record<string, string> = {
    Cancelled: 'https://schema.org/EventCancelled',
    Completed: 'https://schema.org/EventScheduled',
    Live: 'https://schema.org/EventScheduled',
    Upcoming: 'https://schema.org/EventScheduled',
    'Registration Open': 'https://schema.org/EventScheduled'
  };

  const origin = getCanonicalOrigin();

  upsertJsonLd(JSON_LD_SCRIPT_ID, {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.title,
    description,
    url: canonicalUrl,
    startDate: tournament.match_at || undefined,
    eventStatus: eventStatusMap[tournament.status || ''] || 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: canonicalUrl
    },
    image: imageUrl ? [imageUrl] : undefined,
    organizer: {
      '@type': 'Organization',
      name: 'Vlexa',
      url: origin
    },
    offers: {
      '@type': 'Offer',
      price: String(Number(tournament.entry_fee || 0)),
      priceCurrency: 'INR',
      availability:
        availableSlots > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      url: canonicalUrl
    }
  });

  return resetDefaultSeo;
}

export function resetDefaultSeo(): void {
  if (typeof document === 'undefined') return;
  const origin = getCanonicalOrigin();
  document.title = DEFAULT_SEO_TITLE;
  upsertMetaTag('name', 'description', DEFAULT_SEO_DESCRIPTION);
  upsertMetaTag('name', 'robots', 'index, follow');
  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:site_name', 'Vlexa');
  upsertMetaTag('property', 'og:title', DEFAULT_SEO_TITLE);
  upsertMetaTag('property', 'og:description', DEFAULT_SEO_DESCRIPTION);
  upsertMetaTag('property', 'og:url', `${origin}/`);
  removeMetaTag('property', 'og:image');
  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', DEFAULT_SEO_TITLE);
  upsertMetaTag('name', 'twitter:description', DEFAULT_SEO_DESCRIPTION);
  removeMetaTag('name', 'twitter:image');
  upsertCanonical(`${origin}/`);
  upsertJsonLd(JSON_LD_SCRIPT_ID, null);
}
