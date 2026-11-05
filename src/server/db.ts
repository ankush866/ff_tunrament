import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DB_PATH = path.resolve(process.cwd(), 'flaxy_tournament.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for performance and concurrent readers
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export function initDatabase() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      free_fire_uid TEXT NOT NULL DEFAULT '',
      free_fire_ign TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user', -- user, super_admin, tournament_manager, payment_manager, content_manager, support_manager
      is_email_verified INTEGER NOT NULL DEFAULT 1,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      is_deactivated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Password Reset Tokens
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Teams Table (for Duo / Squad)
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      tag TEXT NOT NULL DEFAULT '',
      captain_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Team Members
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', -- captain, member
      status TEXT NOT NULL DEFAULT 'accepted', -- accepted, invited, declined
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Tournaments Table
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      banner_image TEXT NOT NULL DEFAULT '',
      game_mode TEXT NOT NULL DEFAULT 'Solo', -- Solo, Duo, Squad, Clash Squad
      map_name TEXT NOT NULL DEFAULT 'Bermuda', -- Bermuda, Purgatory, Kalahari, Alpine, Nextra
      entry_fee INTEGER NOT NULL DEFAULT 0,
      prize_pool INTEGER NOT NULL DEFAULT 0,
      total_slots INTEGER NOT NULL DEFAULT 48,
      available_slots INTEGER NOT NULL DEFAULT 48,
      reg_open_at TEXT NOT NULL,
      reg_close_at TEXT NOT NULL,
      match_at TEXT NOT NULL,
      rules_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Upcoming', -- Upcoming, Registration Open, Registration Closed, Full, Live, Completed, Cancelled
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Match Rooms Table
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER UNIQUE NOT NULL,
      room_id_code TEXT NOT NULL DEFAULT '',
      room_password TEXT NOT NULL DEFAULT '',
      opening_time TEXT NOT NULL, -- IST ISO string
      closing_time TEXT NOT NULL, -- IST ISO string
      match_start_time TEXT NOT NULL, -- IST ISO string
      status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, open, live, completed, cancelled
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    -- Registrations Table
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      team_id INTEGER,
      slot_number INTEGER,
      payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, refunded
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tournament_id, user_id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      tournament_id INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      upi_id TEXT NOT NULL DEFAULT '',
      transaction_ref TEXT UNIQUE NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      whatsapp_number TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, refunded
      rejection_reason TEXT NOT NULL DEFAULT '',
      verified_by_admin_id INTEGER,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (verified_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Refunds Table
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'processed',
      processed_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Results Table
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      user_id INTEGER,
      team_id INTEGER,
      player_name TEXT NOT NULL,
      kills INTEGER NOT NULL DEFAULT 0,
      placement_points INTEGER NOT NULL DEFAULT 0,
      kill_points INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      prize_amount INTEGER NOT NULL DEFAULT 0,
      screenshot_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Leaderboard Table
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      player_name TEXT NOT NULL,
      free_fire_ign TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      total_matches INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      total_kills INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      total_earnings INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Support Tickets Table
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL, -- Payment, Tournament, Room Issue, Account, Bug, Other
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
      status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
      assigned_to_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to_admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Support Replies Table
    CREATE TABLE IF NOT EXISTS support_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- In-app Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system', -- payment, room, match, tournament, system, support
      is_read INTEGER NOT NULL DEFAULT 0,
      link_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Dynamic Website Pages (CMS)
    CREATE TABLE IF NOT EXISTS website_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      meta_title TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      og_title TEXT NOT NULL DEFAULT '',
      og_description TEXT NOT NULL DEFAULT '',
      og_image TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 0,
      scheduled_publish_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Page Version History Table
    CREATE TABLE IF NOT EXISTS page_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      version_num INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      meta_title TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      edited_by_admin_name TEXT NOT NULL DEFAULT 'Admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (page_id) REFERENCES website_pages(id) ON DELETE CASCADE
    );

    -- Homepage Sections Builder
    CREATE TABLE IF NOT EXISTS homepage_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      content_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Navigation Menu Items
    CREATE TABLE IF NOT EXISTS navigation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '_self',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      is_footer INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Website Key-Value Settings
    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- FAQ Table
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'General',
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Announcements Table
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      banner_type TEXT NOT NULL DEFAULT 'info', -- info, warning, urgent
      is_banner_visible INTEGER NOT NULL DEFAULT 1,
      start_time TEXT,
      end_time TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Media Library
    CREATE TABLE IF NOT EXISTS media_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      file_size INTEGER NOT NULL DEFAULT 0,
      url TEXT NOT NULL,
      uploaded_by_admin_name TEXT NOT NULL DEFAULT 'Admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Admin Activity Logs
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec("ALTER TABLE payments ADD COLUMN whatsapp_number TEXT NOT NULL DEFAULT '';");
  } catch {}

  const defaultSettings = [
    ['site_name', 'FLAXY ESPORTS TOURNAMENTS'],
    ['upi_id', 'flaxy.esports@icici'],
    ['whatsapp_number', '+91 98765 43210'],
    ['whatsapp_url', 'https://wa.me/919876543210?text=Hello%20Flaxy%20Esports%20Admin'],
    ['support_email', 'support@flaxy.gg'],
    ['contact_phone', '+91 98765 43210'],
    ['payment_qr_url', 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dflaxy.esports%40icici%26pn%3DFlaxy%2520Esports%26cu%3DINR']
  ];
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO website_settings (key, value) VALUES (?, ?)
  `);
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }

  seedInitialData();
}

function seedInitialData() {
  // Check if users already exist
  const existingUsers = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (existingUsers.count === 0) {
    const adminHash = bcrypt.hashSync('ankushsharma@123@#', 10);
    const playerHash = bcrypt.hashSync('Player@123', 10);

    // 1. Super Admin
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'ankushsharma',
      'ankushsharma@flaxy.gg',
      adminHash,
      'Ankush Sharma (Super Admin)',
      '9988776655',
      'FLAXY_MASTER',
      '+91 9876543210',
      'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      'super_admin'
    );

    // 2. Tournament Manager
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'tournament_mgr',
      'tournament@flaxy.gg',
      adminHash,
      'Rahul Sharma',
      '1122334455',
      'FLAXY_OPS',
      '+91 9811122233',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'tournament_manager'
    );

    // 3. Payment Manager
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'payment_mgr',
      'payments@flaxy.gg',
      adminHash,
      'Priya Patel',
      '5566778899',
      'FLAXY_CASHIER',
      '+91 9822233344',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'payment_manager'
    );

    // 4. Content Manager
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'content_mgr',
      'content@flaxy.gg',
      adminHash,
      'Amit Verma',
      '4433221100',
      'FLAXY_EDITOR',
      '+91 9833344455',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      'content_manager'
    );

    // 5. Regular Players
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'flaxy_pro',
      'player1@flaxy.gg',
      playerHash,
      'Aakash Roy',
      '1948275931',
      'AK_DESTROYER',
      '+91 9912345678',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'user'
    );

    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'sniper_king',
      'player2@flaxy.gg',
      playerHash,
      'Vikram Seth',
      '8273619284',
      'AWM_SNIPER99',
      '+91 9923456789',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'user'
    );

    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, free_fire_uid, free_fire_ign, phone, avatar_url, role, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'rush_master',
      'player3@flaxy.gg',
      playerHash,
      'Karan Johal',
      '6371928492',
      'MP40_GOD',
      '+91 9934567890',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      'user'
    );
  }

  // Seed Default Website Settings
  const defaultSettings: Record<string, string> = {
    site_name: 'FLAXY ESPORTS',
    site_tagline: 'India’s #1 Premier Free Fire Tournament & Esports Arena',
    site_description: 'Join daily Free Fire Solo and Duo tournaments on Flaxy. High-speed room automated scheduling, verified UPI payouts, real-time leaderboard and fair play.',
    site_logo: '',
    support_email: 'support@flaxy.gg',
    contact_phone: '+91 98765 43210',
    whatsapp_url: 'https://wa.me/919876543210',
    upi_id: 'flaxy.esports@icici',
    payment_qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=flaxy.esports@icici&pn=FlaxyEsports&cu=INR',
    default_timezone: 'Asia/Kolkata',
    maintenance_mode: 'false',
    registration_enabled: 'true',
    primary_theme_color: '#f97316',
    secondary_theme_color: '#ef4444',
    background_theme_color: '#090d16',
    scoring_rules: JSON.stringify({
      placement_points: { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
      kill_point: 1
    }),
    footer_text: '© 2026 FLAXY ESPORTS. All rights reserved. Free Fire is a registered trademark of Garena. This tournament platform is an independent esports organizer.',
    social_instagram: 'https://instagram.com/flaxy_esports',
    social_youtube: 'https://youtube.com/@flaxyesports',
    social_discord: 'https://discord.gg/flaxy',
    social_telegram: 'https://t.me/flaxyesports'
  };

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO website_settings (key, value) VALUES (?, ?)
  `);
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }

  // Seed Default Tournaments
  const existingTournaments = db.prepare('SELECT count(*) as count FROM tournaments').get() as { count: number };
  if (existingTournaments.count === 0) {
    // Current time in IST reference
    const now = new Date();
    // Tournament 1: Tonight's Live Room Duo Blitz (Room scheduled 15 mins from now for instant demonstration!)
    const roomOpenTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const matchStartTime = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
    const roomCloseTime = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

    const t1 = db.prepare(`
      INSERT INTO tournaments (title, slug, banner_image, game_mode, map_name, entry_fee, prize_pool, total_slots, available_slots, reg_open_at, reg_close_at, match_at, rules_text, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Flaxy Duo Blitz - Clash Squad Bermuda',
      'flaxy-duo-blitz-clash-squad-bermuda',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      'Duo',
      'Bermuda',
      50,
      3500,
      24,
      18,
      new Date(now.getTime() - 86400000).toISOString(),
      roomOpenTime,
      matchStartTime,
      '1. Emulators NOT allowed. Mobile only.\n2. No hacking, scripts or config files. Permanent ban.\n3. Room ID & Password will be released here strictly at Room Opening Time.\n4. Join room within 10 minutes or your slot is forfeited without refund.',
      'Registration Open'
    );

    // Create Room for T1 with credentials
    db.prepare(`
      INSERT INTO rooms (tournament_id, room_id_code, room_password, opening_time, closing_time, match_start_time, status, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      t1.lastInsertRowid,
      '8492041',
      'FLAXY99',
      roomOpenTime,
      roomCloseTime,
      matchStartTime,
      'scheduled'
    );

    // Tournament 2: Solo Grand Championship
    const t2 = db.prepare(`
      INSERT INTO tournaments (title, slug, banner_image, game_mode, map_name, entry_fee, prize_pool, total_slots, available_slots, reg_open_at, reg_close_at, match_at, rules_text, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Bermuda Solo Survival Cup #42',
      'bermuda-solo-survival-cup-42',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
      'Solo',
      'Bermuda',
      30,
      6000,
      48,
      32,
      new Date(now.getTime() - 86400000).toISOString(),
      new Date(now.getTime() + 3600000 * 5).toISOString(),
      new Date(now.getTime() + 3600000 * 6).toISOString(),
      '1. Classic Battle Royale Solo.\n2. Teaming up with opponents is strictly prohibited.\n3. Gun attributes are active.\n4. Screen recording recommended in case of dispute.',
      'Registration Open'
    );

    // Create Room for T2
    db.prepare(`
      INSERT INTO rooms (tournament_id, room_id_code, room_password, opening_time, closing_time, match_start_time, status, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      t2.lastInsertRowid,
      '9921473',
      'SURVIVE',
      new Date(now.getTime() + 3600000 * 5).toISOString(),
      new Date(now.getTime() + 3600000 * 6 + 1800000).toISOString(),
      new Date(now.getTime() + 3600000 * 6).toISOString(),
      'scheduled'
    );

    // Tournament 3: Kalahari Desert War (Solo)
    db.prepare(`
      INSERT INTO tournaments (title, slug, banner_image, game_mode, map_name, entry_fee, prize_pool, total_slots, available_slots, reg_open_at, reg_close_at, match_at, rules_text, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Kalahari Sniper Elite Solo',
      'kalahari-sniper-elite-solo',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
      'Solo',
      'Kalahari',
      40,
      4500,
      48,
      45,
      new Date(now.getTime() - 43200000).toISOString(),
      new Date(now.getTime() + 86400000).toISOString(),
      new Date(now.getTime() + 86400000 + 3600000).toISOString(),
      'High tier snipers, high elevation battles. Standard competitive rules apply.',
      'Upcoming'
    );

    // Tournament 4: Completed Yesterday
    const t4 = db.prepare(`
      INSERT INTO tournaments (title, slug, banner_image, game_mode, map_name, entry_fee, prize_pool, total_slots, available_slots, reg_open_at, reg_close_at, match_at, rules_text, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Purgatory Mega Showdown #38',
      'purgatory-mega-showdown-38',
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800',
      'Solo',
      'Purgatory',
      50,
      10000,
      48,
      0,
      new Date(now.getTime() - 172800000).toISOString(),
      new Date(now.getTime() - 86400000).toISOString(),
      new Date(now.getTime() - 82800000).toISOString(),
      'Tournament completed. Prizes distributed to winners via UPI.',
      'Completed'
    );

    // Seed Results for completed tournament
    db.prepare(`
      INSERT INTO results (tournament_id, rank, user_id, player_name, kills, placement_points, kill_points, total_points, prize_amount, notes)
      VALUES
      (?, 1, 5, 'flaxy_pro (Aakash)', 11, 12, 11, 23, 5000, 'Booyah Champion'),
      (?, 2, 6, 'AWM_SNIPER99 (Vikram)', 8, 9, 8, 17, 3000, 'Runner Up'),
      (?, 3, 7, 'MP40_GOD (Karan)', 6, 8, 6, 14, 2000, '3rd Place Finish')
    `).run(t4.lastInsertRowid, t4.lastInsertRowid, t4.lastInsertRowid);

    // Seed Leaderboard
    db.prepare(`
      INSERT INTO leaderboard (user_id, player_name, free_fire_ign, avatar_url, total_matches, wins, total_kills, total_points, total_earnings)
      VALUES
      (5, 'Aakash Roy', 'AK_DESTROYER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 14, 6, 89, 210, 18500),
      (6, 'Vikram Seth', 'AWM_SNIPER99', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 16, 4, 76, 185, 12000),
      (7, 'Karan Johal', 'MP40_GOD', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', 12, 3, 64, 152, 9500)
    `).run();

    // Register player1 in Tournament 1 and auto-approve payment for instant testing of live room credentials
    const reg1 = db.prepare(`
      INSERT INTO registrations (tournament_id, user_id, slot_number, payment_status)
      VALUES (?, 5, 1, 'approved')
    `).run(t1.lastInsertRowid);

    db.prepare(`
      INSERT INTO payments (registration_id, user_id, tournament_id, amount, upi_id, transaction_ref, screenshot_url, status, verified_by_admin_id, verified_at)
      VALUES (?, 5, ?, 50, 'akash@oksbi', 'UPI/20261103/99281726', 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=500', 'approved', 1, datetime('now'))
    `).run(reg1.lastInsertRowid, t1.lastInsertRowid);

    // Register player2 in Tournament 1 with pending payment for admin verification testing
    const reg2 = db.prepare(`
      INSERT INTO registrations (tournament_id, user_id, slot_number, payment_status)
      VALUES (?, 6, 2, 'pending')
    `).run(t1.lastInsertRowid);

    db.prepare(`
      INSERT INTO payments (registration_id, user_id, tournament_id, amount, upi_id, transaction_ref, screenshot_url, status)
      VALUES (?, 6, ?, 50, 'vikram@paytm', 'UPI/20261103/48291048', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500', 'pending')
    `).run(reg2.lastInsertRowid, t1.lastInsertRowid);

    // Create a Duo Team for player 1 and player 2
    const team = db.prepare(`
      INSERT INTO teams (name, tag, captain_id)
      VALUES ('FLAXY TITANS', 'FT', 5)
    `).run();

    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role, status)
      VALUES (?, 5, 'captain', 'accepted'), (?, 6, 'member', 'accepted')
    `).run(team.lastInsertRowid, team.lastInsertRowid);
  }

  // Seed All 17 Default Website CMS Pages (Requirement 8 & 9)
  const existingPages = db.prepare('SELECT count(*) as count FROM website_pages').get() as { count: number };
  if (existingPages.count === 0) {
    const defaultPages = [
      {
        title: 'About Us',
        slug: 'about-us',
        content: `<h2>Welcome to Flaxy Esports</h2>
<p>Flaxy Esports is India's most trusted and high-octane Free Fire tournament platform. Founded by passionate competitive gamers for the esports community, Flaxy bridges the gap between grassroots players and professional gaming arenas.</p>
<h3>Our Mission</h3>
<p>To provide a zero-cheat, transparent, and rewarding platform where Free Fire warriors can test their skills, win guaranteed real cash prizes through instant UPI payouts, and elevate their competitive esports careers.</p>
<h3>Why Gamers Trust Flaxy</h3>
<ul>
<li><strong>Instant Room Credentials:</strong> Automated countdown timer reveals Room ID and Password directly on your dashboard.</li>
<li><strong>100% Guaranteed UPI Payouts:</strong> Same-day prize distribution verified by authorized staff.</li>
<li><strong>Strict Anti-Cheat Policy:</strong> Real-time room monitoring, mobile-only verification, and immediate ban for any scripting or teaming.</li>
<li><strong>Dedicated 24/7 Support:</strong> Instant ticketing system for dispute resolution.</li>
</ul>`,
        meta_title: 'About Flaxy Esports - Free Fire Tournament Platform',
        meta_description: 'Learn about Flaxy Esports, India premier Free Fire competitive tournament portal with automated room scheduling and instant UPI rewards.'
      },
      {
        title: 'Contact Us',
        slug: 'contact-us',
        content: `<h2>Contact Flaxy Esports Support</h2>
<p>Have questions regarding tournament schedules, payment verification, or room access? Our esports ops team is available 24/7 to assist you.</p>
<div class="contact-card">
<p><strong>Official Support Email:</strong> support@flaxy.gg</p>
<p><strong>WhatsApp Support Helpline:</strong> +91 98765 43210</p>
<p><strong>Discord Community Server:</strong> discord.gg/flaxy</p>
<p><strong>Business & Sponsorship Inquiries:</strong> business@flaxy.gg</p>
<p><strong>Operational Hours:</strong> 10:00 AM - 12:00 Midnight IST</p>
</div>
<p>For immediate in-app assistance, players can open a support ticket from their User Dashboard.</p>`,
        meta_title: 'Contact Us - Flaxy Free Fire Tournament Helpdesk',
        meta_description: 'Reach Flaxy tournament organizers via WhatsApp, Discord, or official email for tournament support and inquiries.'
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: `<h2>Flaxy Esports Privacy Policy</h2>
<p><em>Last updated: November 2026</em></p>
<p>At Flaxy Esports, we take the privacy of our players and tournament participants seriously. This document outlines the information we collect and how it is protected.</p>
<h3>1. Information We Collect</h3>
<ul>
<li>Account details: Username, Email address, Free Fire UID, and Free Fire In-Game Name (IGN).</li>
<li>Payment information: Transaction reference IDs (UTR numbers) and private verification screenshots. We never store credit/debit card numbers.</li>
<li>Activity logs: Room join timestamps, match statistics, and IP logs for cheat prevention.</li>
</ul>
<h3>2. How We Protect Your Data</h3>
<p>All passwords are encrypted with industry-standard bcrypt hashing. Payment receipts and Free Fire credentials are stored in secure databases and never shared with third parties.</p>
<h3>3. Data Retention and Account Deactivation</h3>
<p>Users may request complete account deactivation and removal of personal identifiers via the Account Settings panel.</p>`,
        meta_title: 'Privacy Policy - Flaxy Esports',
        meta_description: 'Read the Flaxy Esports privacy policy regarding data collection, Free Fire gaming credentials, and payment data security.'
      },
      {
        title: 'Terms & Conditions',
        slug: 'terms-and-conditions',
        content: `<h2>Terms & Conditions</h2>
<p>By registering on Flaxy Esports and entering our tournaments, you agree to comply with all rules and terms stated herein.</p>
<h3>1. Eligibility</h3>
<p>Participants must have an active Free Fire account in good standing. Players using emulators (PC/Mac) are strictly banned from mobile-only tournaments unless specified otherwise.</p>
<h3>2. Tournament Entry & Slots</h3>
<p>A slot is only confirmed once your manual UPI payment reference is verified and approved by the payment manager. Submitting fraudulent transaction IDs will lead to permanent blacklisting.</p>
<h3>3. Room Credentials Protocol</h3>
<p>Room ID and Password are confidential and provided exclusively to verified participants. Sharing credentials with unregistered players results in immediate disqualification without refund.</p>`,
        meta_title: 'Terms & Conditions - Flaxy Esports',
        meta_description: 'Terms and conditions for participating in Free Fire competitions on Flaxy Esports.'
      },
      {
        title: 'Refund Policy',
        slug: 'refund-policy',
        content: `<h2>Refund Policy</h2>
<p>Flaxy operates a fair and transparent refund mechanism for all registered participants.</p>
<h3>1. Tournament Cancellation</h3>
<p>If a tournament is cancelled by Flaxy management due to technical issues, game server maintenance, or insufficient registrations, a 100% full refund is issued back to the user's UPI within 24 hours.</p>
<h3>2. Rescheduled Matches</h3>
<p>If a match is rescheduled and a participant is unable to play at the new time, they may request a refund through a support ticket up to 1 hour before the new match start time.</p>
<h3>3. Disqualification & Forfeiture</h3>
<p>No refunds are granted if a player fails to join the room on time, violates tournament rules, or uses unauthorized third-party software.</p>`,
        meta_title: 'Refund Policy - Flaxy Esports',
        meta_description: 'Read the comprehensive refund policy of Flaxy Esports for cancelled or rescheduled matches.'
      },
      {
        title: 'Cancellation Policy',
        slug: 'cancellation-policy',
        content: `<h2>Cancellation Policy</h2>
<p>Players may cancel their tournament registration up to 2 hours before the scheduled room opening time for a full credit refund.</p>
<p>Once room credentials have been generated and the countdown begins within 30 minutes of room opening, cancellations are closed to ensure tournament slot integrity.</p>`,
        meta_title: 'Cancellation Policy - Flaxy Esports',
        meta_description: 'Learn about registration cancellation windows and slot withdrawal procedures on Flaxy.'
      },
      {
        title: 'Tournament Rules',
        slug: 'tournament-rules',
        content: `<h2>Official Free Fire Tournament Rules</h2>
<h3>1. Match Format</h3>
<ul>
<li><strong>Battle Royale:</strong> 48 players per lobby. Maps: Bermuda, Purgatory, Kalahari, Alpine.</li>
<li><strong>Clash Squad:</strong> 4v4 or 2v2 knockout rounds. First to 7 rounds wins.</li>
<li><strong>Lone Wolf:</strong> 1v1 or 2v2 tactical showdown.</li>
</ul>
<h3>2. Scoring System</h3>
<ul>
<li>1st Place (Booyah!): 12 Points</li>
<li>2nd Place: 9 Points</li>
<li>3rd Place: 8 Points</li>
<li>4th Place: 7 Points</li>
<li>5th Place: 6 Points</li>
<li>6th - 10th Place: 5 to 1 Points</li>
<li>Each Kill: 1 Point</li>
</ul>
<h3>3. Proof of Results</h3>
<p>The winning player or team captain must capture a clear end-game screenshot showing ranking, kills, and team members, and upload it via the match results portal.</p>`,
        meta_title: 'Official Free Fire Tournament Rules - Flaxy',
        meta_description: 'Official rules, scoring system, kill points, and placement rankings for Flaxy Free Fire tournaments.'
      },
      {
        title: 'Fair Play Policy',
        slug: 'fair-play-policy',
        content: `<h2>Fair Play & Anti-Cheat Policy</h2>
<p>Flaxy Esports maintains a strict zero-tolerance policy against any form of unfair play, including but not limited to:</p>
<ul>
<li>Aimbot, wallhacks, auto-headshot scripts, or altered APKs.</li>
<li>Teaming up with opposing players in Solo tournaments.</li>
<li>Use of PC emulators (BlueStacks, LDPlayer, Nox, etc.) in mobile-only brackets.</li>
<li>Smurfing or having a professional player play on your account.</li>
</ul>
<p>Violators face permanent device and account bans, forfeiture of all winnings, and notification to partner esports leagues.</p>`,
        meta_title: 'Fair Play Policy - Flaxy Esports',
        meta_description: 'Our zero-tolerance anti-cheat regulations and fair play guidelines for competitive Free Fire.'
      },
      {
        title: 'Community Guidelines',
        slug: 'community-guidelines',
        content: `<h2>Community Guidelines</h2>
<p>Flaxy is a respectful, competitive community. We expect all participants to:</p>
<ul>
<li>Treat fellow players, captains, and tournament administrators with respect.</li>
<li>Avoid abusive language, toxicity, or hate speech in public chats or ticket channels.</li>
<li>Never harass or dox tournament winners or opponents.</li>
</ul>`,
        meta_title: 'Community Guidelines - Flaxy Esports',
        meta_description: 'Community standards, code of conduct, and player respect guidelines on Flaxy.'
      },
      {
        title: 'FAQ',
        slug: 'faq',
        content: `<h2>Frequently Asked Questions</h2>
<p>Find answers to common questions about tournament joining, UPI payments, and room credentials.</p>
<p>Please visit our dedicated <a href="/faq">Interactive FAQ Hub</a> for live searchable answers categorized by Payments, Rooms, and Rules.</p>`,
        meta_title: 'Frequently Asked Questions - Flaxy Esports',
        meta_description: 'Quick answers about Free Fire tournaments, UPI payments, and custom room joining.'
      },
      {
        title: 'Help Center',
        slug: 'help-center',
        content: `<h2>Help Center & Knowledgebase</h2>
<p>Need help with your Flaxy account? Follow our comprehensive guides below:</p>
<ol>
<li><strong>How to register an account:</strong> Click Register, enter your username, email, and Free Fire UID.</li>
<li><strong>How to pay via UPI:</strong> Scan the payment QR code from Google Pay, PhonePe, or Paytm. Copy the 12-digit UTR reference ID and submit with screenshot.</li>
<li><strong>How to access the room:</strong> Navigate to My Tournaments 15 minutes before the match. When the countdown reaches zero, your Room ID and Password will appear.</li>
</ol>`,
        meta_title: 'Help Center - Flaxy Esports Knowledgebase',
        meta_description: 'Step-by-step guides for registration, payments, and joining Free Fire custom rooms.'
      },
      {
        title: 'Responsible Participation Policy',
        slug: 'responsible-participation-policy',
        content: `<h2>Responsible Participation Policy</h2>
<p>Competitive esports is an engaging sport of skill, teamwork, and quick reflexes. Flaxy promotes responsible participation among all our gamers:</p>
<ul>
<li>Do not spend more than you can comfortably afford on entry fees.</li>
<li>Take regular breaks between matches and stay hydrated.</li>
<li>Balance gaming with education, physical health, and family life.</li>
<li>If you feel gaming is negatively affecting your wellbeing, contact our support team to request a temporary or permanent timeout.</li>
</ul>`,
        meta_title: 'Responsible Participation Policy - Flaxy Esports',
        meta_description: 'Flaxy commitment to healthy gaming, mental wellness, and responsible participation.'
      },
      {
        title: 'Payment Information',
        slug: 'payment-information',
        content: `<h2>Payment Information & UPI Guidelines</h2>
<p>We accept manual UPI payments through all major payment applications in India, including PhonePe, Google Pay, Paytm, BHIM, and Cred.</p>
<h3>Verification Steps</h3>
<ol>
<li>Send the exact entry fee to our official UPI ID: <code>flaxy.esports@icici</code> or scan the dynamic QR code shown during checkout.</li>
<li>Locate the 12-digit UPI Reference Number / UTR in your payment receipt.</li>
<li>Upload a screenshot of the completed transaction.</li>
<li>Our payment verification team reviews your transaction reference against our bank statement. Once confirmed (typically 5 to 15 minutes), your tournament slot is locked in.</li>
</ol>`,
        meta_title: 'Payment Information - Flaxy UPI Verification',
        meta_description: 'How to pay entry fees and complete manual UPI verification on Flaxy Esports.'
      },
      {
        title: 'How to Join Tournament',
        slug: 'how-to-join-tournament',
        content: `<h2>How to Join a Flaxy Free Fire Tournament</h2>
<p>Follow these 4 simple steps to enter the arena and win cash prizes:</p>
<ol>
<li><strong>Select a Tournament:</strong> Browse the Tournaments page and choose your preferred Game Mode (Solo or Duo) and Map.</li>
<li><strong>Register & Pay:</strong> Click 'Join Tournament'. For Duo matches, select your teammate. Complete payment via UPI and submit the 12-digit UTR number.</li>
<li><strong>Check Dashboard:</strong> Go to 'My Tournaments' to track payment status. Once approved, you are on the confirmed roster.</li>
<li><strong>Get Room Details:</strong> Return to the match screen when the live countdown hits zero. Copy the Room ID and Password, open Free Fire, tap Custom Room, enter credentials, and jump into the battle!</li>
</ol>`,
        meta_title: 'How to Join Tournament - Step by Step Free Fire Guide',
        meta_description: 'Complete guide on how to register, pay via UPI, and receive Free Fire room ID & password.'
      },
      {
        title: 'Winners and Prizes Information',
        slug: 'winners-and-prizes-information',
        content: `<h2>Winners and Prize Distribution</h2>
<h3>Prize Pool Breakdown</h3>
<p>Every tournament has a transparent prize pool published before registration opens. Typical breakdown:</p>
<ul>
<li>1st Place (Booyah): 50% of Prize Pool + Champion Trophy Badge</li>
<li>2nd Place: 30% of Prize Pool</li>
<li>3rd Place: 20% of Prize Pool</li>
<li>Top Fragger (Highest Kills): Special Bonus Reward</li>
</ul>
<h3>Payout Timeline</h3>
<p>Prizes are sent directly to the winner's UPI ID or bank account within 2 hours of official match result verification.</p>`,
        meta_title: 'Winners and Prizes Information - Flaxy Esports',
        meta_description: 'Prize pool distribution, payout timelines, and reward criteria for Free Fire winners.'
      },
      {
        title: 'Disclaimer',
        slug: 'disclaimer',
        content: `<h2>Disclaimer</h2>
<p>Flaxy Esports is an independent platform organizing competitive esports tournaments of skill. Free Fire is a registered trademark of Garena International. Flaxy is neither endorsed by nor affiliated with Garena.</p>
<p>Participation in tournaments depends purely on the skill, knowledge, and execution of the participant.</p>`,
        meta_title: 'Disclaimer - Flaxy Esports',
        meta_description: 'Legal disclaimer regarding trademark ownership and independent esports competition.'
      },
      {
        title: 'Support Policy',
        slug: 'support-policy',
        content: `<h2>Support Policy</h2>
<p>Our player support team is committed to addressing every dispute, question, or transaction inquiry quickly and fairly.</p>
<ul>
<li>Payment inquiries are prioritized and processed within 15 minutes before match cutoff.</li>
<li>Room access disputes during live tournaments are addressed via live ticket desk.</li>
<li>Disciplinary appeals are reviewed by the Super Admin within 48 hours.</li>
</ul>`,
        meta_title: 'Support Policy - Flaxy Esports Service Standards',
        meta_description: 'Customer service commitments, response times, and dispute resolution policies on Flaxy.'
      }
    ];

    const insertPage = db.prepare(`
      INSERT INTO website_pages (title, slug, content, meta_title, meta_description, og_title, og_description, is_published, is_system, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
    `);

    const insertVersion = db.prepare(`
      INSERT INTO page_versions (page_id, version_num, title, slug, content, meta_title, meta_description, edited_by_admin_name)
      VALUES (?, 1, ?, ?, ?, ?, ?, 'System Seed')
    `);

    for (const p of defaultPages) {
      const res = insertPage.run(p.title, p.slug, p.content, p.meta_title, p.meta_description, p.title, p.meta_description);
      insertVersion.run(res.lastInsertRowid, p.title, p.slug, p.content, p.meta_title, p.meta_description);
    }
  }

  // Seed Homepage Sections
  const existingSections = db.prepare('SELECT count(*) as count FROM homepage_sections').get() as { count: number };
  if (existingSections.count === 0) {
    const sections = [
      {
        section_key: 'hero',
        title: 'DOMINATE THE BATTLEFIELD',
        subtitle: 'Enter India’s Most Prestigious Free Fire Esports Tournaments. Instant UPI Payouts & Automated Room Credentials.',
        content_json: JSON.stringify({
          cta_primary_text: 'Join Live Tournaments',
          cta_primary_link: '/tournaments',
          cta_secondary_text: 'View Leaderboard',
          cta_secondary_link: '/leaderboard',
          badge: 'OVER ₹1,00,000 DISTRIBUTED THIS MONTH',
          hero_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200'
        }),
        sort_order: 1
      },
      {
        section_key: 'stats',
        title: 'Flaxy By The Numbers',
        subtitle: 'Unrivaled esports infrastructure trusted by thousands of Free Fire players across India.',
        content_json: JSON.stringify({
          stat_1_number: '12,500+',
          stat_1_label: 'Registered Warriors',
          stat_2_number: '850+',
          stat_2_label: 'Tournaments Hosted',
          stat_3_number: '₹15,00,000+',
          stat_3_label: 'Prizes Paid via UPI',
          stat_4_number: '99.9%',
          stat_4_label: 'On-Time Room Opening'
        }),
        sort_order: 2
      },
      {
        section_key: 'featured_tournaments',
        title: 'Featured Tournaments',
        subtitle: 'Lock in your slot now before registration closes. Real cash prizes for Solo and Duo warriors.',
        content_json: JSON.stringify({
          limit: 3,
          show_filter: true
        }),
        sort_order: 3
      },
      {
        section_key: 'live_rooms_preview',
        title: 'Live Room Credentials Tracker',
        subtitle: 'Real-time countdown to Free Fire Room ID and Password release. Seamless 1-click copy.',
        content_json: JSON.stringify({
          featured_tournament_id: 1
        }),
        sort_order: 4
      },
      {
        section_key: 'why_choose_us',
        title: 'Why Top Players Choose Flaxy',
        subtitle: 'Built from the ground up for serious Free Fire competitors.',
        content_json: JSON.stringify({
          features: [
            { icon: 'ShieldCheck', title: 'Zero Cheat Tolerance', desc: 'Active spectator monitoring and instant bans for hacks or emulators.' },
            { icon: 'Zap', title: 'Automated Room Timers', desc: 'No manual delays. Credentials unlock instantly at the scheduled IST time.' },
            { icon: 'CheckCircle2', title: 'Verified UPI Payouts', desc: 'Same-day cash transfers directly to your PhonePe, GPay, or Paytm.' },
            { icon: 'Users', title: 'Duo & Team Support', desc: 'Create your duo roster, invite friends, and conquer together.' }
          ]
        }),
        sort_order: 5
      },
      {
        section_key: 'faq_preview',
        title: 'Common Questions',
        subtitle: 'Everything you need to know about competing on Flaxy.',
        content_json: JSON.stringify({
          limit: 4
        }),
        sort_order: 6
      },
      {
        section_key: 'cta_banner',
        title: 'Ready To Prove Your Skills?',
        subtitle: 'Sign up in under 60 seconds and claim your spot in today’s tournament.',
        content_json: JSON.stringify({
          button_text: 'Create Free Account',
          button_link: '/register'
        }),
        sort_order: 7
      }
    ];

    const insertSection = db.prepare(`
      INSERT INTO homepage_sections (section_key, title, subtitle, content_json, sort_order, is_enabled)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    for (const sec of sections) {
      insertSection.run(sec.section_key, sec.title, sec.subtitle, sec.content_json, sec.sort_order);
    }
  }

  // Seed Navigation Items
  const existingNav = db.prepare('SELECT count(*) as count FROM navigation_items').get() as { count: number };
  if (existingNav.count === 0) {
    const navItems = [
      { label: 'Home', url: '/', sort_order: 1, is_footer: 0 },
      { label: 'Tournaments', url: '/tournaments', sort_order: 2, is_footer: 0 },
      { label: 'Live Rooms', url: '/live-rooms', sort_order: 3, is_footer: 0 },
      { label: 'Leaderboard', url: '/leaderboard', sort_order: 4, is_footer: 0 },
      { label: 'Rules', url: '/page/tournament-rules', sort_order: 5, is_footer: 0 },
      { label: 'FAQ', url: '/faq', sort_order: 6, is_footer: 0 },
      // Footer items
      { label: 'About Us', url: '/page/about-us', sort_order: 1, is_footer: 1 },
      { label: 'Privacy Policy', url: '/page/privacy-policy', sort_order: 2, is_footer: 1 },
      { label: 'Terms & Conditions', url: '/page/terms-and-conditions', sort_order: 3, is_footer: 1 },
      { label: 'Refund Policy', url: '/page/refund-policy', sort_order: 4, is_footer: 1 },
      { label: 'Fair Play Policy', url: '/page/fair-play-policy', sort_order: 5, is_footer: 1 },
      { label: 'Contact Us', url: '/page/contact-us', sort_order: 6, is_footer: 1 }
    ];

    const insertNav = db.prepare(`
      INSERT INTO navigation_items (label, url, sort_order, is_visible, is_footer)
      VALUES (?, ?, ?, 1, ?)
    `);
    for (const n of navItems) {
      insertNav.run(n.label, n.url, n.sort_order, n.is_footer);
    }
  }

  // Seed FAQs
  const existingFaqs = db.prepare('SELECT count(*) as count FROM faqs').get() as { count: number };
  if (existingFaqs.count === 0) {
    const defaultFaqs = [
      {
        category: 'Payments',
        question: 'How do I pay the tournament entry fee via UPI?',
        answer: 'When you click Join Tournament, the official UPI ID (flaxy.esports@icici) and QR code will appear. Scan it using Google Pay, PhonePe, or Paytm, enter the 12-digit UPI Reference/UTR number, attach a screenshot, and submit. Our staff verifies it within 10 minutes.'
      },
      {
        category: 'Room Credentials',
        question: 'When and where will I get the Room ID and Password?',
        answer: 'Room credentials unlock automatically inside your Dashboard under "My Tournaments" exactly at the scheduled Room Opening Time. A live countdown on the match page indicates the exact seconds remaining.'
      },
      {
        category: 'Rules & Devices',
        question: 'Are PC or laptop emulators allowed?',
        answer: 'No. All Flaxy tournaments are strictly mobile-only (Android / iOS) unless explicitly designated as an Emulator Open event. Any emulator detection will result in an immediate forfeit.'
      },
      {
        category: 'Prizes',
        question: 'How soon are cash prizes transferred?',
        answer: 'Prizes are disbursed via direct UPI transfer within 2 hours of match result confirmation. You will receive an in-app notification with the payment receipt once processed.'
      },
      {
        category: 'Teams',
        question: 'How do Duo tournaments work with teammates?',
        answer: 'You can create a team in "My Teams" on your dashboard and invite your partner using their Flaxy username. Once accepted, you can select your duo team during tournament registration.'
      }
    ];

    const insertFaq = db.prepare(`
      INSERT INTO faqs (category, question, answer, sort_order, is_published)
      VALUES (?, ?, ?, ?, 1)
    `);
    defaultFaqs.forEach((f, idx) => insertFaq.run(f.category, f.question, f.answer, idx + 1));
  }

  // Seed Announcements
  const existingAnnouncements = db.prepare('SELECT count(*) as count FROM announcements').get() as { count: number };
  if (existingAnnouncements.count === 0) {
    db.prepare(`
      INSERT INTO announcements (title, content, banner_type, is_banner_visible, is_published)
      VALUES
      ('Tonight 8:45 PM IST Clash Squad Bermuda Tournament is LIVE!', 'Slots filling fast! Join now and compete for the ₹3,500 prize pool.', 'urgent', 1, 1),
      ('Strict Mobile Verification Active', 'Emulators will be permanently banned. Play fair and respect competitive integrity.', 'info', 1, 1)
    `).run();
  }
}

export { db };
