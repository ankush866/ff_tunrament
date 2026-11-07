import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'flaxy-auth-v4-superadmin-ankushsharma-prod-2026';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  free_fire_uid: string;
  free_fire_ign: string;
  is_blocked: number;
  is_deactivated: number;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Middleware to authenticate JWT token
export async function authenticateUser(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; email: string; role: string };
    const user = (await db.prepare('SELECT id, username, email, role, free_fire_uid, free_fire_ign, is_blocked, is_deactivated FROM users WHERE id = ?').get(decoded.id)) as unknown as AuthUser | undefined;

    if (user && !user.is_blocked && !user.is_deactivated) {
      req.user = user;
    }
  } catch {
    // Invalid token, user stays undefined
  }
  next();
}

// Require authenticated user
export function requireAuth(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }
  next();
}

// Require any staff/admin role
export function requireAdmin(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const allowed = ['super_admin', 'tournament_manager', 'payment_manager', 'content_manager', 'support_manager'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Staff privileges required.' });
  }
  next();
}

// Require specific admin roles
export function requireRole(allowedRoles: string[]) {
  return (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
  };
}

// Log Admin Activity
export async function logAdminActivity(adminId: number | undefined, adminName: string, action: string, details: string, ipAddress = '127.0.0.1') {
  try {
    await db.prepare(`
      INSERT INTO admin_activity_logs (admin_id, admin_name, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId || null, adminName, action, details, ipAddress);
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

// In-memory rate limiting map for login / forgot password attempts
const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>();

export function rateLimiter(windowMs = 60000, maxRequests = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry) {
      rateLimitMap.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    if (now - entry.firstAttempt > windowMs) {
      rateLimitMap.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }

    entry.count++;
    next();
  };
}
