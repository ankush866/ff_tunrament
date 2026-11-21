import { formatINR, formatISTDateTime } from './api.js';
import { DEFAULT_MATCH_BANNER, getSafeImageUrl } from './assets.js';

export const DEFAULT_SEO_TITLE = 'Flaxy Free Fire Tournament Platform';
export const DEFAULT_SEO_DESCRIPTION =
  'Competitive Free Fire esports tournament platform with live room scheduling, automated countdowns, manual UPI verification, user wallet & dashboard, and admin controls.';

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

const JSON_LD_SCRIPT_ID = 'flaxy-tournament-jsonld';

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

function removeCanonical(): void {
  if (typeof document === 'undefined') return;
  const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (link) link.remove();
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
  if (safe.startsWith('/')) return `${window.location.origin}${safe}`;
  return `${window.location.origin}/${safe}`;
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

  const rawTitle = `${tournament.title} (${mode} · ${map}) – ${prize} Prize | Flaxy Esports`;
  const title = rawTitle.length > 70 ? `${tournament.title} | ${mode} · ${map} – Flaxy Esports` : rawTitle;

  const statusLabel = tournament.status || 'Registration Open';
  const description = `Join ${tournament.title} Free Fire ${mode} match on ${map}. Prize Pool: ${prize}, ${feeText}, ${availableSlots}/${totalSlots} slots left. Match: ${matchTimeText} (${statusLabel}).`;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = `${origin}/#/tournament/${tournament.id}`;
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

  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:site_name', 'Flaxy Esports');
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
      name: 'Flaxy Esports',
      url: typeof window !== 'undefined' ? window.location.origin : undefined
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
  document.title = DEFAULT_SEO_TITLE;
  upsertMetaTag('name', 'description', DEFAULT_SEO_DESCRIPTION);
  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:title', DEFAULT_SEO_TITLE);
  upsertMetaTag('property', 'og:description', DEFAULT_SEO_DESCRIPTION);
  removeMetaTag('property', 'og:url');
  removeMetaTag('property', 'og:image');
  removeMetaTag('property', 'og:site_name');
  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  removeMetaTag('name', 'twitter:title');
  removeMetaTag('name', 'twitter:description');
  removeMetaTag('name', 'twitter:image');
  removeCanonical();
  upsertJsonLd(JSON_LD_SCRIPT_ID, null);
}
