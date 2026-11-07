import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db, syncDataBackup } from './db.js';
import {
  AuthUser,
  generateToken,
  hashPassword,
  verifyPassword,
  requireAuth,
  requireAdmin,
  requireRole,
  logAdminActivity,
  rateLimiter
} from './auth.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & USER MANAGEMENT
// ==========================================

// Register
apiRouter.post('/auth/register', rateLimiter(60000, 15), async (req: Request, res: Response) => {
  const { username, email, password, full_name, free_fire_uid, free_fire_ign, phone } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  // Validate format
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Check unique username and email
  const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existingUser) {
    return res.status(400).json({ error: 'Username or email already registered. Please choose another.' });
  }

  const password_hash = hashPassword(password);
  const result = await db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, role, is_email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 1)
  `).run(
    username.trim().toLowerCase(),
    email.trim().toLowerCase(),
    password_hash,
    full_name || '',
    free_fire_uid || '',
    free_fire_ign || username,
    phone || ''
  );

  const user = await db.prepare('SELECT id, username, email, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_blocked, is_deactivated, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as unknown as AuthUser;
  const token = generateToken(user);

  // Send welcome in-app notification
  await db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Welcome to Flaxy Esports!', 'Your warrior account is ready. Browse active tournaments and dominate the battleground.', 'system')
  `).run(user.id);

  syncDataBackup();

  return res.json({ token, user });
});

// Login
apiRouter.post('/auth/login', rateLimiter(60000, 20), async (req: Request, res: Response) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Please provide your email/username and password.' });
  }

  const query = usernameOrEmail.includes('@')
    ? 'SELECT * FROM users WHERE email = ?'
    : 'SELECT * FROM users WHERE username = ?';

  const user = (await db.prepare(query).get(usernameOrEmail.trim().toLowerCase())) as (AuthUser & { password_hash: string }) | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  if (user.is_blocked) {
    return res.status(403).json({ error: 'Your account has been suspended by administration. Please contact support.' });
  }

  if (user.is_deactivated) {
    return res.status(403).json({ error: 'This account was deactivated. Contact support to reactivate.' });
  }

  const isMatch = verifyPassword(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

// Current user profile
apiRouter.get('/auth/me', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const user = await db.prepare(`
    SELECT id, username, email, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user!.id);
  return res.json({ user });
});

// Update profile
apiRouter.put('/auth/profile', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const { full_name, free_fire_uid, free_fire_ign, phone, avatar_url } = req.body;
  await db.prepare(`
    UPDATE users
    SET full_name = ?, free_fire_uid = ?, free_fire_ign = ?, phone = ?, avatar_url = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    full_name || '',
    free_fire_uid || '',
    free_fire_ign || '',
    phone || '',
    avatar_url || '',
    req.user!.id
  );

  const updated = await db.prepare(`
    SELECT id, username, email, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user!.id);

  syncDataBackup();

  return res.json({ user: updated });
});

// Change Password
apiRouter.put('/auth/change-password', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string };
  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  await db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
    hashPassword(newPassword),
    req.user!.id
  );

  syncDataBackup();

  return res.json({ success: true, message: 'Password updated successfully.' });
});

// Forgot Password Request (Accepts Email, Username, or Free Fire UID)
apiRouter.post('/auth/forgot-password', rateLimiter(60000, 10), async (req: Request, res: Response) => {
  const { identifier, email } = req.body;
  const searchVal = String(identifier || email || '').trim().toLowerCase();

  if (!searchVal) {
    return res.status(400).json({ error: 'Please enter your registered Email, Username, or Free Fire UID.' });
  }

  const user = await db.prepare(`
    SELECT id, email, username, free_fire_uid, free_fire_ign
    FROM users
    WHERE LOWER(email) = ? OR LOWER(username) = ? OR free_fire_uid = ?
  `).get(searchVal, searchVal, searchVal) as { id: number; email: string; username: string; free_fire_uid: string; free_fire_ign: string } | undefined;

  if (!user) {
    return res.status(404).json({ error: 'No player account found with that Email, Username, or Free Fire UID.' });
  }

  // Generate single-use secure 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

  await db.prepare(`
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, otpCode, expiresAt);

  return res.json({
    success: true,
    message: `Account verified for "${user.username}"! Use your 6-digit reset code to create a new password.`,
    demo_reset_token: otpCode,
    otp_code: otpCode,
    username: user.username,
    email: user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : ''
  });
});

// Reset Password with Token or 6-Digit OTP
apiRouter.post('/auth/reset-password', rateLimiter(60000, 10), async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Please enter the 6-digit code and a new password (minimum 6 characters).' });
  }

  const cleanToken = String(token).trim();
  const resetRecord = await db.prepare(`
    SELECT pr.*, u.username, u.email
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = ? AND pr.used = 0
  `).get(cleanToken) as { id: number; user_id: number; expires_at: string; used: number; username: string; email: string } | undefined;

  if (!resetRecord) {
    return res.status(400).json({ error: 'Password reset code is invalid or has already been used.' });
  }

  if (new Date() > new Date(resetRecord.expires_at)) {
    return res.status(400).json({ error: 'This password reset code has expired. Please request a new one.' });
  }

  // Update password and invalidate token
  const passwordHash = hashPassword(newPassword);
  await db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(passwordHash, resetRecord.user_id);
  await db.prepare(`UPDATE password_resets SET used = 1 WHERE id = ?`).run(resetRecord.id);

  syncDataBackup();

  return res.json({ success: true, message: `Password reset successfully for ${resetRecord.username}! You can now login.` });
});

// Deactivate Account
apiRouter.post('/auth/deactivate', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const { confirmPassword } = req.body;
  const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string };
  if (!verifyPassword(confirmPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Password confirmation failed.' });
  }

  await db.prepare("UPDATE users SET is_deactivated = 1, updated_at = datetime('now') WHERE id = ?").run(req.user!.id);
  return res.json({ success: true, message: 'Account deactivated.' });
});


// ==========================================
// 2. TOURNAMENTS MANAGEMENT & LIVE STATS
// ==========================================

// Live Real-Time Public Statistics (Calculated dynamically from SQLite Database)
apiRouter.get('/stats/public', async (req: Request, res: Response) => {
  const warriors = await db.prepare("SELECT count(*) as count FROM users WHERE role = 'user' AND is_deactivated = 0").get() as { count: number };
  const completed = await db.prepare("SELECT count(*) as count FROM tournaments WHERE status = 'Completed'").get() as { count: number };
  const activeMatches = await db.prepare("SELECT count(*) as count FROM tournaments WHERE is_published = 1 AND status IN ('Live', 'Registration Open', 'Upcoming')").get() as { count: number };
  const paymentsApproved = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'approved'").get() as { total: number };
  const completedPrizePool = await db.prepare("SELECT COALESCE(SUM(prize_pool), 0) as total FROM tournaments WHERE status = 'Completed'").get() as { total: number };
  const activePrizePool = await db.prepare("SELECT COALESCE(SUM(prize_pool), 0) as total FROM tournaments WHERE is_published = 1 AND status IN ('Live', 'Registration Open', 'Upcoming')").get() as { total: number };

  const totalPayout = paymentsApproved.total > 0 ? paymentsApproved.total : completedPrizePool.total;

  return res.json({
    registeredWarriors: warriors.count,
    tournamentsCompleted: completed.count,
    activeMatches: activeMatches.count,
    verifiedPayouts: totalPayout,
    activePrizePool: activePrizePool.total
  });
});

// List Public Tournaments
apiRouter.get('/tournaments', async (req: Request, res: Response) => {
  const { game_mode, status, map_name } = req.query;
  let query = 'SELECT * FROM tournaments WHERE is_published = 1';
  const params: any[] = [];

  if (game_mode && game_mode !== 'all') {
    query += ' AND game_mode = ?';
    params.push(game_mode);
  }
  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (map_name && map_name !== 'all') {
    query += ' AND map_name = ?';
    params.push(map_name);
  }

  query += " ORDER BY CASE status WHEN 'Live' THEN 1 WHEN 'Registration Open' THEN 2 WHEN 'Upcoming' THEN 3 ELSE 4 END, match_at ASC";

  const tournaments = await db.prepare(query).all(...params);
  return res.json({ tournaments });
});

// Get Single Tournament with Room & Registration Status
apiRouter.get('/tournaments/:id', async (req: Request & { user?: AuthUser }, res: Response) => {
  const tournamentId = req.params.id;
  const tournament = await db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;

  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found.' });
  }

  // Get Room info (without credentials if unauthorized)
  const room = await db.prepare('SELECT id, opening_time, closing_time, match_start_time, status, is_published FROM rooms WHERE tournament_id = ?').get(tournamentId);

  // Check current user registration status if logged in
  let registration: any = null;
  if (req.user) {
    registration = db.prepare(`
      SELECT r.*, p.status as payment_status, p.transaction_ref, p.rejection_reason
      FROM registrations r
      LEFT JOIN payments p ON p.registration_id = r.id
      WHERE r.tournament_id = ? AND r.user_id = ?
    `).get(tournamentId, req.user.id);
  }

  // Registered players count
  const regCount = await db.prepare("SELECT count(*) as count FROM registrations WHERE tournament_id = ? AND payment_status != 'rejected'").get(tournamentId) as { count: number };

  return res.json({
    tournament,
    room,
    registration,
    registeredCount: regCount.count,
    serverTime: new Date().toISOString()
  });
});

// Register for Tournament (Transaction-safe slot reservation)
apiRouter.post('/tournaments/:id/register', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const tournamentId = parseInt(req.params.id, 10);
  const userId = req.user!.id;
  const { team_id } = req.body;

  // Verify tournament exists and is open
  const tournament = await db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found.' });
  }

  if (tournament.status !== 'Registration Open' && tournament.status !== 'Upcoming') {
    return res.status(400).json({ error: `Registration is currently ${tournament.status.toLowerCase()}.` });
  }

  // Check existing registration
  const existingReg = await db.prepare('SELECT id, payment_status, slot_number FROM registrations WHERE tournament_id = ? AND user_id = ?').get(tournamentId, userId) as any;
  if (existingReg) {
    if (existingReg.payment_status === 'pending') {
      return res.json({
        success: true,
        registrationId: existingReg.id,
        slotNumber: existingReg.slot_number || 1,
        paymentRequired: tournament.entry_fee > 0,
        entryFee: tournament.entry_fee,
        message: 'Resuming your registration payment.'
      });
    }
    if (existingReg.payment_status === 'approved') {
      return res.status(400).json({ error: 'You are already registered and confirmed for this tournament.' });
    }
  }

  // Validate Duo requirement
  if (tournament.game_mode === 'Duo') {
    if (!team_id) {
      return res.status(400).json({ error: 'Please select or create your 2-player Duo team to register.' });
    }
    // Verify user is in this team and team has exactly 2 members
    const teamMemberCount = await db.prepare("SELECT count(*) as count FROM team_members WHERE team_id = ? AND status = 'accepted'").get(team_id) as { count: number };
    if (teamMemberCount.count !== 2) {
      return res.status(400).json({ error: 'Duo tournament requires a team with exactly 2 accepted members.' });
    }
  }

  // Transaction-safe slot reservation
  try {
    await db.exec('BEGIN TRANSACTION');

    const freshTournament = await db.prepare('SELECT available_slots, total_slots, entry_fee FROM tournaments WHERE id = ?').get(tournamentId) as any;
    if (freshTournament.available_slots <= 0) {
      await db.exec('ROLLBACK');
      return res.status(400).json({ error: 'Tournament is already full! No slots remaining.' });
    }

    // Decrement available slots
    const newSlots = freshTournament.available_slots - 1;
    const newStatus = newSlots === 0 ? 'Full' : tournament.status;

    await db.prepare("UPDATE tournaments SET available_slots = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(newSlots, newStatus, tournamentId);

    const slotNumber = freshTournament.total_slots - newSlots;
    const initialPaymentStatus = freshTournament.entry_fee === 0 ? 'approved' : 'pending';

    const regResult = await db.prepare(`
      INSERT INTO registrations (tournament_id, user_id, team_id, slot_number, payment_status)
      VALUES (?, ?, ?, ?, ?)
    `).run(tournamentId, userId, team_id || null, slotNumber, initialPaymentStatus);

    await db.exec('COMMIT');

    // Notify user
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Registration Slot Reserved!', ?, 'tournament')
    `).run(
      userId,
      freshTournament.entry_fee === 0
        ? `You have successfully joined ${tournament.title}! Your slot #${slotNumber} is confirmed.`
        : `Slot #${slotNumber} reserved for ${tournament.title}! Please submit your UPI payment to lock in your spot.`
    );

    return res.json({
      success: true,
      registrationId: regResult.lastInsertRowid,
      slotNumber,
      paymentRequired: freshTournament.entry_fee > 0,
      entryFee: freshTournament.entry_fee
    });
  } catch (err: any) {
    await db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Registration failed due to server error: ' + err.message });
  }
});

// Admin Tournaments CRUD
apiRouter.post('/admin/tournaments', requireRole(['super_admin', 'tournament_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const {
    title,
    game_mode,
    map_name,
    entry_fee,
    prize_pool,
    total_slots,
    reg_open_at,
    reg_close_at,
    match_at,
    rules_text,
    banner_image,
    status
  } = req.body;

  if (!title || !match_at) {
    return res.status(400).json({ error: 'Title and Match date/time are required.' });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  const slots = parseInt(total_slots, 10) || 48;

  const result = await db.prepare(`
    INSERT INTO tournaments (title, slug, banner_image, game_mode, map_name, entry_fee, prize_pool, total_slots, available_slots, reg_open_at, reg_close_at, match_at, rules_text, status, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    title,
    slug,
    banner_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
    game_mode || 'Solo',
    map_name || 'Bermuda',
    parseInt(entry_fee, 10) || 0,
    parseInt(prize_pool, 10) || 0,
    slots,
    slots,
    reg_open_at || new Date().toISOString(),
    reg_close_at || match_at,
    match_at,
    rules_text || '',
    status || 'Registration Open'
  );

  // Auto-create room record for this tournament
  const roomOpen = new Date(new Date(match_at).getTime() - 15 * 60 * 1000).toISOString();
  const roomClose = new Date(new Date(match_at).getTime() + 45 * 60 * 1000).toISOString();
  await db.prepare(`
    INSERT INTO rooms (tournament_id, room_id_code, room_password, opening_time, closing_time, match_start_time, status, is_published)
    VALUES (?, '', '', ?, ?, ?, 'scheduled', 1)
  `).run(result.lastInsertRowid, roomOpen, roomClose, match_at);

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'CREATE_TOURNAMENT', `Created tournament: ${title}`);
  return res.json({ success: true, tournamentId: result.lastInsertRowid });
});

apiRouter.put('/admin/tournaments/:id', requireRole(['super_admin', 'tournament_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const id = req.params.id;
  const {
    title,
    game_mode,
    map_name,
    entry_fee,
    prize_pool,
    total_slots,
    available_slots,
    reg_open_at,
    reg_close_at,
    match_at,
    rules_text,
    banner_image,
    status,
    is_published
  } = req.body;

  const existing = (await db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id)) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Tournament not found.' });
  }

  await db.prepare(`
    UPDATE tournaments
    SET title = ?, game_mode = ?, map_name = ?, entry_fee = ?, prize_pool = ?,
        total_slots = ?, available_slots = ?, reg_open_at = ?, reg_close_at = ?,
        match_at = ?, rules_text = ?, banner_image = ?, status = ?, is_published = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title ?? existing.title,
    game_mode ?? existing.game_mode,
    map_name ?? existing.map_name,
    entry_fee !== undefined ? (parseInt(entry_fee, 10) || 0) : existing.entry_fee,
    prize_pool !== undefined ? (parseInt(prize_pool, 10) || 0) : existing.prize_pool,
    total_slots !== undefined ? (parseInt(total_slots, 10) || 48) : existing.total_slots,
    available_slots !== undefined ? parseInt(available_slots, 10) : existing.available_slots,
    reg_open_at ?? existing.reg_open_at,
    reg_close_at ?? existing.reg_close_at,
    match_at ?? existing.match_at,
    rules_text ?? existing.rules_text,
    banner_image ?? existing.banner_image,
    status ?? existing.status,
    is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
    id
  );

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'UPDATE_TOURNAMENT', `Updated tournament ID: ${id}`);
  return res.json({ success: true });
});

apiRouter.delete('/admin/tournaments/:id', requireRole(['super_admin']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const id = req.params.id;
  await db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'DELETE_TOURNAMENT', `Deleted tournament ID: ${id}`);
  return res.json({ success: true });
});

// Admin view registrations for a tournament
apiRouter.get('/admin/tournaments/:id/registrations', requireRole(['super_admin', 'tournament_manager']), async (req: Request, res: Response) => {
  const tournamentId = req.params.id;
  const registrations = await db.prepare(`
    SELECT r.*, u.username, u.email, u.free_fire_ign, u.free_fire_uid, u.phone,
           t.name as team_name, p.transaction_ref, p.screenshot_url, p.status as payment_status_detail
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN teams t ON t.id = r.team_id
    LEFT JOIN payments p ON p.registration_id = r.id
    WHERE r.tournament_id = ?
    ORDER BY r.slot_number ASC
  `).all(tournamentId);

  return res.json({ registrations });
});


// ==========================================
// 3. ADVANCED ROOM MANAGEMENT & LIVE TIMINGS (REQUIREMENT 6)
// ==========================================

// Get Room Information (Security Enforced: Only reveals credentials if authorized & time unlocked)
apiRouter.get('/rooms/:tournamentId', async (req: Request & { user?: AuthUser }, res: Response) => {
  const tournamentId = req.params.tournamentId;
  const room = await db.prepare('SELECT * FROM rooms WHERE tournament_id = ?').get(tournamentId) as any;

  if (!room) {
    return res.status(404).json({ error: 'Room schedule not found for this tournament.' });
  }

  const now = new Date();
  const openTime = new Date(room.opening_time);
  const matchTime = new Date(room.match_start_time);
  const closeTime = new Date(room.closing_time);

  // Dynamic status evaluation
  let dynamicStatus = room.status;
  if (now < openTime) {
    dynamicStatus = 'scheduled';
  } else if (now >= openTime && now < matchTime) {
    dynamicStatus = 'open';
  } else if (now >= matchTime && now < closeTime) {
    dynamicStatus = 'live';
  } else if (now >= closeTime) {
    dynamicStatus = 'completed';
  }

  // Security Check: Is user a staff admin?
  const isStaff = req.user && ['super_admin', 'tournament_manager', 'payment_manager'].includes(req.user.role);

  // Security Check: Is user an approved participant?
  let isApprovedParticipant = false;
  if (req.user) {
    const reg = await db.prepare('SELECT id, payment_status FROM registrations WHERE tournament_id = ? AND user_id = ?').get(tournamentId, req.user.id) as any;
    if (reg && reg.payment_status === 'approved') {
      isApprovedParticipant = true;
    }
  }

  const isTimeUnlocked = now >= openTime;

  // Reveal room credentials ONLY IF (isStaff) OR (isApprovedParticipant AND isTimeUnlocked)
  const canViewCredentials = isStaff || (isApprovedParticipant && isTimeUnlocked);

  return res.json({
    id: room.id,
    tournament_id: room.tournament_id,
    opening_time: room.opening_time,
    closing_time: room.closing_time,
    match_start_time: room.match_start_time,
    status: dynamicStatus,
    is_published: room.is_published,
    // Sensitive credentials
    room_id_code: canViewCredentials ? room.room_id_code : null,
    room_password: canViewCredentials ? room.room_password : null,
    locked: !canViewCredentials,
    reason: !req.user
      ? 'Please login and register for this tournament to view room details.'
      : !isApprovedParticipant
        ? 'Room details are only available to players with an approved registration.'
        : !isTimeUnlocked
          ? `Room is not open yet. Credentials will automatically unlock at ${new Date(room.opening_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`
          : null,
    serverTime: now.toISOString(),
    isApprovedParticipant
  });
});

// Admin Update Room Credentials & Scheduling
apiRouter.post('/admin/rooms', requireRole(['super_admin', 'tournament_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const { tournament_id, room_id_code, room_password, opening_time, closing_time, match_start_time, status, is_published } = req.body;

  if (!tournament_id || !opening_time || !match_start_time) {
    return res.status(400).json({ error: 'Tournament, opening time, and match start time are required.' });
  }

  const existing = await db.prepare('SELECT id FROM rooms WHERE tournament_id = ?').get(tournament_id) as any;

  if (existing) {
    await db.prepare(`
      UPDATE rooms
      SET room_id_code = ?, room_password = ?, opening_time = ?, closing_time = ?,
          match_start_time = ?, status = ?, is_published = ?, updated_at = datetime('now')
      WHERE tournament_id = ?
    `).run(
      room_id_code || '',
      room_password || '',
      opening_time,
      closing_time || match_start_time,
      match_start_time,
      status || 'scheduled',
      is_published ? 1 : 0,
      tournament_id
    );
  } else {
    await db.prepare(`
      INSERT INTO rooms (tournament_id, room_id_code, room_password, opening_time, closing_time, match_start_time, status, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tournament_id,
      room_id_code || '',
      room_password || '',
      opening_time,
      closing_time || match_start_time,
      match_start_time,
      status || 'scheduled',
      is_published ? 1 : 0
    );
  }

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'UPDATE_ROOM', `Updated room credentials/schedule for tournament ${tournament_id}`);
  return res.json({ success: true, message: 'Room credentials and schedule saved.' });
});

// Admin Reschedule Match (with auto-notifications to all players)
apiRouter.put('/admin/rooms/:tournamentId/reschedule', requireRole(['super_admin', 'tournament_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const tournamentId = req.params.tournamentId;
  const { newOpeningTime, newMatchStartTime, reason } = req.body;

  if (!newOpeningTime || !newMatchStartTime) {
    return res.status(400).json({ error: 'Please provide new opening and match start times.' });
  }

  // Update room
  await db.prepare(`
    UPDATE rooms
    SET opening_time = ?, match_start_time = ?, status = 'scheduled', updated_at = datetime('now')
    WHERE tournament_id = ?
  `).run(newOpeningTime, newMatchStartTime, tournamentId);

  // Update tournament match time
  await db.prepare(`
    UPDATE tournaments
    SET match_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newMatchStartTime, tournamentId);

  // Notify all registered participants
  const players = await db.prepare('SELECT user_id FROM registrations WHERE tournament_id = ?').all(tournamentId) as { user_id: number }[];
  const istMatchTime = new Date(newMatchStartTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

  const notifyStmt = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Match Rescheduled', ?, 'room')
  `);

  for (const player of players) {
    await notifyStmt.run(
      player.user_id,
      `Your tournament match has been rescheduled to ${istMatchTime} IST. ${reason ? 'Reason: ' + reason : ''}`
    );
  }

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'RESCHEDULE_MATCH', `Rescheduled tournament ${tournamentId} to ${newMatchStartTime}`);
  return res.json({ success: true, notifiedCount: players.length });
});


// ==========================================
// 4. MANUAL UPI PAYMENT MANAGEMENT
// ==========================================

// Submit UPI Payment
apiRouter.post('/payments/submit', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const { registration_id, tournament_id, amount, transaction_ref, screenshot_url, upi_id, whatsapp_number } = req.body;

  if (!tournament_id || !transaction_ref) {
    return res.status(400).json({ error: 'Tournament and 12-digit UTR reference are required.' });
  }

  // Auto-resolve registration ID if not passed directly
  let targetRegId = registration_id;
  if (!targetRegId) {
    const existingReg = await db.prepare('SELECT id FROM registrations WHERE tournament_id = ? AND user_id = ?').get(tournament_id, req.user!.id) as { id: number } | undefined;
    if (existingReg) {
      targetRegId = existingReg.id;
    } else {
      // Auto-create registration slot if none exists yet
      const freshTournament = await db.prepare('SELECT available_slots, total_slots, entry_fee FROM tournaments WHERE id = ?').get(tournament_id) as any;
      if (!freshTournament || freshTournament.available_slots <= 0) {
        return res.status(400).json({ error: 'No slots available for this tournament.' });
      }
      const slotNum = freshTournament.total_slots - freshTournament.available_slots + 1;
      const newReg = await db.prepare(`
        INSERT INTO registrations (tournament_id, user_id, slot_number, payment_status)
        VALUES (?, ?, ?, 'pending')
      `).run(tournament_id, req.user!.id, slotNum);
      await db.prepare('UPDATE tournaments SET available_slots = available_slots - 1 WHERE id = ?').run(tournament_id);
      targetRegId = newReg.lastInsertRowid;
    }
  }

  const cleanRef = transaction_ref.trim().toUpperCase();

  // Duplicate transaction reference check (Requirement 5)
  const existingPayment = await db.prepare('SELECT id FROM payments WHERE transaction_ref = ?').get(cleanRef);
  if (existingPayment) {
    return res.status(400).json({ error: 'This Transaction/UTR Reference has already been submitted. Duplicate submissions are strictly prohibited.' });
  }

  try {
    const payment = await db.prepare(`
      INSERT INTO payments (registration_id, user_id, tournament_id, amount, upi_id, transaction_ref, screenshot_url, whatsapp_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      targetRegId,
      req.user!.id,
      tournament_id,
      parseInt(amount, 10) || 0,
      upi_id || '',
      cleanRef,
      screenshot_url || '',
      whatsapp_number || ''
    );

    await db.prepare(`
      UPDATE registrations
      SET payment_status = 'pending', updated_at = datetime('now')
      WHERE id = ?
    `).run(targetRegId);

    // Also update user's phone if whatsapp number is provided
    if (whatsapp_number && String(whatsapp_number).trim()) {
      await db.prepare("UPDATE users SET phone = COALESCE(NULLIF(phone, ''), ?), updated_at = datetime('now') WHERE id = ?").run(String(whatsapp_number).trim(), req.user!.id);
    }

    // Notify user
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Payment Submitted For Approval', 'Your UPI UTR reference has been sent to the Admin Panel. Our verification staff will review and approve your slot shortly.', 'payment')
    `).run(req.user!.id);

    // Notify staff
    const staff = await db.prepare("SELECT id FROM users WHERE role IN ('super_admin', 'payment_manager', 'tournament_manager')").all() as { id: number }[];
    const staffNotify = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'New Payment Waiting for Verification', ?, 'payment')
    `);
    for (const s of staff) {
      await staffNotify.run(s.id, `User ${req.user!.username} submitted UTR ${cleanRef} (₹${amount || 0}). Verify and approve in Payments tab.`);
    }

    syncDataBackup();

    return res.json({ success: true, paymentId: payment.lastInsertRowid, message: 'Payment submitted for admin approval.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record payment: ' + err.message });
  }
});

// User's own payment history
apiRouter.get('/payments/my', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const payments = await db.prepare(`
    SELECT p.*, t.title as tournament_title, t.match_at
    FROM payments p
    JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user!.id);

  return res.json({ payments });
});

// User Matches History (Completed tournaments participated by user with rank & earned rewards)
apiRouter.get('/user/matches', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const userId = req.user!.id;
  const username = req.user!.username;
  const ign = req.user!.free_fire_ign || '';

  const matches = await db.prepare(`
    SELECT 
      t.id as tournament_id,
      t.title,
      t.slug,
      t.banner_image,
      t.game_mode,
      t.map_name,
      t.entry_fee,
      t.prize_pool,
      t.match_at,
      t.status as tournament_status,
      r.slot_number,
      r.payment_status,
      r.created_at as registered_at,
      res.id as result_id,
      res.rank,
      COALESCE(res.kills, 0) as kills,
      COALESCE(res.placement_points, 0) as placement_points,
      COALESCE(res.kill_points, 0) as kill_points,
      COALESCE(res.total_points, 0) as total_points,
      COALESCE(res.prize_amount, 0) as prize_amount,
      COALESCE(res.notes, '') as notes
    FROM tournaments t
    LEFT JOIN registrations r ON r.tournament_id = t.id AND r.user_id = ?
    LEFT JOIN results res ON res.tournament_id = t.id AND (
      res.user_id = ? OR 
      res.player_name LIKE '%' || ? || '%' OR 
      (length(?) > 0 AND res.player_name LIKE '%' || ? || '%')
    )
    WHERE (t.status = 'Completed' OR res.id IS NOT NULL)
      AND (r.id IS NOT NULL OR res.id IS NOT NULL)
    GROUP BY t.id
    ORDER BY t.match_at DESC
  `).all(userId, userId, username, ign, ign) as any[];

  let totalWins = 0;
  let top3 = 0;
  let totalKills = 0;
  let totalPrizeWon = 0;

  for (const m of matches) {
    if (m.rank === 1) totalWins++;
    if (m.rank && m.rank <= 3) top3++;
    totalKills += Number(m.kills || 0);
    totalPrizeWon += Number(m.prize_amount || 0);
  }

  return res.json({
    matches,
    stats: {
      total_matches: matches.length,
      wins: totalWins,
      top_3: top3,
      total_kills: totalKills,
      total_prize_won: totalPrizeWon
    }
  });
});

// Admin: List All Payments with Filtering
apiRouter.get('/admin/payments', requireRole(['super_admin', 'payment_manager']), async (req: Request, res: Response) => {
  const { status } = req.query;
  let query = `
    SELECT p.*, u.username, u.email, u.free_fire_ign, u.free_fire_uid, u.phone,
           t.title as tournament_title, t.entry_fee,
           admin.username as verified_by_admin_name
    FROM payments p
    JOIN users u ON u.id = p.user_id
    JOIN tournaments t ON t.id = p.tournament_id
    LEFT JOIN users admin ON admin.id = p.verified_by_admin_id
  `;

  if (status && status !== 'all') {
    query += ' WHERE p.status = ?';
    query += ' ORDER BY p.created_at DESC';
    const payments = await db.prepare(query).all(String(status));
    return res.json({ payments });
  }

  query += " ORDER BY CASE p.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END, p.created_at DESC";
  const payments = await db.prepare(query).all();
  return res.json({ payments });
});

// Admin: Verify Payment (Approve or Reject with custom reason)
apiRouter.post('/admin/payments/:id/verify', requireRole(['super_admin', 'payment_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const paymentId = req.params.id;
  const { status, rejection_reason } = req.body; // status: 'approved' | 'rejected'

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be approved or rejected.' });
  }

  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }

  const now = new Date().toISOString();

  // Update Payment record
  await db.prepare(`
    UPDATE payments
    SET status = ?, rejection_reason = ?, verified_by_admin_id = ?, verified_at = ?
    WHERE id = ?
  `).run(
    status,
    status === 'rejected' ? (rejection_reason || 'UTR transaction could not be verified on bank records.') : '',
    req.user!.id,
    now,
    paymentId
  );

  // Update Registration record
  await db.prepare(`
    UPDATE registrations
    SET payment_status = ?, updated_at = ?
    WHERE id = ?
  `).run(status, now, payment.registration_id);

  // If rejected, free up the tournament slot
  if (status === 'rejected') {
    await db.prepare(`
      UPDATE tournaments
      SET available_slots = MIN(total_slots, available_slots + 1),
          status = 'Registration Open',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.tournament_id);
  }

  // Notify User
  const tournament = await db.prepare('SELECT title FROM tournaments WHERE id = ?').get(payment.tournament_id) as any;
  if (status === 'approved') {
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Payment Confirmed - Slot Locked!', ?, 'payment')
    `).run(
      payment.user_id,
      `Your UPI payment for ${tournament?.title || 'Tournament'} has been verified. Your slot is officially locked! View Room details in My Tournaments.`
    );
  } else {
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Payment Verification Declined', ?, 'payment')
    `).run(
      payment.user_id,
      `Your payment verification for ${tournament?.title || 'Tournament'} was rejected. Reason: ${rejection_reason || 'UTR could not be matched.'}`
    );
  }

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'VERIFY_PAYMENT', `${status.toUpperCase()} payment #${paymentId} for user #${payment.user_id}`);
  return res.json({ success: true, status });
});

apiRouter.put('/admin/payments/:id/verify', requireRole(['super_admin', 'payment_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  // Delegate to same handler logic
  const paymentId = req.params.id;
  const { status, rejection_reason } = req.body;
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be approved or rejected.' });
  }
  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE payments
    SET status = ?, rejection_reason = ?, verified_by_admin_id = ?, verified_at = ?
    WHERE id = ?
  `).run(status, status === 'rejected' ? (rejection_reason || 'UTR could not be verified.') : '', req.user!.id, now, paymentId);
  await db.prepare(`UPDATE registrations SET payment_status = ?, updated_at = ? WHERE id = ?`).run(status, now, payment.registration_id);
  if (status === 'rejected') {
    await db.prepare(`UPDATE tournaments SET available_slots = MIN(total_slots, available_slots + 1), status = 'Registration Open', updated_at = datetime('now') WHERE id = ?`).run(payment.tournament_id);
  }
  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'VERIFY_PAYMENT', `${status.toUpperCase()} payment #${paymentId}`);
  return res.json({ success: true, status });
});

// Admin: Issue Refund Record
apiRouter.post('/admin/payments/:id/refund', requireRole(['super_admin', 'payment_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const paymentId = req.params.id;
  const { reason, amount } = req.body;

  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found.' });
  }

  await db.prepare(`
    INSERT INTO refunds (payment_id, user_id, amount, reason, status, processed_by_admin_id)
    VALUES (?, ?, ?, ?, 'processed', ?)
  `).run(paymentId, payment.user_id, amount || payment.amount, reason || 'Tournament rescheduled or cancelled', req.user!.id);

  await db.prepare(`UPDATE payments SET status = 'refunded' WHERE id = ?`).run(paymentId);
  await db.prepare(`UPDATE registrations SET payment_status = 'refunded' WHERE id = ?`).run(payment.registration_id);

  await db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Refund Issued', ?, 'payment')
  `).run(payment.user_id, `A refund of ₹${amount || payment.amount} has been initiated for your tournament registration. Reason: ${reason}`);

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'REFUND_PAYMENT', `Refunded ₹${amount || payment.amount} on payment #${paymentId}`);
  return res.json({ success: true });
});


// ==========================================
// 5. DUO TEAM MANAGEMENT
// ==========================================

// Create Team
apiRouter.post('/teams', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const { name, tag } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Team name must be at least 3 characters.' });
  }

  const existing = await db.prepare('SELECT id FROM teams WHERE name = ?').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'A team with this name already exists.' });
  }

  const result = await db.prepare(`
    INSERT INTO teams (name, tag, captain_id)
    VALUES (?, ?, ?)
  `).run(name.trim(), (tag || '').trim().toUpperCase(), req.user!.id);

  // Add captain as member
  await db.prepare(`
    INSERT INTO team_members (team_id, user_id, role, status)
    VALUES (?, ?, 'captain', 'accepted')
  `).run(result.lastInsertRowid, req.user!.id);

  return res.json({ success: true, teamId: result.lastInsertRowid });
});

// Get User's Teams
apiRouter.get('/teams/my', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const teams = await db.prepare(`
    SELECT t.*, tm.role as member_role, tm.status as membership_status
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
  `).all(req.user!.id);

  // For each team, fetch all members
  const teamsWithMembers = await Promise.all(teams.map(async (team: any) => {
    const members = await db.prepare(`
      SELECT tm.id as membership_id, tm.role, tm.status, tm.joined_at,
             u.id as user_id, u.username, u.free_fire_ign, u.free_fire_uid, u.avatar_url
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
    `).all(team.id);
    return { ...team, members };
  }));

  // Pending invitations sent to this user
  const pendingInvites = await db.prepare(`
    SELECT tm.id as invite_id, t.id as team_id, t.name as team_name, t.tag,
           captain.username as captain_name
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN users captain ON captain.id = t.captain_id
    WHERE tm.user_id = ? AND tm.status = 'invited'
  `).all(req.user!.id);

  return res.json({ teams: teamsWithMembers, pendingInvites });
});

// Invite Teammate
apiRouter.post('/teams/:id/invite', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const teamId = req.params.id;
  const { username } = req.body;

  const team = await db.prepare('SELECT captain_id, name FROM teams WHERE id = ?').get(teamId) as any;
  if (!team || team.captain_id !== req.user!.id) {
    return res.status(403).json({ error: 'Only team captains can invite members.' });
  }

  // Check current member count
  const count = await db.prepare('SELECT count(*) as count FROM team_members WHERE team_id = ?').get(teamId) as { count: number };
  if (count.count >= 2) {
    return res.status(400).json({ error: 'Duo team is already complete (2/2 members).' });
  }

  const targetUser = (await db.prepare('SELECT id, username FROM users WHERE username = ?').get(username.trim().toLowerCase())) as any;
  if (!targetUser) {
    return res.status(404).json({ error: `User "${username}" was not found.` });
  }

  const existingMember = await db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, targetUser.id);
  if (existingMember) {
    return res.status(400).json({ error: 'User is already part of or invited to this team.' });
  }

  await db.prepare(`
    INSERT INTO team_members (team_id, user_id, role, status)
    VALUES (?, ?, 'member', 'invited')
  `).run(teamId, targetUser.id);

  // Notify invited user
  await db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Team Invitation', ?, 'tournament')
  `).run(targetUser.id, `You were invited by ${req.user!.username} to join Duo Team "${team.name}". Check My Teams to accept.`);

  return res.json({ success: true, message: `Invite sent to ${username}!` });
});

// Accept or Reject Invitation
apiRouter.post('/teams/invites/:inviteId/respond', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const inviteId = req.params.inviteId;
  const { accept } = req.body;

  const invite = await db.prepare('SELECT * FROM team_members WHERE id = ? AND user_id = ?').get(inviteId, req.user!.id) as any;
  if (!invite) {
    return res.status(404).json({ error: 'Invitation not found.' });
  }

  if (accept) {
    await db.prepare("UPDATE team_members SET status = 'accepted', joined_at = datetime('now') WHERE id = ?").run(inviteId);
    return res.json({ success: true, message: 'Joined team!' });
  } else {
    await db.prepare('DELETE FROM team_members WHERE id = ?').run(inviteId);
    return res.json({ success: true, message: 'Invitation declined.' });
  }
});


// ==========================================
// 6. DYNAMIC CMS & WEBSITE PAGES (REQUIREMENTS 8 & 9)
// ==========================================

// Get All Pages
apiRouter.get('/cms/pages', async (req: Request & { user?: AuthUser }, res: Response) => {
  const isStaff = req.user && ['super_admin', 'content_manager'].includes(req.user.role);
  const pages = await db.prepare(`
    SELECT id, title, slug, meta_title, meta_description, is_published, is_system, version, updated_at
    FROM website_pages
    ${isStaff ? '' : 'WHERE is_published = 1'}
    ORDER BY is_system DESC, title ASC
  `).all();
  return res.json({ pages });
});

// Get Single Page by Slug (Public)
apiRouter.get('/cms/pages/:slug', async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const page = await db.prepare('SELECT * FROM website_pages WHERE slug = ?').get(slug);
  if (!page) {
    return res.status(404).json({ error: 'Page not found.' });
  }
  return res.json({ page });
});

// Admin: Create New Page
apiRouter.post('/cms/pages', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const { title, slug, content, meta_title, meta_description, og_title, og_description, is_published } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'Page title and URL slug are required.' });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const existing = await db.prepare('SELECT id FROM website_pages WHERE slug = ?').get(cleanSlug);
  if (existing) {
    return res.status(400).json({ error: 'A page with this URL slug already exists.' });
  }

  const result = await db.prepare(`
    INSERT INTO website_pages (title, slug, content, meta_title, meta_description, og_title, og_description, is_published, is_system, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `).run(
    title,
    cleanSlug,
    content || '',
    meta_title || title,
    meta_description || '',
    og_title || title,
    og_description || meta_description || '',
    is_published ? 1 : 0
  );

  // Record initial version in version history
  await db.prepare(`
    INSERT INTO page_versions (page_id, version_num, title, slug, content, meta_title, meta_description, edited_by_admin_name)
    VALUES (?, 1, ?, ?, ?, ?, ?, ?)
  `).run(
    result.lastInsertRowid,
    title,
    cleanSlug,
    content || '',
    meta_title || title,
    meta_description || '',
    req.user?.username || 'Admin'
  );

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'CREATE_PAGE', `Created CMS page: ${title} (/page/${cleanSlug})`);
  return res.json({ success: true, pageId: result.lastInsertRowid });
});

// Admin: Update Page (Saves Revision to Page Versions Table)
apiRouter.put('/cms/pages/:id', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const pageId = req.params.id;
  const { title, slug, content, meta_title, meta_description, og_title, og_description, is_published } = req.body;

  const currentPage = await db.prepare('SELECT * FROM website_pages WHERE id = ?').get(pageId) as any;
  if (!currentPage) {
    return res.status(404).json({ error: 'Page not found.' });
  }

  const newVersion = (currentPage.version || 1) + 1;
  const cleanSlug = currentPage.is_system ? currentPage.slug : (slug || currentPage.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  await db.prepare(`
    UPDATE website_pages
    SET title = ?, slug = ?, content = ?, meta_title = ?, meta_description = ?,
        og_title = ?, og_description = ?, is_published = ?, version = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title,
    cleanSlug,
    content,
    meta_title || title,
    meta_description || '',
    og_title || title,
    og_description || meta_description || '',
    is_published ? 1 : 0,
    newVersion,
    pageId
  );

  // Save version snapshot
  await db.prepare(`
    INSERT INTO page_versions (page_id, version_num, title, slug, content, meta_title, meta_description, edited_by_admin_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pageId,
    newVersion,
    title,
    cleanSlug,
    content,
    meta_title || title,
    meta_description || '',
    req.user?.username || 'Admin'
  );

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'UPDATE_PAGE', `Updated CMS page: ${title} (Version ${newVersion})`);
  return res.json({ success: true, version: newVersion });
});

// Admin: View Page Revisions
apiRouter.get('/cms/pages/:id/versions', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const pageId = req.params.id;
  const versions = await db.prepare(`
    SELECT * FROM page_versions WHERE page_id = ? ORDER BY version_num DESC
  `).all(pageId);
  return res.json({ versions });
});

// Admin: Restore Previous Revision (Requirement 18)
apiRouter.post('/cms/pages/:id/restore/:versionNum', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const pageId = req.params.id;
  const versionNum = req.params.versionNum;

  const targetVersion = await db.prepare('SELECT * FROM page_versions WHERE page_id = ? AND version_num = ?').get(pageId, versionNum) as any;
  if (!targetVersion) {
    return res.status(404).json({ error: 'Target revision not found.' });
  }

  const currentPage = await db.prepare('SELECT version FROM website_pages WHERE id = ?').get(pageId) as any;
  const nextVersion = (currentPage.version || 1) + 1;

  await db.prepare(`
    UPDATE website_pages
    SET title = ?, content = ?, meta_title = ?, meta_description = ?, version = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    targetVersion.title,
    targetVersion.content,
    targetVersion.meta_title,
    targetVersion.meta_description,
    nextVersion,
    pageId
  );

  // Record restoration as new version
  await db.prepare(`
    INSERT INTO page_versions (page_id, version_num, title, slug, content, meta_title, meta_description, edited_by_admin_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pageId,
    nextVersion,
    targetVersion.title,
    targetVersion.slug,
    targetVersion.content,
    targetVersion.meta_title,
    targetVersion.meta_description,
    `${req.user?.username || 'Admin'} (Restored v${versionNum})`
  );

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'RESTORE_PAGE_VERSION', `Restored page #${pageId} to revision ${versionNum}`);
  return res.json({ success: true, message: `Page restored to version ${versionNum}.` });
});

// Admin: Delete Page
apiRouter.delete('/cms/pages/:id', requireRole(['super_admin']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const pageId = req.params.id;
  const page = await db.prepare('SELECT is_system, title FROM website_pages WHERE id = ?').get(pageId) as any;
  if (!page) {
    return res.status(404).json({ error: 'Page not found.' });
  }
  if (page.is_system) {
    return res.status(400).json({ error: 'System policy pages cannot be deleted. You can unpublish or edit them.' });
  }

  await db.prepare('DELETE FROM website_pages WHERE id = ?').run(pageId);
  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'DELETE_PAGE', `Deleted page: ${page.title}`);
  return res.json({ success: true });
});


// ==========================================
// 7. HOMEPAGE BUILDER & NAVIGATION (REQUIREMENTS 10 & 11)
// ==========================================

// Get Homepage Sections
apiRouter.get('/cms/homepage-sections', async (req: Request, res: Response) => {
  const sections = await db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order ASC').all();
  return res.json({ sections });
});

// Update Homepage Section
apiRouter.put('/cms/homepage-sections/:id', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const id = req.params.id;
  const { title, subtitle, content_json, sort_order, is_enabled } = req.body;

  await db.prepare(`
    UPDATE homepage_sections
    SET title = ?, subtitle = ?, content_json = ?, sort_order = ?, is_enabled = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title,
    subtitle || '',
    typeof content_json === 'object' ? JSON.stringify(content_json) : content_json,
    parseInt(sort_order, 10) || 0,
    is_enabled ? 1 : 0,
    id
  );

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'UPDATE_HOMEPAGE_SECTION', `Updated section #${id}`);
  return res.json({ success: true });
});

// Reorder Homepage Sections
apiRouter.post('/cms/homepage-sections/reorder', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const { orders } = req.body; // Array of { id, sort_order }
  if (Array.isArray(orders)) {
    const updateStmt = db.prepare('UPDATE homepage_sections SET sort_order = ? WHERE id = ?');
    for (const item of orders) {
      await updateStmt.run(item.sort_order, item.id);
    }
  }
  return res.json({ success: true });
});

// Navigation Menu Items
apiRouter.get('/cms/navigation', async (req: Request, res: Response) => {
  const items = await db.prepare('SELECT * FROM navigation_items ORDER BY sort_order ASC').all();
  return res.json({ items });
});

apiRouter.post('/cms/navigation', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const { label, url, target, sort_order, is_footer } = req.body;
  const result = await db.prepare(`
    INSERT INTO navigation_items (label, url, target, sort_order, is_visible, is_footer)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(label, url, target || '_self', parseInt(sort_order, 10) || 0, is_footer ? 1 : 0);
  return res.json({ success: true, id: result.lastInsertRowid });
});

apiRouter.put('/cms/navigation/:id', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const id = req.params.id;
  const { label, url, target, sort_order, is_visible, is_footer } = req.body;

  await db.prepare(`
    UPDATE navigation_items
    SET label = ?, url = ?, target = ?, sort_order = ?, is_visible = ?, is_footer = ?
    WHERE id = ?
  `).run(label, url, target || '_self', parseInt(sort_order, 10) || 0, is_visible ? 1 : 0, is_footer ? 1 : 0, id);
  return res.json({ success: true });
});

apiRouter.delete('/cms/navigation/:id', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  await db.prepare('DELETE FROM navigation_items WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});


// ==========================================
// 8. FAQS & ANNOUNCEMENTS (REQUIREMENTS 13 & 14)
// ==========================================

// Public FAQs
apiRouter.get('/faqs', async (req: Request, res: Response) => {
  const faqs = await db.prepare('SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order ASC').all();
  return res.json({ faqs });
});

// Admin FAQs
apiRouter.get('/admin/faqs', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const faqs = await db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all();
  return res.json({ faqs });
});

apiRouter.post('/admin/faqs', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const { category, question, answer, sort_order } = req.body;
  const result = await db.prepare(`
    INSERT INTO faqs (category, question, answer, sort_order, is_published)
    VALUES (?, ?, ?, ?, 1)
  `).run(category || 'General', question, answer, parseInt(sort_order, 10) || 0);
  return res.json({ success: true, id: result.lastInsertRowid });
});

apiRouter.put('/admin/faqs/:id', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const { category, question, answer, sort_order, is_published } = req.body;
  await db.prepare(`
    UPDATE faqs SET category = ?, question = ?, answer = ?, sort_order = ?, is_published = ? WHERE id = ?
  `).run(category, question, answer, parseInt(sort_order, 10) || 0, is_published ? 1 : 0, id);
  return res.json({ success: true });
});

apiRouter.delete('/admin/faqs/:id', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  await db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Announcements
apiRouter.get('/announcements', async (req: Request, res: Response) => {
  const announcements = await db.prepare('SELECT * FROM announcements WHERE is_published = 1 AND is_banner_visible = 1 ORDER BY created_at DESC').all();
  return res.json({ announcements });
});

apiRouter.get('/admin/announcements', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const announcements = await db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
  return res.json({ announcements });
});

apiRouter.post('/admin/announcements', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const { title, content, banner_type, is_banner_visible } = req.body;
  const result = await db.prepare(`
    INSERT INTO announcements (title, content, banner_type, is_banner_visible, is_published)
    VALUES (?, ?, ?, ?, 1)
  `).run(title, content, banner_type || 'info', is_banner_visible ? 1 : 0);
  return res.json({ success: true, id: result.lastInsertRowid });
});

apiRouter.put('/admin/announcements/:id', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const { title, content, banner_type, is_banner_visible, is_published } = req.body;
  await db.prepare(`
    UPDATE announcements SET title = ?, content = ?, banner_type = ?, is_banner_visible = ?, is_published = ? WHERE id = ?
  `).run(title, content, banner_type, is_banner_visible ? 1 : 0, is_published ? 1 : 0, id);
  return res.json({ success: true });
});

apiRouter.delete('/admin/announcements/:id', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  await db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});


// ==========================================
// 9. MEDIA LIBRARY (REQUIREMENT 15)
// ==========================================

apiRouter.get('/media', async (req: Request, res: Response) => {
  const items = await db.prepare('SELECT * FROM media_library ORDER BY created_at DESC').all();
  return res.json({ items });
});

apiRouter.post('/media/upload', requireRole(['super_admin', 'content_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const { filename, original_name, mime_type, file_size, url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Media URL or Data URL is required.' });
  }

  // Security: Prevent executable files
  const cleanFilename = (original_name || filename || 'media_asset').replace(/[^a-zA-Z0-9._-]/g, '_');
  const lower = cleanFilename.toLowerCase();
  if (lower.endsWith('.exe') || lower.endsWith('.sh') || lower.endsWith('.php') || lower.endsWith('.bat')) {
    return res.status(400).json({ error: 'Executables and scripts are strictly prohibited.' });
  }

  const result = await db.prepare(`
    INSERT INTO media_library (filename, original_name, mime_type, file_size, url, uploaded_by_admin_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    cleanFilename,
    original_name || cleanFilename,
    mime_type || 'image/png',
    file_size || 0,
    url,
    req.user?.username || 'Admin'
  );

  return res.json({
    success: true,
    item: {
      id: result.lastInsertRowid,
      filename: cleanFilename,
      url
    }
  });
});

apiRouter.delete('/media/:id', requireRole(['super_admin', 'content_manager']), async (req: Request, res: Response) => {
  await db.prepare('DELETE FROM media_library WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});


// ==========================================
// 10. RESULTS & LEADERBOARD (REQUIREMENT 20)
// ==========================================

// Get Tournament Results
apiRouter.get('/results/tournament/:id', async (req: Request, res: Response) => {
  const tournamentId = req.params.id;
  const results = await db.prepare(`
    SELECT r.*, u.username, u.free_fire_ign, u.avatar_url, t.name as team_name
    FROM results r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN teams t ON t.id = r.team_id
    WHERE r.tournament_id = ?
    ORDER BY r.rank ASC
  `).all(tournamentId);

  return res.json({ results });
});

// Admin Submit Tournament Results
apiRouter.post('/admin/results/:tournamentId', requireRole(['super_admin', 'tournament_manager']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const tournamentId = req.params.tournamentId;
  const { entries } = req.body; // Array of results

  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Results entries array is required.' });
  }

  // Clear existing results for this tournament
  await db.prepare('DELETE FROM results WHERE tournament_id = ?').run(tournamentId);

  const insertResult = db.prepare(`
    INSERT INTO results (tournament_id, rank, user_id, team_id, player_name, kills, placement_points, kill_points, total_points, prize_amount, screenshot_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of entries) {
    const totalPts = (parseInt(item.placement_points, 10) || 0) + (parseInt(item.kills, 10) || 0);
    await insertResult.run(
      tournamentId,
      item.rank,
      item.user_id || null,
      item.team_id || null,
      item.player_name || 'Warrior',
      parseInt(item.kills, 10) || 0,
      parseInt(item.placement_points, 10) || 0,
      parseInt(item.kills, 10) || 0,
      totalPts,
      parseInt(item.prize_amount, 10) || 0,
      item.screenshot_url || '',
      item.notes || ''
    );

    // If user_id exists, notify them of result
    if (item.user_id) {
      await db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Match Results Published!', ?, 'match')
      `).run(item.user_id, `Results for your tournament are live! You finished Rank #${item.rank} with ${item.kills} kills and ${totalPts} points.`);
    }
  }

  // Mark tournament status as Completed
  await db.prepare("UPDATE tournaments SET status = 'Completed', updated_at = datetime('now') WHERE id = ?").run(tournamentId);

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'PUBLISH_RESULTS', `Published results for tournament #${tournamentId}`);
  return res.json({ success: true });
});

// Global Leaderboard
apiRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const leaderboard = await db.prepare(`
    SELECT * FROM leaderboard ORDER BY total_points DESC, wins DESC LIMIT 50
  `).all();
  return res.json({ leaderboard });
});


// ==========================================
// 11. IN-APP NOTIFICATIONS & SUPPORT TICKETS (REQUIREMENTS 21 & 22)
// ==========================================

// Get User Notifications
apiRouter.get('/notifications', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const notifications = await db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user!.id);
  const unreadCount = await db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user!.id) as { count: number };

  return res.json({ notifications, unreadCount: unreadCount.count });
});

// Mark Notification as Read
apiRouter.put('/notifications/:id/read', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  return res.json({ success: true });
});

// Mark All as Read
apiRouter.post('/notifications/mark-all-read', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  return res.json({ success: true });
});

// Support Tickets: User's tickets
apiRouter.get('/tickets/my', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const tickets = await db.prepare(`
    SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user!.id);
  return res.json({ tickets });
});

// Create Support Ticket
apiRouter.post('/tickets', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const { category, subject, message, screenshot_url, priority } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  const ticketCode = 'FLX-' + Math.floor(100000 + Math.random() * 900000);
  const result = await db.prepare(`
    INSERT INTO support_tickets (ticket_code, user_id, category, subject, message, screenshot_url, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
  `).run(
    ticketCode,
    req.user!.id,
    category || 'General',
    subject,
    message,
    screenshot_url || '',
    priority || 'medium'
  );

  return res.json({ success: true, ticketId: result.lastInsertRowid, ticketCode });
});

// Get Ticket Messages / Replies
apiRouter.get('/tickets/:id/messages', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const ticketId = req.params.id;
  const isStaff = ['super_admin', 'support_manager'].includes(req.user!.role);

  // Verify ownership if not staff
  const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as any;
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }
  if (!isStaff && ticket.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const replies = await db.prepare(`
    SELECT sr.*, u.username, u.role, u.avatar_url
    FROM support_replies sr
    JOIN users u ON u.id = sr.user_id
    WHERE sr.ticket_id = ?
    ORDER BY sr.created_at ASC
  `).all(ticketId);

  return res.json({ ticket, replies });
});

// Reply to Ticket
apiRouter.post('/tickets/:id/reply', requireAuth, async (req: Request & { user?: AuthUser }, res: Response) => {
  const ticketId = req.params.id;
  const { message, screenshot_url } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const isStaff = ['super_admin', 'support_manager'].includes(req.user!.role);
  const ticket = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as any;
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (!isStaff && ticket.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  await db.prepare(`
    INSERT INTO support_replies (ticket_id, user_id, is_admin, message, screenshot_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(ticketId, req.user!.id, isStaff ? 1 : 0, message, screenshot_url || '');

  // Update ticket status
  const nextStatus = isStaff ? 'in_progress' : 'open';
  await db.prepare("UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, ticketId);

  // If admin replied, notify user
  if (isStaff && ticket.user_id !== req.user!.id) {
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Support Replied: #' || ?, ?, 'support')
    `).run(ticket.user_id, ticket.ticket_code, `A support agent replied to your ticket "${ticket.subject}".`);
  }

  return res.json({ success: true });
});

// Admin: List All Support Tickets
apiRouter.get('/admin/tickets', requireRole(['super_admin', 'support_manager']), async (req: Request, res: Response) => {
  const tickets = await db.prepare(`
    SELECT st.*, u.username, u.email, u.phone
    FROM support_tickets st
    JOIN users u ON u.id = st.user_id
    ORDER BY CASE st.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, st.created_at DESC
  `).all();
  return res.json({ tickets });
});

// Admin: Update Ticket Status
apiRouter.put('/admin/tickets/:id/status', requireRole(['super_admin', 'support_manager']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const { status, priority } = req.body;
  await db.prepare(`
    UPDATE support_tickets SET status = ?, priority = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, priority, id);
  return res.json({ success: true });
});


// ==========================================
// 12. WEBSITE SETTINGS & APPEARANCE (REQUIREMENT 12 & 17)
// ==========================================

// Public Website Settings
apiRouter.get('/settings/public', async (req: Request, res: Response) => {
  const rows = await db.prepare('SELECT key, value FROM website_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return res.json({ settings });
});

// Admin: Update Website Settings
apiRouter.put('/admin/settings', requireRole(['super_admin']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required.' });
  }

  const upsert = db.prepare(`
    INSERT INTO website_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  for (const [key, value] of Object.entries(settings)) {
    await upsert.run(key, String(value));
  }

  syncDataBackup();

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'UPDATE_SETTINGS', 'Updated global website settings');
  return res.json({ success: true });
});


// ==========================================
// 13. ADMIN DASHBOARD & SECURITY AUDIT LOGS (REQUIREMENT 7 & 23)
// ==========================================

// Dashboard Statistics
apiRouter.get('/admin/stats', requireAdmin, async (req: Request, res: Response) => {
  const totalUsers = await db.prepare('SELECT count(*) as count FROM users WHERE is_deactivated = 0').get() as { count: number };
  const totalTournaments = await db.prepare('SELECT count(*) as count FROM tournaments').get() as { count: number };
  const liveMatches = await db.prepare("SELECT count(*) as count FROM tournaments WHERE status = 'Live'").get() as { count: number };
  const pendingPayments = await db.prepare("SELECT count(*) as count FROM payments WHERE status = 'pending'").get() as { count: number };
  const approvedPayments = await db.prepare("SELECT count(*) as count FROM payments WHERE status = 'approved'").get() as { count: number };
  const totalRevenue = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'approved'").get() as { total: number };
  const openTickets = await db.prepare("SELECT count(*) as count FROM support_tickets WHERE status = 'open'").get() as { count: number };

  // Recent 5 activity logs
  const recentLogs = await db.prepare('SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 5').all();

  return res.json({
    totalUsers: totalUsers.count,
    totalTournaments: totalTournaments.count,
    liveMatches: liveMatches.count,
    pendingPayments: pendingPayments.count,
    approvedPayments: approvedPayments.count,
    totalRevenue: totalRevenue.total,
    openTickets: openTickets.count,
    recentLogs
  });
});

// Admin: User Management List
apiRouter.get('/admin/users', requireRole(['super_admin']), async (req: Request, res: Response) => {
  const users = await db.prepare(`
    SELECT id, username, email, full_name, free_fire_uid, free_fire_ign, phone, role, is_blocked, is_deactivated, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();
  return res.json({ users });
});

// Admin: Update User Role or Block Status
apiRouter.put('/admin/users/:id', requireRole(['super_admin']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const id = req.params.id;
  const { role, is_blocked } = req.body;

  await db.prepare(`
    UPDATE users
    SET role = COALESCE(?, role), is_blocked = COALESCE(?, is_blocked), updated_at = datetime('now')
    WHERE id = ?
  `).run(role, is_blocked !== undefined ? (is_blocked ? 1 : 0) : null, id);

  syncDataBackup();

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'UPDATE_USER', `Updated user #${id} permissions / status`);
  return res.json({ success: true });
});

// Admin: Reset any user's password directly (encrypted with bcrypt)
apiRouter.put('/admin/users/:id/reset-password', requireRole(['super_admin']), async (req: Request & { user?: AuthUser }, res: Response) => {
  const id = req.params.id;
  const passwordToSet = req.body.newPassword || req.body.new_password;
  if (!passwordToSet || passwordToSet.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const passwordHash = hashPassword(passwordToSet);
  await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(passwordHash, id);

  syncDataBackup();

  logAdminActivity(req.user?.id, req.user?.username || 'Admin', 'RESET_USER_PASSWORD', `Admin reset password for user ID #${id}`);
  return res.json({ success: true, message: `Password for user #${id} has been reset successfully.` });
});

// Security & Audit Logs List
apiRouter.get('/admin/activity-logs', requireRole(['super_admin']), async (req: Request, res: Response) => {
  const logs = await db.prepare('SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 100').all();
  return res.json({ logs });
});
