import defaultMatchBanner from '../assets/images/default_match_banner_1795012798300.jpg';
import defaultPlayerAvatar from '../assets/images/default_player_avatar_1795012797771.jpg';

export const DEFAULT_MATCH_BANNER = defaultMatchBanner;
export const DEFAULT_PLAYER_AVATAR = defaultPlayerAvatar;

export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  let clean = url.trim();
  if (!clean) return '';

  // Support Google Drive share links directly
  const gdriveFileMatch = clean.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (gdriveFileMatch && gdriveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveFileMatch[1]}`;
  }
  const gdriveOpenMatch = clean.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (gdriveOpenMatch && gdriveOpenMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveOpenMatch[1]}`;
  }

  if (
    !clean.startsWith('http://') &&
    !clean.startsWith('https://') &&
    !clean.startsWith('data:image/') &&
    !clean.startsWith('/')
  ) {
    clean = `https://${clean}`;
  }
  return clean;
}

export function getSafeImageUrl(url?: string | null, fallback: string = DEFAULT_MATCH_BANNER): string {
  const normalized = normalizeImageUrl(url);
  if (!normalized) {
    return fallback;
  }
  return normalized;
}
