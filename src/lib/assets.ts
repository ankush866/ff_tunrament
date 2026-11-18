import defaultMatchBanner from '../assets/images/default_match_banner_1795012798300.jpg';
import defaultPlayerAvatar from '../assets/images/default_player_avatar_1795012797771.jpg';

export const DEFAULT_MATCH_BANNER = defaultMatchBanner;
export const DEFAULT_PLAYER_AVATAR = defaultPlayerAvatar;

export function getSafeImageUrl(url?: string | null, fallback: string = DEFAULT_MATCH_BANNER): string {
  if (!url || !url.trim() || url.includes('images.unsplash.com')) {
    return fallback;
  }
  return url;
}
