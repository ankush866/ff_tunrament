// Flaxy Esports Firebase Firestore API Layer & Formatting Utilities
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth, SUPER_ADMIN_EMAIL, OperationType, handleFirestoreError, compressImageDataUrl } from './firebase.js';
import {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_TOURNAMENTS,
  DEFAULT_ROOMS,
  DEFAULT_FAQS,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_NAVIGATION,
  DEFAULT_PAGES,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_LEADERBOARD
} from './firestoreSeed.js';

export function getToken(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

export function setToken(_token: string | null) {
  // Managed automatically by Firebase Authentication
}

function genId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function toIso(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return '';
}

function serializeDoc(d: { id: string; data: () => Record<string, any> }): Record<string, any> & {
  id: string;
  created_at: string;
  updated_at: string;
} {
  const raw = d.data() || {};
  return {
    ...raw,
    id: raw.id || d.id,
    created_at: toIso(raw.createdAt) || raw.created_at || '',
    updated_at: toIso(raw.updatedAt) || raw.updated_at || ''
  };
}

function sanitizeStr(val: any, maxLen: number): string {
  if (val === null || val === undefined) return '';
  return String(val).slice(0, maxLen);
}

function slugify(text: string): string {
  return String(text || 'item')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';
}

async function getCurrentRole(): Promise<string> {
  const cu = auth.currentUser;
  if (!cu) return 'user';
  if (cu.email?.toLowerCase() === SUPER_ADMIN_EMAIL && cu.emailVerified) {
    return 'super_admin';
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', cu.uid));
    if (adminSnap.exists()) {
      return adminSnap.data().role || 'user';
    }
  } catch {
    // Not an admin
  }
  return 'user';
}

function isStaffRole(role: string, allowed?: string[]): boolean {
  if (role === 'super_admin') return true;
  if (allowed) return allowed.includes(role);
  return ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'].includes(role);
}

async function logAdminAction(action: string, details: string) {
  const cu = auth.currentUser;
  if (!cu) return;
  try {
    const logId = genId('log');
    await setDoc(doc(db, 'admin_activity_logs', logId), {
      id: logId,
      admin_id: cu.uid,
      admin_name: sanitizeStr(cu.displayName || cu.email?.split('@')[0] || 'Admin', 100),
      action: sanitizeStr(action, 100),
      details: sanitizeStr(details, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch {
    // Non-blocking audit log
  }
}

function requireAuthUid(): string {
  const cu = auth.currentUser;
  if (!cu) {
    throw new Error('Authentication required. Please sign in with Google.');
  }
  return cu.uid;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const [rawPath, queryStr = ''] = endpoint.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(queryStr);

  // ---------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------
  if (path === '/settings/public' && method === 'GET') {
    const p = 'settings/public';
    try {
      const snap = await getDoc(doc(db, 'settings', 'public'));
      if (!snap.exists()) {
        return { settings: { ...DEFAULT_SITE_SETTINGS } } as T;
      }
      const data = snap.data();
      const merged: Record<string, string> = { ...DEFAULT_SITE_SETTINGS };
      for (const k of Object.keys(DEFAULT_SITE_SETTINGS)) {
        if (typeof data[k] === 'string') merged[k] = data[k];
      }
      return { settings: merged } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, p);
    }
  }

  if (path === '/admin/settings' && method === 'PUT') {
    requireAuthUid();
    const role = await getCurrentRole();
    if (role !== 'super_admin') throw new Error('Super Admin permission required.');
    const incomingSettings = body.settings || {};
    const p = 'settings/public';
    try {
      const ref = doc(db, 'settings', 'public');
      const existingSnap = await getDoc(ref);
      const allowedKeys = Object.keys(DEFAULT_SITE_SETTINGS);
      const cleanPayload: Record<string, any> = {};
      for (const k of allowedKeys) {
        const rawVal = incomingSettings[k] ?? (existingSnap.exists() ? existingSnap.data()[k] : DEFAULT_SITE_SETTINGS[k]) ?? '';
        if ((k === 'payment_qr_url' || k === 'site_logo' || k === 'founder_photo_url') && String(rawVal).startsWith('data:image/')) {
          cleanPayload[k] = await compressImageDataUrl(String(rawVal), 600, 0.72);
        } else {
          const maxLenMap: Record<string, number> = {
            site_name: 150,
            upi_id: 128,
            whatsapp_number: 32,
            whatsapp_url: 300,
            support_email: 150,
            contact_phone: 32,
            payment_qr_url: 350000,
            site_tagline: 300,
            site_description: 1000,
            site_logo: 350000,
            default_timezone: 64,
            maintenance_mode: 16,
            registration_enabled: 16,
            primary_theme_color: 32,
            secondary_theme_color: 32,
            background_theme_color: 32,
            scoring_rules: 2000,
            footer_text: 500,
            social_instagram: 300,
            social_youtube: 300,
            social_discord: 300,
            social_telegram: 300,
            founder_name: 150,
            founder_role: 200,
            founder_profession: 200,
            founder_bio: 3000,
            founder_photo_url: 350000,
            founder_linkedin: 300,
            founder_github: 300,
            founder_website: 300
          };
          cleanPayload[k] = sanitizeStr(rawVal, maxLenMap[k] ?? 500);
        }
      }
      if (!cleanPayload.site_name) cleanPayload.site_name = DEFAULT_SITE_SETTINGS.site_name;
      if (!cleanPayload.upi_id) cleanPayload.upi_id = DEFAULT_SITE_SETTINGS.upi_id;

      if (existingSnap.exists()) {
        await updateDoc(ref, {
          ...cleanPayload,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(ref, {
          ...cleanPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await logAdminAction('UPDATE_SETTINGS', 'Updated global website, UPI & social settings');
      return { success: true, settings: cleanPayload } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, p);
    }
  }

  // ---------------------------------------------------------
  // PUBLIC STATS
  // ---------------------------------------------------------
  if (path === '/stats/public' && method === 'GET') {
    try {
      const [tSnap, regSnap, resSnap] = await Promise.all([
        getDocs(query(collection(db, 'tournaments'), where('is_published', '==', 1))),
        getDocs(query(collection(db, 'registrations'), where('payment_status', 'in', ['approved', 'pending']))),
        getDocs(query(collection(db, 'results'), where('rank', '>=', 1)))
      ]);
      const list = tSnap.empty ? DEFAULT_TOURNAMENTS : tSnap.docs.map(serializeDoc);
      const active = list.filter((t) => t.status === 'Registration Open' || t.status === 'Live');
      const completed = list.filter((t) => t.status === 'Completed');
      const activePrizePool = active.reduce((sum, t) => sum + Number(t.prize_pool || 0), 0);
      const verifiedPayouts = resSnap.docs.reduce((sum, d) => sum + Number(d.data().prize_amount || 0), 0);
      const uniquePlayers = new Set(regSnap.docs.map((d) => String(d.data().user_id || d.id))).size;
      return {
        registeredWarriors: uniquePlayers,
        tournamentsCompleted: completed.length,
        activeMatches: active.length,
        verifiedPayouts,
        activePrizePool
      } as T;
    } catch {
      return {
        registeredWarriors: 0,
        tournamentsCompleted: 0,
        activeMatches: 0,
        verifiedPayouts: 0,
        activePrizePool: 0
      } as T;
    }
  }

  // ---------------------------------------------------------
  // TOURNAMENTS
  // ---------------------------------------------------------
  if (path === '/tournaments' && method === 'GET') {
    const modeFilter = searchParams.get('mode');
    const statusFilter = searchParams.get('status');
    const role = await getCurrentRole();
    const p = 'tournaments';
    try {
      const q = isStaffRole(role, ['super_admin', 'tournament_manager'])
        ? collection(db, 'tournaments')
        : query(collection(db, 'tournaments'), where('is_published', '==', 1));
      const snap = await getDocs(q);
      let items: any[] = snap.empty && !isStaffRole(role) ? [...DEFAULT_TOURNAMENTS] : snap.docs.map(serializeDoc);
      if (modeFilter && modeFilter !== 'All') {
        items = items.filter((t) => t.game_mode === modeFilter);
      }
      if (statusFilter && statusFilter !== 'All') {
        items = items.filter((t) => t.status === statusFilter);
      }
      items.sort((a, b) => String(b.match_at || '').localeCompare(String(a.match_at || '')));
      return { tournaments: items } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
    }
  }

  const tDetailMatch = path.match(/^\/tournaments\/([^/]+)$/);
  if (tDetailMatch && method === 'GET') {
    const tid = decodeURIComponent(tDetailMatch[1]);
    const p = `tournaments/${tid}`;
    try {
      const tSnap = await getDoc(doc(db, 'tournaments', tid));
      let tournament = tSnap.exists() ? serializeDoc(tSnap) : DEFAULT_TOURNAMENTS.find((d) => d.id === tid) || null;
      if (!tournament) {
        throw new Error('Tournament not found.');
      }

      let room: any = null;
      try {
        const rSnap = await getDoc(doc(db, 'rooms', tid));
        if (rSnap.exists()) room = serializeDoc(rSnap);
      } catch {
        room = null;
      }

      let registration: any = null;
      const cu = auth.currentUser;
      if (cu) {
        const regId = `${tid}_${cu.uid}`;
        const regSnap = await getDoc(doc(db, 'registrations', regId));
        if (regSnap.exists()) {
          registration = serializeDoc(regSnap);
          // Attach user's own payment UTR safely from private /payments
          try {
            const pSnap = await getDocs(query(collection(db, 'payments'), where('user_id', '==', cu.uid)));
            const matchedPay = pSnap.docs
              .map(serializeDoc)
              .find((pay) => pay.tournament_id === tid);
            if (matchedPay) {
              registration.transaction_ref = matchedPay.transaction_ref;
            }
          } catch {
            // Ignored
          }
        }
      }

      const registeredCount = Math.max(0, Number(tournament.total_slots || 0) - Number(tournament.available_slots || 0));
      return { tournament, room, registration, registeredCount } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, p);
    }
  }

  const tRegisterMatch = path.match(/^\/tournaments\/([^/]+)\/register$/);
  if (tRegisterMatch && method === 'POST') {
    const tid = decodeURIComponent(tRegisterMatch[1]);
    const uid = requireAuthUid();
    const regId = `${tid}_${uid}`;
    const p = `registrations/${regId}`;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const uData = userSnap.exists() ? userSnap.data() : {};
      const result = await runTransaction(db, async (tx) => {
        const tRef = doc(db, 'tournaments', tid);
        const rRef = doc(db, 'registrations', regId);
        const tSnap = await tx.get(tRef);
        if (!tSnap.exists()) throw new Error('Match not found.');
        const existingReg = await tx.get(rRef);
        if (existingReg.exists()) {
          const d = existingReg.data();
          return {
            success: true,
            registrationId: regId,
            slotNumber: d.slot_number || 1,
            paymentRequired: Number(tSnap.data().entry_fee || 0) > 0 && d.payment_status !== 'approved',
            entryFee: Number(tSnap.data().entry_fee || 0)
          };
        }
        const tData = tSnap.data();
        if (tData.status !== 'Registration Open') throw new Error('Registration is closed for this match.');
        const avail = Number(tData.available_slots || 0);
        if (avail <= 0) throw new Error('All slots are full.');
        const total = Number(tData.total_slots || 48);
        const slotNumber = Math.max(1, total - avail + 1);
        const entryFee = Number(tData.entry_fee || 0);
        const paymentStatus = entryFee === 0 ? 'approved' : 'pending';

        tx.update(tRef, {
          available_slots: avail - 1,
          updatedAt: serverTimestamp()
        });

        const regPayload: Record<string, any> = {
          id: regId,
          tournament_id: tid,
          user_id: uid,
          username: sanitizeStr(uData.username || auth.currentUser?.displayName || 'Player', 64),
          free_fire_uid: sanitizeStr(uData.free_fire_uid || '', 32),
          free_fire_ign: sanitizeStr(uData.free_fire_ign || '', 64),
          slot_number: slotNumber,
          payment_status: paymentStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (body.team_id) {
          regPayload.team_id = sanitizeStr(body.team_id, 128);
        }
        tx.set(rRef, regPayload);

        return {
          success: true,
          registrationId: regId,
          slotNumber,
          paymentRequired: entryFee > 0,
          entryFee
        };
      });
      return result as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, p);
    }
  }

  // ---------------------------------------------------------
  // ROOM SCHEDULE & GATED CREDENTIALS
  // ---------------------------------------------------------
  const roomMatch = path.match(/^\/rooms\/([^/]+)$/);
  if (roomMatch && method === 'GET') {
    const tid = decodeURIComponent(roomMatch[1]);
    const p = `rooms/${tid}`;
    try {
      const rSnap = await getDoc(doc(db, 'rooms', tid));
      const fallbackRoom = DEFAULT_ROOMS.find((r) => r.tournament_id === tid);
      if (!rSnap.exists() && !fallbackRoom) {
        return { locked: true, reason: 'Room not scheduled yet.' } as T;
      }
      const room = rSnap.exists()
        ? serializeDoc(rSnap)
        : { ...fallbackRoom, room_id_code: '', room_password: '' };

      const cu = auth.currentUser;
      const role = await getCurrentRole();
      const isStaff = isStaffRole(role, ['super_admin', 'tournament_manager']);
      let canUnlock = isStaff;

      if (!canUnlock && cu) {
        const regSnap = await getDoc(doc(db, 'registrations', `${tid}_${cu.uid}`));
        const isApproved = regSnap.exists() && regSnap.data().payment_status === 'approved';
        const openMs = room.opening_time ? new Date(room.opening_time).getTime() : Infinity;
        const isTimeOpen = Date.now() >= openMs || room.status === 'open' || room.status === 'live';
        if (isApproved && isTimeOpen) {
          canUnlock = true;
        }
      }

      if (canUnlock) {
        try {
          const secSnap = await getDoc(doc(db, 'room_secrets', tid));
          if (secSnap.exists()) {
            const s = secSnap.data();
            return {
              ...room,
              room_id_code: s.room_id_code || '',
              room_password: s.room_password || '',
              locked: false
            } as T;
          }
        } catch (secErr) {
          if (isStaff) {
            handleFirestoreError(secErr, OperationType.GET, `room_secrets/${tid}`);
          }
        }
      }

      return {
        ...room,
        room_id_code: '',
        room_password: '',
        locked: true,
        reason: cu ? 'Credentials unlock when payment is approved and room timer opens.' : 'Sign in to view room access.'
      } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, p);
    }
  }

  // ---------------------------------------------------------
  // PAYMENTS
  // ---------------------------------------------------------
  if (path === '/payments/submit' && method === 'POST') {
    const uid = requireAuthUid();
    const p = 'payments';
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const uData = userSnap.exists() ? userSnap.data() : {};
      const tid = sanitizeStr(body.tournament_id, 128);
      const tSnap = await getDoc(doc(db, 'tournaments', tid));
      const tTitle = tSnap.exists() ? tSnap.data().title : 'Free Fire Match';
      const regId = sanitizeStr(body.registration_id || `${tid}_${uid}`, 260);
      const payId = genId('pay');
      const compressedScreenshot = body.screenshot_url
        ? await compressImageDataUrl(String(body.screenshot_url), 800, 0.68)
        : '';

      const batch = writeBatch(db);
      batch.set(doc(db, 'payments', payId), {
        id: payId,
        registration_id: regId,
        user_id: uid,
        username: sanitizeStr(uData.username || auth.currentUser?.displayName || 'Player', 64),
        free_fire_uid: sanitizeStr(uData.free_fire_uid || '', 32),
        free_fire_ign: sanitizeStr(uData.free_fire_ign || '', 64),
        tournament_id: tid,
        tournament_title: sanitizeStr(tTitle, 160),
        amount: Number(body.amount || 0),
        upi_id: sanitizeStr(body.upi_id || '', 128),
        transaction_ref: sanitizeStr(body.transaction_ref || '', 128),
        screenshot_url: compressedScreenshot,
        whatsapp_number: sanitizeStr(body.whatsapp_number || '', 32),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const notifId = genId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        user_id: uid,
        title: 'Payment Submitted For Approval',
        message: `UTR ${sanitizeStr(body.transaction_ref, 64)} submitted for ${sanitizeStr(tTitle, 80)}. Admin will verify shortly.`,
        type: 'payment',
        is_read: 0,
        link_url: '/wallet',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return { success: true, paymentId: payId } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, p);
    }
  }

  if (path === '/payments/my' && method === 'GET') {
    const uid = requireAuthUid();
    const p = 'payments';
    try {
      const snap = await getDocs(query(collection(db, 'payments'), where('user_id', '==', uid)));
      const payments = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { payments } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
    }
  }

  // ---------------------------------------------------------
  // USER MATCHES & RESULTS
  // ---------------------------------------------------------
  const resTourMatch = path.match(/^\/results\/tournament\/([^/]+)$/);
  if (resTourMatch && method === 'GET') {
    const tid = decodeURIComponent(resTourMatch[1]);
    const p = 'results';
    try {
      const snap = await getDocs(query(collection(db, 'results'), where('tournament_id', '==', tid)));
      const results = snap.docs
        .map(serializeDoc)
        .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
      return { results } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, p);
    }
  }

  if (path === '/user/matches' && method === 'GET') {
    const uid = requireAuthUid();
    try {
      const resSnap = await getDocs(query(collection(db, 'results'), where('user_id', '==', uid)));
      const userResults = resSnap.docs.map(serializeDoc);
      const tSnap = await getDocs(query(collection(db, 'tournaments'), where('is_published', '==', 1)));
      const tMap = new Map(tSnap.docs.map((d) => [d.id, serializeDoc(d)]));

      const matches: any[] = userResults.map((r: any) => {
        const t: any = tMap.get(r.tournament_id) || {};
        return {
          ...r,
          title: t.title || 'Tournament Match',
          banner_image: t.banner_image || '',
          game_mode: t.game_mode || 'Solo',
          match_at: t.match_at || r.created_at
        };
      });

      const stats = {
        total_matches: matches.length,
        wins: matches.filter((m) => Number(m.rank) === 1).length,
        top_3: matches.filter((m) => Number(m.rank) >= 1 && Number(m.rank) <= 3).length,
        total_kills: matches.reduce((sum, m) => sum + Number(m.kills || 0), 0),
        total_prize_won: matches.reduce((sum, m) => sum + Number(m.prize_amount || 0), 0)
      };
      return { matches, stats } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'results');
    }
  }

  // ---------------------------------------------------------
  // LEADERBOARD, FAQS, ANNOUNCEMENTS, CMS PUBLIC
  // ---------------------------------------------------------
  if (path === '/leaderboard' && method === 'GET') {
    try {
      const snap = await getDocs(collection(db, 'leaderboard'));
      const leaderboard = (snap.empty ? DEFAULT_LEADERBOARD : snap.docs.map(serializeDoc)).sort(
        (a, b) => Number(b.total_points || 0) - Number(a.total_points || 0)
      );
      return { leaderboard } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'leaderboard');
    }
  }

  if ((path === '/faqs' || path === '/admin/faqs') && method === 'GET') {
    const role = await getCurrentRole();
    try {
      const q = isStaffRole(role, ['super_admin', 'content_manager'])
        ? collection(db, 'faqs')
        : query(collection(db, 'faqs'), where('is_published', '==', 1));
      const snap = await getDocs(q);
      const faqs = (snap.empty && !isStaffRole(role) ? DEFAULT_FAQS : snap.docs.map(serializeDoc)).sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
      );
      return { faqs } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'faqs');
    }
  }

  if ((path === '/announcements' || path === '/admin/announcements') && method === 'GET') {
    const role = await getCurrentRole();
    try {
      const q = isStaffRole(role, ['super_admin', 'content_manager'])
        ? collection(db, 'announcements')
        : query(collection(db, 'announcements'), where('is_published', '==', 1));
      const snap = await getDocs(q);
      const rawAnn: any[] = snap.empty && !isStaffRole(role) ? [...DEFAULT_ANNOUNCEMENTS] : snap.docs.map(serializeDoc);
      const announcements = rawAnn.sort(
        (a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || ''))
      );
      return { announcements } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'announcements');
    }
  }

  if (path === '/cms/pages' && method === 'GET') {
    const role = await getCurrentRole();
    try {
      const q = isStaffRole(role, ['super_admin', 'content_manager'])
        ? collection(db, 'website_pages')
        : query(collection(db, 'website_pages'), where('is_published', '==', 1));
      const snap = await getDocs(q);
      const pages = (snap.empty && !isStaffRole(role) ? DEFAULT_PAGES : snap.docs.map(serializeDoc)).sort(
        (a, b) => String(a.title).localeCompare(String(b.title))
      );
      return { pages } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'website_pages');
    }
  }

  const pageSlugMatch = path.match(/^\/cms\/pages\/([^/]+)$/);
  if (pageSlugMatch && method === 'GET') {
    const slug = decodeURIComponent(pageSlugMatch[1]);
    try {
      const snap = await getDocs(query(collection(db, 'website_pages'), where('slug', '==', slug), where('is_published', '==', 1)));
      if (!snap.empty) {
        return { page: serializeDoc(snap.docs[0]) } as T;
      }
      const fallback = DEFAULT_PAGES.find((p) => p.slug === slug);
      if (fallback) return { page: fallback } as T;
      throw new Error('Page not found.');
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'website_pages');
    }
  }

  if (path === '/cms/navigation' && method === 'GET') {
    const role = await getCurrentRole();
    try {
      const q = isStaffRole(role, ['super_admin', 'content_manager'])
        ? collection(db, 'navigation_items')
        : query(collection(db, 'navigation_items'), where('is_visible', '==', 1));
      const snap = await getDocs(q);
      const items = (snap.empty && !isStaffRole(role) ? DEFAULT_NAVIGATION : snap.docs.map(serializeDoc)).sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
      );
      return { items } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'navigation_items');
    }
  }

  if (path === '/cms/homepage-sections' && method === 'GET') {
    const role = await getCurrentRole();
    try {
      const q = isStaffRole(role, ['super_admin', 'content_manager'])
        ? collection(db, 'homepage_sections')
        : query(collection(db, 'homepage_sections'), where('is_enabled', '==', 1));
      const snap = await getDocs(q);
      const sections = (snap.empty && !isStaffRole(role) ? DEFAULT_HOMEPAGE_SECTIONS : snap.docs.map(serializeDoc)).sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
      );
      return { sections } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'homepage_sections');
    }
  }

  // ---------------------------------------------------------
  // TEAMS & INVITES
  // ---------------------------------------------------------
  if (path === '/teams/my' && method === 'GET') {
    const uid = requireAuthUid();
    try {
      const tSnap = await getDocs(query(collection(db, 'teams'), where('member_uids', 'array-contains', uid)));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('is_deactivated', '==', false)));
      const uMap = new Map(usersSnap.docs.map((d) => [d.id, serializeDoc(d)]));

      const teams = tSnap.docs.map((d) => {
        const team = serializeDoc(d);
        const members = (team.member_uids || []).map((mUid: string) => {
          const mu: any = uMap.get(mUid) || {};
          return {
            membership_id: mUid,
            user_id: mUid,
            username: mu.username || 'Player',
            free_fire_ign: mu.free_fire_ign || mu.username || 'Player',
            avatar_url: mu.avatar_url || '',
            status: mUid === team.captain_id ? 'captain' : 'accepted'
          };
        });
        return { ...team, members };
      });

      const invSnap = await getDocs(
        query(collection(db, 'team_invites'), where('invited_user_id', '==', uid))
      );
      const pendingInvites = invSnap.docs
        .map(serializeDoc)
        .filter((inv) => inv.status === 'pending')
        .map((inv) => ({ ...inv, invite_id: inv.id }));

      return { teams, pendingInvites } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'teams');
    }
  }

  if (path === '/teams' && method === 'POST') {
    const uid = requireAuthUid();
    const id = genId('team');
    try {
      await setDoc(doc(db, 'teams', id), {
        id,
        name: sanitizeStr(body.name || 'My Team', 64),
        tag: sanitizeStr(body.tag || 'FLX', 12).toUpperCase(),
        captain_id: uid,
        member_uids: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teams/${id}`);
    }
  }

  const teamInvMatch = path.match(/^\/teams\/([^/]+)\/invite$/);
  if (teamInvMatch && method === 'POST') {
    const tid = decodeURIComponent(teamInvMatch[1]);
    const uid = requireAuthUid();
    try {
      const teamSnap = await getDoc(doc(db, 'teams', tid));
      if (!teamSnap.exists()) throw new Error('Team not found.');
      const team = teamSnap.data();
      if ((team.member_uids || []).length >= 2) throw new Error('Duo team already has 2 members.');

      const targetUsername = sanitizeStr(body.username || '', 64).trim().toLowerCase();
      const usersSnap = await getDocs(query(collection(db, 'users'), where('is_deactivated', '==', false)));
      const targetUser = usersSnap.docs.find((d) => String(d.data().username || '').toLowerCase() === targetUsername);
      if (!targetUser) throw new Error(`Player "${body.username}" not found.`);
      if (targetUser.id === uid) throw new Error('Cannot invite yourself.');

      const capSnap = await getDoc(doc(db, 'users', uid));
      const invId = genId('inv');
      await setDoc(doc(db, 'team_invites', invId), {
        id: invId,
        team_id: tid,
        team_name: sanitizeStr(team.name, 64),
        captain_id: uid,
        captain_name: sanitizeStr(capSnap.exists() ? capSnap.data().username : 'Captain', 64),
        invited_user_id: targetUser.id,
        invited_username: sanitizeStr(targetUser.data().username, 64),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, message: `Invitation sent to ${targetUser.data().username}!` } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'team_invites');
    }
  }

  const invRespondMatch = path.match(/^\/teams\/invites\/([^/]+)\/respond$/);
  if (invRespondMatch && method === 'POST') {
    const invId = decodeURIComponent(invRespondMatch[1]);
    const uid = requireAuthUid();
    try {
      const invRef = doc(db, 'team_invites', invId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) throw new Error('Invite not found.');
      const inv = invSnap.data();

      const batch = writeBatch(db);
      batch.update(invRef, {
        status: body.accept ? 'accepted' : 'declined',
        updatedAt: serverTimestamp()
      });

      if (body.accept) {
        const teamRef = doc(db, 'teams', inv.team_id);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const members: string[] = teamSnap.data().member_uids || [];
          if (!members.includes(uid) && members.length < 2) {
            batch.update(teamRef, {
              member_uids: [...members, uid],
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      await batch.commit();
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `team_invites/${invId}`);
    }
  }

  // ---------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------
  if (path === '/notifications' && method === 'GET') {
    const uid = requireAuthUid();
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), where('user_id', '==', uid)));
      const notifications = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const unreadCount = notifications.filter((n) => Number(n.is_read) === 0).length;
      return { notifications, unreadCount } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    }
  }

  const notifReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PUT') {
    const nid = decodeURIComponent(notifReadMatch[1]);
    requireAuthUid();
    try {
      await updateDoc(doc(db, 'notifications', nid), {
        is_read: 1,
        updatedAt: serverTimestamp()
      });
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${nid}`);
    }
  }

  if (path === '/notifications/mark-all-read' && method === 'POST') {
    const uid = requireAuthUid();
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), where('user_id', '==', uid)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        if (Number(d.data().is_read) === 0) {
          batch.update(d.ref, { is_read: 1, updatedAt: serverTimestamp() });
        }
      });
      await batch.commit();
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  }

  // ---------------------------------------------------------
  // SUPPORT TICKETS
  // ---------------------------------------------------------
  if (path === '/tickets/my' && method === 'GET') {
    const uid = requireAuthUid();
    try {
      const snap = await getDocs(query(collection(db, 'support_tickets'), where('user_id', '==', uid)));
      const tickets = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { tickets } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'support_tickets');
    }
  }

  if (path === '/tickets' && method === 'POST') {
    const uid = requireAuthUid();
    const id = genId('tkt');
    try {
      const uSnap = await getDoc(doc(db, 'users', uid));
      const username = uSnap.exists() ? uSnap.data().username : 'Player';
      const ticketCode = `FLX-${Math.floor(10000 + Math.random() * 89999)}`;
      await setDoc(doc(db, 'support_tickets', id), {
        id,
        ticket_code: ticketCode,
        user_id: uid,
        username: sanitizeStr(username, 64),
        category: sanitizeStr(body.category || 'General', 64),
        subject: sanitizeStr(body.subject || 'Help Request', 200),
        message: sanitizeStr(body.message || '', 4000),
        status: 'open',
        priority: 'normal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id, ticket_code: ticketCode } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `support_tickets/${id}`);
    }
  }

  const tktMsgsMatch = path.match(/^\/tickets\/([^/]+)\/messages$/);
  if (tktMsgsMatch && method === 'GET') {
    const tid = decodeURIComponent(tktMsgsMatch[1]);
    const uid = requireAuthUid();
    const role = await getCurrentRole();
    try {
      const repliesCol = collection(db, 'support_tickets', tid, 'replies');
      const q = isStaffRole(role, ['super_admin', 'support_manager'])
        ? repliesCol
        : query(repliesCol, where('ticket_owner_id', '==', uid));
      const snap = await getDocs(q);
      const replies = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return { replies } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `support_tickets/${tid}/replies`);
    }
  }

  const tktReplyMatch = path.match(/^\/tickets\/([^/]+)\/reply$/);
  if (tktReplyMatch && method === 'POST') {
    const tid = decodeURIComponent(tktReplyMatch[1]);
    const uid = requireAuthUid();
    const role = await getCurrentRole();
    const isAdminReply = isStaffRole(role, ['super_admin', 'support_manager']) ? 1 : 0;
    try {
      const tSnap = await getDoc(doc(db, 'support_tickets', tid));
      if (!tSnap.exists()) throw new Error('Ticket not found.');
      const tOwnerId = tSnap.data().user_id;
      const uSnap = await getDoc(doc(db, 'users', uid));
      const username = uSnap.exists() ? uSnap.data().username : 'User';
      const replyId = genId('rep');

      await setDoc(doc(db, 'support_tickets', tid, 'replies', replyId), {
        id: replyId,
        ticket_id: tid,
        ticket_owner_id: tOwnerId,
        user_id: uid,
        username: sanitizeStr(username, 64),
        is_admin: isAdminReply,
        message: sanitizeStr(body.message || '', 4000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: replyId } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `support_tickets/${tid}/replies`);
    }
  }

  // ---------------------------------------------------------
  // ADMIN ENDPOINTS
  // ---------------------------------------------------------
  if (path === '/admin/stats' && method === 'GET') {
    requireAuthUid();
    const role = await getCurrentRole();
    try {
      const [uSnap, tSnap, pSnap, tktSnap] = await Promise.all([
        role === 'super_admin' ? getDocs(collection(db, 'users')) : Promise.resolve({ size: 0 } as any),
        getDocs(collection(db, 'tournaments')),
        isStaffRole(role, ['super_admin', 'payment_manager'])
          ? getDocs(collection(db, 'payments'))
          : Promise.resolve({ docs: [] } as any),
        isStaffRole(role, ['super_admin', 'support_manager'])
          ? getDocs(collection(db, 'support_tickets'))
          : Promise.resolve({ docs: [] } as any)
      ]);

      let recentLogs: any[] = [];
      if (role === 'super_admin') {
        const lSnap = await getDocs(collection(db, 'admin_activity_logs'));
        recentLogs = lSnap.docs
          .map(serializeDoc)
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .slice(0, 10);
      }

      const paymentsList = (pSnap.docs || []).map(serializeDoc);
      const pendingPayments = paymentsList.filter((p: any) => p.status === 'pending').length;
      const approvedPayments = paymentsList.filter((p: any) => p.status === 'approved');
      const totalRevenue = approvedPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const openTickets = (tktSnap.docs || []).filter((d: any) => d.data().status !== 'closed' && d.data().status !== 'resolved').length;

      return {
        totalUsers: uSnap.size || 0,
        totalTournaments: tSnap.size || 0,
        pendingPayments,
        totalRevenue,
        openTickets,
        recentLogs
      } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'admin/stats');
    }
  }

  if (path === '/admin/users' && method === 'GET') {
    requireAuthUid();
    const role = await getCurrentRole();
    if (role !== 'super_admin') throw new Error('Super Admin only.');
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      const users: any[] = await Promise.all(
        uSnap.docs.map(async (d) => {
          const pub: any = serializeDoc(d);
          let email = '';
          let phone = '';
          try {
            const privSnap = await getDoc(doc(db, 'users', d.id, 'private', 'info'));
            if (privSnap.exists()) {
              email = privSnap.data().email || '';
              phone = privSnap.data().phone || '';
            }
          } catch {
            // Ignored
          }
          return { ...pub, email, phone };
        })
      );
      users.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { users } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  }

  const adminUserMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUserMatch && method === 'PUT') {
    const targetUid = decodeURIComponent(adminUserMatch[1]);
    const actorUid = requireAuthUid();
    const role = await getCurrentRole();
    if (role !== 'super_admin') throw new Error('Super Admin only.');
    try {
      const targetRole = sanitizeStr(body.role || 'user', 32);
      const isBlocked = Boolean(body.is_blocked);
      await updateDoc(doc(db, 'users', targetUid), {
        role: targetRole,
        is_blocked: isBlocked,
        updatedAt: serverTimestamp()
      });

      const adminRef = doc(db, 'admins', targetUid);
      const adminSnap = await getDoc(adminRef);
      if (targetRole === 'user') {
        if (adminSnap.exists() && targetUid !== actorUid) {
          await deleteDoc(adminRef);
        }
      } else {
        let email = '';
        try {
          const privSnap = await getDoc(doc(db, 'users', targetUid, 'private', 'info'));
          if (privSnap.exists()) email = privSnap.data().email || '';
        } catch {
          // Ignored
        }
        if (adminSnap.exists()) {
          await updateDoc(adminRef, {
            role: targetRole,
            email,
            assignedBy: actorUid,
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(adminRef, {
            uid: targetUid,
            email,
            role: targetRole,
            assignedBy: actorUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      await logAdminAction('UPDATE_USER', `Updated role=${targetRole}, blocked=${isBlocked} for user ${targetUid}`);
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  }

  if (path === '/admin/tournaments' && method === 'POST') {
    requireAuthUid();
    const id = genId('match');
    try {
      const totalSlots = Number(body.total_slots || 48);
      const rawBanner = String(body.banner_image || '').trim();
      const banner = rawBanner
        ? await compressImageDataUrl(rawBanner, 960, 0.75)
        : '';
      await setDoc(doc(db, 'tournaments', id), {
        id,
        title: sanitizeStr(body.title, 150),
        slug: slugify(body.title),
        banner_image: banner,
        game_mode: body.game_mode || 'Solo',
        map_name: sanitizeStr(body.map_name || 'Bermuda', 64),
        entry_fee: Number(body.entry_fee || 0),
        prize_pool: Number(body.prize_pool || 0),
        total_slots: totalSlots,
        available_slots: Number(body.available_slots ?? totalSlots),
        reg_open_at: sanitizeStr(body.reg_open_at || new Date().toISOString(), 64),
        reg_close_at: sanitizeStr(body.reg_close_at || body.match_at, 64),
        match_at: sanitizeStr(body.match_at, 64),
        rules_text: sanitizeStr(body.rules_text || '', 10000),
        status: body.status || 'Registration Open',
        is_published: Number(body.is_published ?? 1),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await logAdminAction('CREATE_TOURNAMENT', `Created match ${body.title}`);
      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tournaments/${id}`);
    }
  }

  const adminTourMatch = path.match(/^\/admin\/tournaments\/([^/]+)$/);
  if (adminTourMatch && method === 'PUT') {
    const tid = decodeURIComponent(adminTourMatch[1]);
    requireAuthUid();
    try {
      const totalSlots = Number(body.total_slots || 48);
      const availSlots = Math.min(totalSlots, Math.max(0, Number(body.available_slots ?? totalSlots)));
      const rawBanner = String(body.banner_image || '').trim();
      const banner = rawBanner
        ? await compressImageDataUrl(rawBanner, 960, 0.75)
        : '';
      await updateDoc(doc(db, 'tournaments', tid), {
        title: sanitizeStr(body.title, 150),
        slug: slugify(body.title),
        banner_image: banner,
        game_mode: body.game_mode || 'Solo',
        map_name: sanitizeStr(body.map_name || 'Bermuda', 64),
        entry_fee: Number(body.entry_fee || 0),
        prize_pool: Number(body.prize_pool || 0),
        total_slots: totalSlots,
        available_slots: availSlots,
        reg_open_at: sanitizeStr(body.reg_open_at || '', 64),
        reg_close_at: sanitizeStr(body.reg_close_at || body.match_at, 64),
        match_at: sanitizeStr(body.match_at, 64),
        rules_text: sanitizeStr(body.rules_text || '', 10000),
        status: body.status || 'Registration Open',
        is_published: Number(body.is_published ?? 1),
        updatedAt: serverTimestamp()
      });
      await logAdminAction('UPDATE_TOURNAMENT', `Updated match ${body.title}`);
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tournaments/${tid}`);
    }
  }

  const tourRegsMatch = path.match(/^\/admin\/tournaments\/([^/]+)\/registrations$/);
  if (tourRegsMatch && method === 'GET') {
    const tid = decodeURIComponent(tourRegsMatch[1]);
    try {
      const role = await getCurrentRole();
      const q = isStaffRole(role)
        ? query(collection(db, 'registrations'), where('tournament_id', '==', tid))
        : query(
            collection(db, 'registrations'),
            where('tournament_id', '==', tid),
            where('payment_status', 'in', ['approved', 'pending'])
          );
      const snap = await getDocs(q);
      const registrations = snap.docs
        .map(serializeDoc)
        .sort((a, b) => Number(a.slot_number || 0) - Number(b.slot_number || 0));
      return { registrations } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'registrations');
    }
  }

  if (path === '/admin/rooms' && method === 'POST') {
    requireAuthUid();
    const tid = sanitizeStr(body.tournament_id, 128);
    try {
      const openingTime = sanitizeStr(body.opening_time || new Date().toISOString(), 64);
      const roomRef = doc(db, 'rooms', tid);
      const secRef = doc(db, 'room_secrets', tid);
      const [rSnap, sSnap] = await Promise.all([getDoc(roomRef), getDoc(secRef)]);
      const batch = writeBatch(db);

      const schedPayload = {
        tournament_id: tid,
        opening_time: openingTime,
        match_start_time: sanitizeStr(body.match_start_time || openingTime, 64),
        closing_time: sanitizeStr(body.closing_time || openingTime, 64),
        opening_at: Timestamp.fromDate(new Date(openingTime)),
        status: body.status || 'scheduled',
        is_published: Number(body.is_published ?? 1),
        updatedAt: serverTimestamp()
      };
      if (rSnap.exists()) {
        batch.update(roomRef, schedPayload);
      } else {
        batch.set(roomRef, { ...schedPayload, createdAt: serverTimestamp() });
      }

      const secPayload = {
        tournament_id: tid,
        room_id_code: sanitizeStr(body.room_id_code || '', 64),
        room_password: sanitizeStr(body.room_password || '', 64),
        updatedAt: serverTimestamp()
      };
      if (sSnap.exists()) {
        batch.update(secRef, secPayload);
      } else {
        batch.set(secRef, { ...secPayload, createdAt: serverTimestamp() });
      }

      await batch.commit();
      await logAdminAction('SAVE_ROOM', `Saved room credentials & timing for match ${tid}`);
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${tid}`);
    }
  }

  const reschedMatch = path.match(/^\/admin\/rooms\/([^/]+)\/reschedule$/);
  if (reschedMatch && method === 'PUT') {
    const tid = decodeURIComponent(reschedMatch[1]);
    requireAuthUid();
    try {
      const openingTime = sanitizeStr(body.newOpeningTime, 64);
      const matchStart = sanitizeStr(body.newMatchStartTime, 64);
      await updateDoc(doc(db, 'rooms', tid), {
        opening_time: openingTime,
        match_start_time: matchStart,
        opening_at: Timestamp.fromDate(new Date(openingTime)),
        updatedAt: serverTimestamp()
      });

      const regsSnap = await getDocs(query(collection(db, 'registrations'), where('tournament_id', '==', tid)));
      const batch = writeBatch(db);
      regsSnap.docs.forEach((d) => {
        const nid = genId('notif');
        batch.set(doc(db, 'notifications', nid), {
          id: nid,
          user_id: d.data().user_id,
          title: 'Match Schedule Updated',
          message: `Match rescheduled (${body.reason || 'Timing update'}). New start: ${formatISTDateTime(matchStart)}`,
          type: 'tournament',
          is_read: 0,
          link_url: `/tournament/${tid}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      await logAdminAction('RESCHEDULE_MATCH', `Rescheduled match ${tid}`);
      return { success: true, notifiedCount: regsSnap.size } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${tid}`);
    }
  }

  if (path === '/admin/payments' && method === 'GET') {
    requireAuthUid();
    const statusFilter = searchParams.get('status') || 'pending';
    try {
      const q =
        statusFilter && statusFilter !== 'all'
          ? query(collection(db, 'payments'), where('status', '==', statusFilter))
          : collection(db, 'payments');
      const snap = await getDocs(q);
      const payments = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { payments } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'payments');
    }
  }

  const verifyPayMatch = path.match(/^\/admin\/payments\/([^/]+)\/verify$/);
  if (verifyPayMatch && method === 'POST') {
    const payId = decodeURIComponent(verifyPayMatch[1]);
    const uid = requireAuthUid();
    const status = body.status === 'approved' ? 'approved' : 'rejected';
    const reason = sanitizeStr(body.rejection_reason || '', 500);
    try {
      const payRef = doc(db, 'payments', payId);
      const paySnap = await getDoc(payRef);
      if (!paySnap.exists()) throw new Error('Payment not found.');
      const pay = paySnap.data();

      const adminName = sanitizeStr(auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Admin', 100);
      const batch = writeBatch(db);
      batch.update(payRef, {
        status,
        rejection_reason: reason,
        verified_by_admin_id: uid,
        verified_by_admin_name: adminName,
        verified_at: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      if (pay.registration_id) {
        const regRef = doc(db, 'registrations', pay.registration_id);
        const regSnap = await getDoc(regRef);
        if (regSnap.exists()) {
          batch.update(regRef, {
            payment_status: status,
            rejection_reason: reason,
            updatedAt: serverTimestamp()
          });
        }
      }

      const nid = genId('notif');
      batch.set(doc(db, 'notifications', nid), {
        id: nid,
        user_id: pay.user_id,
        title: status === 'approved' ? 'Slot Approved!' : 'Payment Rejected',
        message:
          status === 'approved'
            ? `Your UPI payment (UTR: ${pay.transaction_ref}) for ${pay.tournament_title} is approved! Room ID unlocks at scheduled time.`
            : `Your payment (UTR: ${pay.transaction_ref}) was rejected: ${reason || 'Invalid UTR/screenshot'}`,
        type: 'payment',
        is_read: 0,
        link_url: `/tournament/${pay.tournament_id}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      await logAdminAction('VERIFY_PAYMENT', `Marked payment ${payId} (${pay.transaction_ref}) as ${status}`);
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${payId}`);
    }
  }

  const adminResultsMatch = path.match(/^\/admin\/results\/([^/]+)$/);
  if (adminResultsMatch && method === 'POST') {
    const tid = decodeURIComponent(adminResultsMatch[1]);
    requireAuthUid();
    try {
      const existingSnap = await getDocs(query(collection(db, 'results'), where('tournament_id', '==', tid)));
      const batch = writeBatch(db);
      existingSnap.docs.forEach((d) => batch.delete(d.ref));

      for (const entry of body.entries || []) {
        const rId = genId('res');
        const kills = Number(entry.kills || 0);
        const placePts = Number(entry.placement_points || 0);
        batch.set(doc(db, 'results', rId), {
          id: rId,
          tournament_id: tid,
          rank: Number(entry.rank || 1),
          user_id: sanitizeStr(entry.user_id || '', 128),
          player_name: sanitizeStr(entry.player_name || 'Winner', 100),
          kills,
          placement_points: placePts,
          kill_points: kills,
          total_points: Number(entry.total_points ?? kills + placePts),
          prize_amount: Number(entry.prize_amount || 0),
          notes: sanitizeStr(entry.notes || '', 500),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      batch.update(doc(db, 'tournaments', tid), {
        status: 'Completed',
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      await logAdminAction('PUBLISH_RESULTS', `Published results for match ${tid}`);
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `results/${tid}`);
    }
  }

  // ---------------------------------------------------------
  // ADMIN CMS / NAVIGATION / FAQ / ANNOUNCEMENTS / MEDIA / TICKETS / LOGS
  // ---------------------------------------------------------
  if (path === '/cms/pages' && method === 'POST') {
    requireAuthUid();
    const id = genId('page');
    try {
      const title = sanitizeStr(body.title || 'New Page', 200);
      const slug = slugify(body.slug || title);
      await setDoc(doc(db, 'website_pages', id), {
        id,
        title,
        slug,
        content: sanitizeStr(body.content || '', 100000),
        meta_title: sanitizeStr(body.meta_title || title, 200),
        meta_description: sanitizeStr(body.meta_description || '', 500),
        og_title: sanitizeStr(body.og_title || title, 200),
        og_description: sanitizeStr(body.og_description || '', 500),
        og_image: sanitizeStr(body.og_image || '', 350000),
        is_published: Number(body.is_published ?? 1),
        is_system: 0,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `website_pages/${id}`);
    }
  }

  const pageVersionsMatch = path.match(/^\/cms\/pages\/([^/]+)\/versions$/);
  if (pageVersionsMatch && method === 'GET') {
    const pid = decodeURIComponent(pageVersionsMatch[1]);
    try {
      const snap = await getDocs(collection(db, 'website_pages', pid, 'versions'));
      const versions = snap.docs
        .map(serializeDoc)
        .sort((a, b) => Number(b.version_num || 0) - Number(a.version_num || 0));
      return { versions } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `website_pages/${pid}/versions`);
    }
  }

  const pageRestoreMatch = path.match(/^\/cms\/pages\/([^/]+)\/restore\/(\d+)$/);
  if (pageRestoreMatch && method === 'POST') {
    const pid = decodeURIComponent(pageRestoreMatch[1]);
    const verNum = Number(pageRestoreMatch[2]);
    try {
      const snap = await getDocs(query(collection(db, 'website_pages', pid, 'versions'), where('version_num', '==', verNum)));
      if (snap.empty) throw new Error('Version not found.');
      const ver = snap.docs[0].data();
      await updateDoc(doc(db, 'website_pages', pid), {
        title: ver.title,
        content: ver.content,
        meta_title: ver.meta_title || ver.title,
        meta_description: ver.meta_description || '',
        version: verNum + 1,
        updatedAt: serverTimestamp()
      });
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `website_pages/${pid}`);
    }
  }

  const pageIdMatch = path.match(/^\/cms\/pages\/([^/]+)$/);
  if (pageIdMatch && method === 'PUT') {
    const pid = decodeURIComponent(pageIdMatch[1]);
    requireAuthUid();
    try {
      const pageRef = doc(db, 'website_pages', pid);
      const curSnap = await getDoc(pageRef);
      const nextVer = (curSnap.exists() ? Number(curSnap.data().version || 1) : 1) + 1;
      const verId = genId('ver');
      const batch = writeBatch(db);
      if (curSnap.exists()) {
        const cur = curSnap.data();
        batch.set(doc(db, 'website_pages', pid, 'versions', verId), {
          id: verId,
          page_id: pid,
          version_num: Number(cur.version || 1),
          title: cur.title,
          slug: cur.slug,
          content: cur.content,
          meta_title: cur.meta_title || '',
          meta_description: cur.meta_description || '',
          edited_by_admin_name: sanitizeStr(auth.currentUser?.displayName || 'Admin', 100),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      batch.update(pageRef, {
        title: sanitizeStr(body.title || '', 200),
        slug: slugify(body.slug || body.title || pid),
        content: sanitizeStr(body.content || '', 100000),
        meta_title: sanitizeStr(body.meta_title || body.title || '', 200),
        meta_description: sanitizeStr(body.meta_description || '', 500),
        is_published: Number(body.is_published ?? 1),
        version: nextVer,
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `website_pages/${pid}`);
    }
  }

  const homeSecMatch = path.match(/^\/cms\/homepage-sections\/([^/]+)$/);
  if (homeSecMatch && method === 'PUT') {
    const sid = decodeURIComponent(homeSecMatch[1]);
    requireAuthUid();
    try {
      await updateDoc(doc(db, 'homepage_sections', sid), {
        title: sanitizeStr(body.title || '', 200),
        subtitle: sanitizeStr(body.subtitle || '', 500),
        is_enabled: Number(body.is_enabled ?? 1),
        updatedAt: serverTimestamp()
      });
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `homepage_sections/${sid}`);
    }
  }

  if (path === '/cms/navigation' && method === 'POST') {
    const id = genId('nav');
    try {
      await setDoc(doc(db, 'navigation_items', id), {
        id,
        label: sanitizeStr(body.label || 'Link', 80),
        url: sanitizeStr(body.url || '/', 300),
        target: sanitizeStr(body.target || '_self', 16),
        sort_order: Number(body.sort_order || 1),
        is_visible: Number(body.is_visible ?? 1),
        is_footer: Number(body.is_footer ?? 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `navigation_items/${id}`);
    }
  }

  const navDelMatch = path.match(/^\/cms\/navigation\/([^/]+)$/);
  if (navDelMatch && method === 'DELETE') {
    const nid = decodeURIComponent(navDelMatch[1]);
    try {
      await deleteDoc(doc(db, 'navigation_items', nid));
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `navigation_items/${nid}`);
    }
  }

  if (path === '/admin/faqs' && method === 'POST') {
    const id = genId('faq');
    try {
      await setDoc(doc(db, 'faqs', id), {
        id,
        category: sanitizeStr(body.category || 'General', 64),
        question: sanitizeStr(body.question || '', 500),
        answer: sanitizeStr(body.answer || '', 4000),
        sort_order: Number(body.sort_order || 1),
        is_published: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `faqs/${id}`);
    }
  }

  const faqDelMatch = path.match(/^\/admin\/faqs\/([^/]+)$/);
  if (faqDelMatch && method === 'DELETE') {
    const fid = decodeURIComponent(faqDelMatch[1]);
    try {
      await deleteDoc(doc(db, 'faqs', fid));
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `faqs/${fid}`);
    }
  }

  if (path === '/admin/notifications/broadcast' && method === 'POST') {
    const actorUid = requireAuthUid();
    const role = await getCurrentRole();
    if (!isStaffRole(role)) throw new Error('Admin permission required to send notifications.');
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const recipientIds = new Set<string>();
      usersSnap.docs.forEach((d) => {
        if (!d.data().is_deactivated) {
          recipientIds.add(d.id);
        }
      });
      recipientIds.add(actorUid);

      const title = sanitizeStr(body.title || 'Admin Announcement', 160);
      const message = sanitizeStr(body.message || '', 1000);
      if (!title || !message) throw new Error('Title and message are required.');
      const notifType = sanitizeStr(body.type || 'system', 32);
      const linkUrl = sanitizeStr(body.link_url || '/tournaments', 300);

      const ids = Array.from(recipientIds);
      for (let i = 0; i < ids.length; i += 450) {
        const chunk = ids.slice(i, i + 450);
        const batch = writeBatch(db);
        for (const uid of chunk) {
          const nid = genId('notif');
          batch.set(doc(db, 'notifications', nid), {
            id: nid,
            user_id: uid,
            title,
            message,
            type: notifType,
            is_read: 0,
            link_url: linkUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }

      await logAdminAction('SEND_NOTIFICATION', `Broadcasted notification "${title}" to ${ids.length} users`);
      return { success: true, sentCount: ids.length } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    }
  }

  if (path === '/admin/announcements' && method === 'POST') {
    const actorUid = requireAuthUid();
    const id = genId('ann');
    try {
      const title = sanitizeStr(body.title || '', 200);
      const content = sanitizeStr(body.content || '', 1000);
      await setDoc(doc(db, 'announcements', id), {
        id,
        title,
        content,
        banner_type: body.banner_type || 'info',
        is_banner_visible: Number(body.is_banner_visible ?? 1),
        is_published: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (body.notify_all) {
        const usersSnap = await getDocs(collection(db, 'users'));
        const recipientIds = new Set<string>();
        usersSnap.docs.forEach((d) => {
          if (!d.data().is_deactivated) recipientIds.add(d.id);
        });
        recipientIds.add(actorUid);
        const ids = Array.from(recipientIds);
        for (let i = 0; i < ids.length; i += 450) {
          const chunk = ids.slice(i, i + 450);
          const batch = writeBatch(db);
          for (const uid of chunk) {
            const nid = genId('notif');
            batch.set(doc(db, 'notifications', nid), {
              id: nid,
              user_id: uid,
              title: sanitizeStr(title || 'Announcement', 160),
              message: sanitizeStr(content || '', 1000),
              type: 'system',
              is_read: 0,
              link_url: '/tournaments',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          await batch.commit();
        }
      }

      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
    }
  }

  const annDelMatch = path.match(/^\/admin\/announcements\/([^/]+)$/);
  if (annDelMatch && method === 'DELETE') {
    const aid = decodeURIComponent(annDelMatch[1]);
    try {
      await deleteDoc(doc(db, 'announcements', aid));
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${aid}`);
    }
  }

  if (path === '/media' && method === 'GET') {
    try {
      const snap = await getDocs(collection(db, 'media_library'));
      const items = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { items } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'media_library');
    }
  }

  if (path === '/media/upload' && method === 'POST') {
    const uid = requireAuthUid();
    const id = genId('media');
    try {
      const cleanUrl = String(body.url || '').startsWith('data:image/')
        ? await compressImageDataUrl(String(body.url), 960, 0.72)
        : sanitizeStr(body.url || '', 350000);
      await setDoc(doc(db, 'media_library', id), {
        id,
        file_name: sanitizeStr(body.file_name || 'asset', 160),
        url: cleanUrl,
        uploaded_by: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `media_library/${id}`);
    }
  }

  const mediaDelMatch = path.match(/^\/media\/([^/]+)$/);
  if (mediaDelMatch && method === 'DELETE') {
    const mid = decodeURIComponent(mediaDelMatch[1]);
    try {
      await deleteDoc(doc(db, 'media_library', mid));
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `media_library/${mid}`);
    }
  }

  if (path === '/admin/tickets' && method === 'GET') {
    requireAuthUid();
    try {
      const snap = await getDocs(collection(db, 'support_tickets'));
      const tickets = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { tickets } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'support_tickets');
    }
  }

  const tktStatusMatch = path.match(/^\/admin\/tickets\/([^/]+)\/status$/);
  if (tktStatusMatch && method === 'PUT') {
    const tid = decodeURIComponent(tktStatusMatch[1]);
    try {
      await updateDoc(doc(db, 'support_tickets', tid), {
        status: body.status || 'resolved',
        priority: body.priority || 'normal',
        updatedAt: serverTimestamp()
      });
      return { success: true } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `support_tickets/${tid}`);
    }
  }

  if (path === '/admin/activity-logs' && method === 'GET') {
    requireAuthUid();
    try {
      const snap = await getDocs(collection(db, 'admin_activity_logs'));
      const logs = snap.docs
        .map(serializeDoc)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 50);
      return { logs } as T;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'admin_activity_logs');
    }
  }

  throw new Error(`Unsupported operation: ${method} ${path}`);
}

// Time & Formatting Utilities (IST / Asia/Kolkata)
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatISTDateTime(isoString: string): string {
  if (!isoString) return 'TBA';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return (
    date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST'
  );
}

export function formatISTTime(isoString: string): string {
  if (!isoString) return 'TBA';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return (
    date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST'
  );
}

export function getTimeRemaining(targetIsoString: string): {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const target = new Date(targetIsoString).getTime();
  const now = Date.now();
  const diff = target - now;

  if (Number.isNaN(target) || diff <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { totalMs: diff, days, hours, minutes, seconds, isPast: false };
}
