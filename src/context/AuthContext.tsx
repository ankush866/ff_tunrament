import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  SUPER_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  compressImageDataUrl
} from '../lib/firebase.js';
import { apiRequest } from '../lib/api.js';
import { ensureFirestoreSeeded } from '../lib/firestoreSeed.js';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  free_fire_uid: string;
  free_fire_ign: string;
  phone: string;
  avatar_url: string;
  role: 'user' | 'super_admin' | 'tournament_manager' | 'payment_manager' | 'content_manager' | 'support_manager';
  is_email_verified: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  link_url: string;
  created_at: string;
}

export interface ExtraProfileInput {
  username?: string;
  full_name?: string;
  free_fire_uid?: string;
  free_fire_ign?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthReady: boolean;
  authError: string | null;
  signInWithGoogle: (extra?: ExtraProfileInput) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationRead: (id: string | number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveOrCreateUserProfile(
  fbUser: FirebaseUser,
  extra?: ExtraProfileInput
): Promise<User> {
  const uid = fbUser.uid;
  const userRef = doc(db, 'users', uid);
  const privRef = doc(db, 'users', uid, 'private', 'info');

  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  const baseEmail = fbUser.email || '';
  const defaultUsername = (
    extra?.username ||
    baseEmail.split('@')[0] ||
    fbUser.displayName ||
    `player_${uid.slice(0, 6)}`
  )
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 48);

  if (!userSnap.exists()) {
    const newPublicProfile = {
      uid,
      username: defaultUsername.length >= 2 ? defaultUsername : `p_${uid.slice(0, 6)}`,
      full_name: (extra?.full_name || fbUser.displayName || defaultUsername).slice(0, 100),
      free_fire_uid: (extra?.free_fire_uid || '').slice(0, 32),
      free_fire_ign: (extra?.free_fire_ign || '').slice(0, 64),
      avatar_url: (fbUser.photoURL || '').slice(0, 350000),
      role: 'user',
      is_blocked: false,
      is_deactivated: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(userRef, newPublicProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
    }

    try {
      await setDoc(privRef, {
        uid,
        email: baseEmail.slice(0, 160),
        phone: (extra?.phone || '').slice(0, 32),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/private/info`);
    }

    try {
      const notifId = `welcome_${uid.slice(0, 20)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        user_id: uid,
        title: 'Welcome to Flaxy Esports!',
        message: 'Your Firebase-backed warrior account is ready. Complete your Free Fire IGN/UID in Profile and join live matches.',
        type: 'system',
        is_read: 0,
        link_url: '/tournaments',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch {
      // Non-blocking welcome notification
    }

    userSnap = await getDoc(userRef);
  } else if (extra && (extra.username || extra.free_fire_uid || extra.free_fire_ign || extra.full_name || extra.phone)) {
    const cur = userSnap.data();
    const pubUpdates: Record<string, any> = { updatedAt: serverTimestamp() };
    const cleanExtraUsername = extra.username
      ? extra.username.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 48)
      : '';
    if (cleanExtraUsername.length >= 2 && cleanExtraUsername !== cur.username) {
      pubUpdates.username = cleanExtraUsername;
    }
    if (extra.full_name && !cur.full_name) pubUpdates.full_name = extra.full_name.slice(0, 100);
    if (extra.free_fire_uid && !cur.free_fire_uid) pubUpdates.free_fire_uid = extra.free_fire_uid.slice(0, 32);
    if (extra.free_fire_ign && !cur.free_fire_ign) pubUpdates.free_fire_ign = extra.free_fire_ign.slice(0, 64);

    if (Object.keys(pubUpdates).length > 1) {
      try {
        await updateDoc(userRef, pubUpdates);
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    }

    if (extra.phone) {
      try {
        const privSnap = await getDoc(privRef);
        if (privSnap.exists() && !privSnap.data().phone) {
          await updateDoc(privRef, { phone: extra.phone.slice(0, 32), updatedAt: serverTimestamp() });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
      }
    }
  }

  const pubData = userSnap.data() || {};
  if (pubData.is_blocked) {
    await signOut(auth);
    throw new Error('Account Suspended: Your account has been blocked by Admin.');
  }

  let phone = '';
  let email = baseEmail;
  try {
    const privSnap = await getDoc(privRef);
    if (privSnap.exists()) {
      phone = privSnap.data().phone || '';
      email = privSnap.data().email || baseEmail;
    } else {
      await setDoc(privRef, {
        uid,
        email: baseEmail.slice(0, 160),
        phone: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
  }

  let effectiveRole: User['role'] = 'user';
  if (baseEmail.toLowerCase() === SUPER_ADMIN_EMAIL && fbUser.emailVerified) {
    effectiveRole = 'super_admin';
    void ensureFirestoreSeeded();
  } else {
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      if (adminSnap.exists()) {
        effectiveRole = (adminSnap.data().role as User['role']) || 'user';
        if (effectiveRole === 'super_admin') void ensureFirestoreSeeded();
      }
    } catch {
      effectiveRole = (pubData.role as User['role']) || 'user';
    }
  }

  const createdIso = pubData.createdAt?.toDate ? pubData.createdAt.toDate().toISOString() : new Date().toISOString();

  return {
    id: uid,
    username: pubData.username || defaultUsername,
    email,
    full_name: pubData.full_name || '',
    free_fire_uid: pubData.free_fire_uid || '',
    free_fire_ign: pubData.free_fire_ign || '',
    phone,
    avatar_url: pubData.avatar_url || fbUser.photoURL || '',
    role: effectiveRole,
    is_email_verified: fbUser.emailVerified ? 1 : 0,
    created_at: createdIso
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshUser = useCallback(async () => {
    const cu = auth.currentUser;
    if (!cu) {
      setUser(null);
      return;
    }
    try {
      const profile = await resolveOrCreateUserProfile(cu);
      setUser(profile);
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to load profile.');
      setUser(null);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Listener keeps synced
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setAuthError(null);
      if (!fbUser) {
        setUser(null);
        setNotifications([]);
        setUnreadCount(0);
        setIsAuthReady(true);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await resolveOrCreateUserProfile(fbUser);
        setUser(profile);
      } catch (err: any) {
        setAuthError(err?.message || 'Sign-in failed.');
        setUser(null);
      } finally {
        setIsAuthReady(true);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore notification listener strictly AFTER auth is ready & user signed in
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const notifQuery = query(collection(db, 'notifications'), where('user_id', '==', user.id));
    const unsub = onSnapshot(
      notifQuery,
      (snap) => {
        const list: NotificationItem[] = snap.docs
          .map((d) => {
            const raw = d.data();
            return {
              id: raw.id || d.id,
              title: raw.title || '',
              message: raw.message || '',
              type: raw.type || 'system',
              is_read: Number(raw.is_read || 0),
              link_url: raw.link_url || '',
              created_at: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : new Date().toISOString()
            };
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setNotifications(list);
        setUnreadCount(list.filter((n) => n.is_read === 0).length);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );
    return () => unsub();
  }, [isAuthReady, user?.id]);

  const signInWithGoogle = async (extra?: ExtraProfileInput): Promise<User> => {
    setAuthError(null);
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await resolveOrCreateUserProfile(cred.user, extra);
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const updateProfile = async (formData: any) => {
    const cu = auth.currentUser;
    if (!cu) throw new Error('Please sign in first.');
    const uid = cu.uid;
    const avatarUrl = formData.avatar_url
      ? await compressImageDataUrl(String(formData.avatar_url), 400, 0.72)
      : '';

    try {
      await updateDoc(doc(db, 'users', uid), {
        full_name: String(formData.full_name || '').slice(0, 100),
        free_fire_uid: String(formData.free_fire_uid || '').slice(0, 32),
        free_fire_ign: String(formData.free_fire_ign || '').slice(0, 64),
        avatar_url: avatarUrl,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }

    if (formData.phone !== undefined) {
      try {
        await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
          phone: String(formData.phone || '').slice(0, 32),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
      }
    }

    await refreshUser();
  };

  const markNotificationRead = async (id: string | number) => {
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
  };

  const markAllNotificationsRead = async () => {
    await apiRequest('/notifications/mark-all-read', { method: 'POST' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: user ? user.id : null,
        isLoading,
        isAuthReady,
        authError,
        signInWithGoogle,
        logout,
        updateProfile,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
        refreshUser,
        refreshNotifications
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
