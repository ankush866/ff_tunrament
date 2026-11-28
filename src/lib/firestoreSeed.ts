import { doc, getDoc, getDocs, collection, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  site_name: 'Vlexa',
  upi_id: 'flaxy.esports@icici',
  whatsapp_number: '+91 99999 88888',
  whatsapp_url: 'https://wa.me/919999988888',
  support_email: '',
  contact_phone: '+91 98765 43210',
  payment_qr_url:
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dflaxy.esports%40icici%26pn%3DFlaxy%2520Esports%26cu%3DINR',
  site_tagline: 'Vlexa – Free Fire Tournament Management Platform',
  site_description:
    'Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by Ankush Sharma, featuring competitive matches, live room schedules & rankings.',
  site_logo: '',
  default_timezone: 'Asia/Kolkata',
  maintenance_mode: 'false',
  registration_enabled: 'true',
  primary_theme_color: '#f97316',
  secondary_theme_color: '#ef4444',
  background_theme_color: '#090d16',
  scoring_rules:
    '{"placement_points":{"1":12,"2":9,"3":8,"4":7,"5":6,"6":5,"7":4,"8":3,"9":2,"10":1},"kill_point":1}',
  footer_text:
    '© 2026 Vlexa. All rights reserved. Founded & Developed by Ankush Sharma. Free Fire is a registered trademark of Garena.',
  social_instagram: '',
  social_youtube: '',
  social_discord: '',
  social_telegram: '',
  founder_name: 'Ankush Sharma',
  founder_role: 'Founder & Developer of Vlexa',
  founder_profession: 'Self-taught Aspiring Full-Stack Developer',
  founder_bio:
    'Vlexa is an independently developed Free Fire Tournament Management Platform created to give mobile esports players a structured, transparent arena for competitive Solo, Duo, and Squad matches, live room scheduling, slot tracking, and match results.',
  founder_photo_url: '',
  founder_linkedin: 'https://www.linkedin.com/in/ankush-sharma-4a9911414/',
  founder_github: 'https://github.com/ankush866',
  founder_website: 'https://ff-tunrament-4.onrender.com/'
};

const nowPlusHours = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

export const DEFAULT_TOURNAMENTS = [
  {
    id: '1',
    title: 'Bermuda Pro League Clash #42',
    slug: 'bermuda-pro-league-clash-42',
    banner_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
    game_mode: 'Solo',
    map_name: 'Bermuda',
    entry_fee: 50,
    prize_pool: 3500,
    total_slots: 48,
    available_slots: 48,
    reg_open_at: nowPlusHours(-12),
    reg_close_at: nowPlusHours(4),
    match_at: nowPlusHours(5),
    rules_text:
      '1. Classic Battle Royale Solo.\n2. Mobile devices only (No emulators).\n3. Teaming up is strictly prohibited.\n4. Room ID & Password unlock 15 minutes before match.',
    status: 'Registration Open',
    is_published: 1
  },
  {
    id: '2',
    title: 'Purgatory Duo Fury Championship',
    slug: 'purgatory-duo-fury-championship',
    banner_image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
    game_mode: 'Duo',
    map_name: 'Purgatory',
    entry_fee: 80,
    prize_pool: 5000,
    total_slots: 24,
    available_slots: 24,
    reg_open_at: nowPlusHours(-6),
    reg_close_at: nowPlusHours(8),
    match_at: nowPlusHours(9),
    rules_text:
      '1. Classic Duo Battle Royale.\n2. Both players must join the custom room before close.\n3. Gun attributes are active.',
    status: 'Registration Open',
    is_published: 1
  },
  {
    id: '3',
    title: 'Kalahari Sniper Elite Solo',
    slug: 'kalahari-sniper-elite-solo',
    banner_image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
    game_mode: 'Solo',
    map_name: 'Kalahari',
    entry_fee: 40,
    prize_pool: 4500,
    total_slots: 48,
    available_slots: 48,
    reg_open_at: nowPlusHours(2),
    reg_close_at: nowPlusHours(24),
    match_at: nowPlusHours(25),
    rules_text: 'High tier snipers, high elevation battles. Standard competitive rules apply.',
    status: 'Upcoming',
    is_published: 1
  },
  {
    id: '4',
    title: 'Bermuda Mega Showdown #38',
    slug: 'bermuda-mega-showdown-38',
    banner_image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800',
    game_mode: 'Solo',
    map_name: 'Bermuda',
    entry_fee: 50,
    prize_pool: 10000,
    total_slots: 48,
    available_slots: 0,
    reg_open_at: nowPlusHours(-48),
    reg_close_at: nowPlusHours(-25),
    match_at: nowPlusHours(-24),
    rules_text: 'Tournament completed. Prizes distributed to winners via UPI.',
    status: 'Completed',
    is_published: 1
  }
];

export const DEFAULT_ROOMS = [
  {
    tournament_id: '1',
    opening_time: nowPlusHours(4.75),
    match_start_time: nowPlusHours(5),
    closing_time: nowPlusHours(5.5),
    status: 'scheduled',
    is_published: 1,
    room_id_code: '8492041',
    room_password: 'FLAXY99'
  },
  {
    tournament_id: '2',
    opening_time: nowPlusHours(8.75),
    match_start_time: nowPlusHours(9),
    closing_time: nowPlusHours(9.5),
    status: 'scheduled',
    is_published: 1,
    room_id_code: '9921473',
    room_password: 'SURVIVE'
  }
];

export const DEFAULT_FAQS = [
  {
    id: '1',
    category: 'Payments',
    question: 'How do I pay the tournament entry fee via UPI?',
    answer:
      'Click Join Match, scan the UPI QR code using PhonePe, Google Pay, or Paytm, enter your 12-digit UTR number and WhatsApp, attach your screenshot, and submit for Admin verification.',
    sort_order: 1,
    is_published: 1
  },
  {
    id: '2',
    category: 'Room Credentials',
    question: 'When and where will I get the Room ID and Password?',
    answer:
      'Once Admin approves your payment, your Room ID and Password unlock automatically on the Live Room tab at the scheduled opening time.',
    sort_order: 2,
    is_published: 1
  },
  {
    id: '3',
    category: 'Rules & Devices',
    question: 'Are PC or laptop emulators allowed?',
    answer: 'No. All Vlexa tournaments are strictly mobile-only (Android / iOS).',
    sort_order: 3,
    is_published: 1
  },
  {
    id: '4',
    category: 'Prizes',
    question: 'How soon are cash prizes transferred?',
    answer: 'Prizes are transferred via UPI within 2 hours of official match result verification.',
    sort_order: 4,
    is_published: 1
  }
];

export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Daily Solo & Duo Free Fire Matches Open!',
    content: 'Pay via UPI, upload your screenshot + UTR, and unlock Room ID automatically.',
    banner_type: 'urgent',
    is_banner_visible: 1,
    is_published: 1
  },
  {
    id: '2',
    title: 'Strict Mobile Verification Active',
    content: 'Emulators will be permanently banned. Play fair and respect competitive integrity.',
    banner_type: 'info',
    is_banner_visible: 1,
    is_published: 1
  }
];

export const DEFAULT_NAVIGATION = [
  { id: '1', label: 'Home', url: '/', target: '_self', sort_order: 1, is_visible: 1, is_footer: 0 },
  { id: '2', label: 'Tournaments', url: '/tournaments', target: '_self', sort_order: 2, is_visible: 1, is_footer: 0 },
  { id: '3', label: 'Live Rooms', url: '/live-rooms', target: '_self', sort_order: 3, is_visible: 1, is_footer: 0 },
  { id: '4', label: 'Leaderboard', url: '/leaderboard', target: '_self', sort_order: 4, is_visible: 1, is_footer: 0 },
  { id: '5', label: 'Rules', url: '/page/tournament-rules', target: '_self', sort_order: 5, is_visible: 1, is_footer: 0 },
  { id: '6', label: 'FAQ', url: '/faq', target: '_self', sort_order: 6, is_visible: 1, is_footer: 0 },
  { id: '7', label: 'About Us', url: '/page/about-us', target: '_self', sort_order: 1, is_visible: 1, is_footer: 1 },
  { id: '8', label: 'Privacy Policy', url: '/page/privacy-policy', target: '_self', sort_order: 2, is_visible: 1, is_footer: 1 },
  { id: '9', label: 'Terms & Conditions', url: '/page/terms-and-conditions', target: '_self', sort_order: 3, is_visible: 1, is_footer: 1 },
  { id: '10', label: 'Refund Policy', url: '/page/refund-policy', target: '_self', sort_order: 4, is_visible: 1, is_footer: 1 },
  { id: '11', label: 'Fair Play Policy', url: '/page/fair-play-policy', target: '_self', sort_order: 5, is_visible: 1, is_footer: 1 },
  { id: '12', label: 'Contact Us', url: '/page/contact-us', target: '_self', sort_order: 6, is_visible: 1, is_footer: 1 }
];

export const DEFAULT_PAGES = [
  {
    id: '1',
    title: 'About Us',
    slug: 'about-us',
    content: '<h2>Welcome to Vlexa</h2><p>Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by Ankush Sharma.</p>',
    meta_title: 'About Vlexa – Free Fire Tournament Platform',
    meta_description: 'About Vlexa, an independently developed Free Fire competitive tournament platform.',
    is_published: 1,
    is_system: 1,
    version: 1
  },
  {
    id: '2',
    title: 'Contact Us',
    slug: 'contact-us',
    content: '<h2>Contact Support</h2><p>Reach Vlexa support via Support Tickets inside your dashboard or WhatsApp helpline.</p>',
    meta_title: 'Contact Support | Vlexa',
    meta_description: 'Contact support for Vlexa tournaments.',
    is_published: 1,
    is_system: 1,
    version: 1
  },
  {
    id: '3',
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    content: '<h2>Privacy Policy</h2><p>Your Vlexa account info and UPI receipts are protected under security rules and used only for tournament verification.</p>',
    meta_title: 'Privacy Policy | Vlexa',
    meta_description: 'Read how Vlexa handles tournament registration data and player privacy.',
    is_published: 1,
    is_system: 1,
    version: 1
  },
  {
    id: '4',
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    content: '<h2>Terms & Conditions</h2><p>Slots are confirmed after Admin UPI verification on Vlexa. Sharing Room IDs with non-participants leads to disqualification.</p>',
    meta_title: 'Terms & Conditions | Vlexa',
    meta_description: 'Review official platform terms and conditions for participating on Vlexa.',
    is_published: 1,
    is_system: 1,
    version: 1
  },
  {
    id: '5',
    title: 'Refund Policy',
    slug: 'refund-policy',
    content: '<h2>Refund Policy</h2><p>Full refunds are issued within 24 hours if a match is cancelled by Vlexa organizers.</p>',
    meta_title: 'Refund Policy | Vlexa',
    meta_description: 'Understand match cancellation and entry fee refund guidelines on Vlexa.',
    is_published: 1,
    is_system: 1,
    version: 1
  },
  {
    id: '6',
    title: 'Tournament Rules',
    slug: 'tournament-rules',
    content: '<h2>Official Free Fire Rules</h2><ul><li>1st Place (Booyah): 12 pts, 2nd: 9 pts, 3rd: 8 pts + 1 pt/kill.</li><li>Mobile only. No emulators or scripts.</li></ul>',
    meta_title: 'Tournament Rules & Fair Play | Vlexa',
    meta_description: 'Read official Free Fire mobile tournament rules and fair play policies on Vlexa.',
    is_published: 1,
    is_system: 1,
    version: 1
  },
  {
    id: '7',
    title: 'Fair Play Policy',
    slug: 'fair-play-policy',
    content: '<h2>Fair Play & Anti-Cheat</h2><p>Vlexa enforces a strict zero-tolerance policy against aimbots, wallhacks, teaming, and PC emulators.</p>',
    meta_title: 'Fair Play & Anti-Cheat Policy | Vlexa',
    meta_description: 'Review Vlexa fair play standards and zero-tolerance anti-cheat guidelines for Free Fire.',
    is_published: 1,
    is_system: 1,
    version: 1
  }
];

export const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: '1', section_key: 'hero', title: 'DOMINATE THE BATTLEFIELD', subtitle: 'Free Fire Esports Tournaments', content_json: '{}', sort_order: 1, is_enabled: 1 },
  { id: '2', section_key: 'stats', title: 'Live Arena Stats', subtitle: 'Real player participation', content_json: '{}', sort_order: 2, is_enabled: 1 },
  { id: '3', section_key: 'featured_tournaments', title: 'Featured Matches', subtitle: 'Solo & Duo contests', content_json: '{}', sort_order: 3, is_enabled: 1 },
  { id: '4', section_key: 'faq_preview', title: 'Common Questions', subtitle: 'Payments & Room ID guide', content_json: '{}', sort_order: 4, is_enabled: 1 }
];

export const DEFAULT_LEADERBOARD = [
  {
    id: '1',
    user_id: 'seed_p1',
    player_name: 'Aakash Roy',
    free_fire_ign: 'AK_DESTROYER',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    total_matches: 14,
    wins: 6,
    total_kills: 89,
    total_points: 210,
    total_earnings: 18500
  },
  {
    id: '2',
    user_id: 'seed_p2',
    player_name: 'Vikram Seth',
    free_fire_ign: 'AWM_SNIPER99',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    total_matches: 16,
    wins: 4,
    total_kills: 76,
    total_points: 185,
    total_earnings: 12000
  },
  {
    id: '3',
    user_id: 'seed_p3',
    player_name: 'Karan Johal',
    free_fire_ign: 'MP40_GOD',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    total_matches: 12,
    wins: 3,
    total_kills: 64,
    total_points: 152,
    total_earnings: 9500
  }
];

let seedPromise: Promise<void> | null = null;

/**
 * Safely seeds missing initial records into Firestore ONLY when called by a verified Super Admin,
 * and ONLY for collections/documents that do not exist yet (never overwrites user-edited records).
 */
export async function ensureFirestoreSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'public'));
      if (!settingsSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'settings', 'public'), {
          ...DEFAULT_SITE_SETTINGS,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await batch.commit();
      }

      const tourSnap = await getDocs(collection(db, 'tournaments'));
      if (tourSnap.empty) {
        const batch = writeBatch(db);
        for (const t of DEFAULT_TOURNAMENTS) {
          batch.set(doc(db, 'tournaments', t.id), {
            ...t,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        for (const r of DEFAULT_ROOMS) {
          batch.set(doc(db, 'rooms', r.tournament_id), {
            tournament_id: r.tournament_id,
            opening_time: r.opening_time,
            match_start_time: r.match_start_time,
            closing_time: r.closing_time,
            opening_at: Timestamp.fromDate(new Date(r.opening_time)),
            status: r.status,
            is_published: r.is_published,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          batch.set(doc(db, 'room_secrets', r.tournament_id), {
            tournament_id: r.tournament_id,
            room_id_code: r.room_id_code,
            room_password: r.room_password,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }

      const faqSnap = await getDocs(collection(db, 'faqs'));
      if (faqSnap.empty) {
        const batch = writeBatch(db);
        for (const f of DEFAULT_FAQS) {
          batch.set(doc(db, 'faqs', f.id), {
            ...f,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        for (const a of DEFAULT_ANNOUNCEMENTS) {
          batch.set(doc(db, 'announcements', a.id), {
            ...a,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        for (const nav of DEFAULT_NAVIGATION) {
          batch.set(doc(db, 'navigation_items', nav.id), {
            ...nav,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        for (const sec of DEFAULT_HOMEPAGE_SECTIONS) {
          batch.set(doc(db, 'homepage_sections', sec.id), {
            ...sec,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        for (const l of DEFAULT_LEADERBOARD) {
          batch.set(doc(db, 'leaderboard', l.id), {
            ...l,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }

      const pagesSnap = await getDocs(collection(db, 'website_pages'));
      if (pagesSnap.empty) {
        const batch = writeBatch(db);
        for (const p of DEFAULT_PAGES) {
          batch.set(doc(db, 'website_pages', p.id), {
            ...p,
            og_title: p.meta_title,
            og_description: p.meta_description,
            og_image: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('Initial Firestore seed check skipped or deferred:', err);
    }
  })();
  return seedPromise;
}
