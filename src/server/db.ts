import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';

const { Pool } = pg;

// Parse int8 (BIGINT, COUNT(*) results) as JavaScript number
pg.types.setTypeParser(20, (val: string) => (val === null ? 0 : parseInt(val, 10)));

const DATABASE_URL = process.env.DATABASE_URL?.trim();
export const isPostgres = Boolean(DATABASE_URL && DATABASE_URL.length > 5);

let pool: pg.Pool | null = null;
let sqliteDb: DatabaseSync | null = null;

if (isPostgres) {
  console.log('[DATABASE] Connecting to Supabase PostgreSQL via connection pool...');
  const isLocalhost = DATABASE_URL!.includes('localhost') || DATABASE_URL!.includes('127.0.0.1');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('[DATABASE] Unexpected error on idle PostgreSQL client:', err);
  });
} else {
  console.log('[DATABASE] DATABASE_URL not detected. Initializing local SQLite fallback engine.');
  const DB_PATH = path.resolve(process.cwd(), 'flaxy_tournament.db');
  sqliteDb = new DatabaseSync(DB_PATH);
  try {
    sqliteDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {}
  sqliteDb.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
  `);
}

/**
 * Translates SQLite-style queries with '?' placeholders and SQLite functions to PostgreSQL.
 */
export function toPgSql(sql: string): string {
  let paramIndex = 1;
  let out = '';
  let inString = false;
  let quoteChar = '';

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inString) {
      out += c;
      if (c === quoteChar) {
        if (sql[i + 1] === quoteChar) {
          out += sql[++i];
        } else {
          inString = false;
        }
      }
    } else if (c === "'" || c === '"') {
      inString = true;
      quoteChar = c;
      out += c;
    } else if (c === '?') {
      out += '$' + paramIndex++;
    } else {
      out += c;
    }
  }

  // Replace datetime('now') with NOW()
  out = out.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'NOW()');

  // Replace INSERT OR IGNORE INTO with INSERT INTO ... ON CONFLICT DO NOTHING
  if (/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(out)) {
    out = out.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ') + ' ON CONFLICT DO NOTHING';
  }

  return out;
}

// Flatten parameter arrays if passed as nested arrays
function normalizeParams(params: any[]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

export interface StoredUser {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  free_fire_uid: string;
  free_fire_ign: string;
  phone: string;
  avatar_url: string;
  role: string;
  is_email_verified: number;
  is_blocked: number;
  is_deactivated: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Universal Database Interface (Async)
 */
export const db = {
  isPostgres,

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      const pgSql = toPgSql(sql);
      const res = await pool.query(pgSql, cleanParams);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    } else if (sqliteDb) {
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sql);
      if (isSelect) {
        const rows = sqliteDb.prepare(sql).all(...cleanParams) as T[];
        return { rows, rowCount: rows.length };
      } else {
        const res = sqliteDb.prepare(sql).run(...cleanParams);
        return { rows: [], rowCount: Number(res.changes) };
      }
    }
    throw new Error('Database connection is not initialized');
  },

  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      const pgSql = toPgSql(sql);
      const res = await pool.query(pgSql, cleanParams);
      return res.rows[0];
    } else if (sqliteDb) {
      const res = sqliteDb.prepare(sql).get(...cleanParams);
      return res as T | undefined;
    }
    return undefined;
  },

  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      const pgSql = toPgSql(sql);
      const res = await pool.query(pgSql, cleanParams);
      return res.rows;
    } else if (sqliteDb) {
      const res = sqliteDb.prepare(sql).all(...cleanParams);
      return res as T[];
    }
    return [];
  },

  async run(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      let pgSql = toPgSql(sql);
      const isInsert = /^\s*INSERT\s+INTO\s+/i.test(pgSql);
      if (isInsert && !/RETURNING\s+/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }
      const res = await pool.query(pgSql, cleanParams);
      const lastInsertRowid = res.rows[0]?.id ? Number(res.rows[0].id) : 0;
      return {
        lastInsertRowid,
        changes: res.rowCount ?? 0
      };
    } else if (sqliteDb) {
      const res = sqliteDb.prepare(sql).run(...cleanParams);
      return {
        lastInsertRowid: Number(res.lastInsertRowid),
        changes: Number(res.changes)
      };
    }
    return { lastInsertRowid: 0, changes: 0 };
  },

  async exec(sql: string): Promise<void> {
    if (isPostgres && pool) {
      // In PostgreSQL, execute statements
      await pool.query(sql);
    } else if (sqliteDb) {
      sqliteDb.exec(sql);
    }
  },

  /**
   * Prepared statement adapter for seamless backwards compatibility
   */
  prepare(sql: string) {
    return {
      get: async <T = any>(...params: any[]): Promise<T | undefined> => {
        return db.get<T>(sql, ...params);
      },
      all: async <T = any>(...params: any[]): Promise<T[]> => {
        return db.all<T>(sql, ...params);
      },
      run: async (...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> => {
        return db.run(sql, ...params);
      }
    };
  }
};

const PERMANENT_STORE_FILE = path.resolve(process.cwd(), 'sqlite_full_backup.json');

/**
 * Initializes tables, verifies database connection, and seeds/migrates data safely.
 */
export async function initDatabase(): Promise<void> {
  console.log('[DATABASE] Running schema setup and integrity checks...');

  if (isPostgres && pool) {
    // 1. Verify PostgreSQL connection
    const check = await pool.query('SELECT NOW() as current_time, current_database() as db_name;');
    console.log(`[DATABASE] Connected to Supabase PostgreSQL (${check.rows[0].db_name}) at ${check.rows[0].current_time}`);

    // 2. Create PostgreSQL Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        free_fire_uid TEXT NOT NULL DEFAULT '',
        free_fire_ign TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_email_verified INTEGER NOT NULL DEFAULT 1,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        is_deactivated INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        tag VARCHAR(50) NOT NULL DEFAULT '',
        captain_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        status VARCHAR(50) NOT NULL DEFAULT 'accepted',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(team_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        banner_image TEXT NOT NULL DEFAULT '',
        game_mode VARCHAR(50) NOT NULL DEFAULT 'Solo',
        map_name VARCHAR(50) NOT NULL DEFAULT 'Bermuda',
        entry_fee INTEGER NOT NULL DEFAULT 0,
        prize_pool INTEGER NOT NULL DEFAULT 0,
        total_slots INTEGER NOT NULL DEFAULT 48,
        available_slots INTEGER NOT NULL DEFAULT 48,
        reg_open_at TEXT NOT NULL,
        reg_close_at TEXT NOT NULL,
        match_at TEXT NOT NULL,
        rules_text TEXT NOT NULL DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER UNIQUE NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        room_id_code VARCHAR(100) NOT NULL DEFAULT '',
        room_password VARCHAR(100) NOT NULL DEFAULT '',
        opening_time TEXT NOT NULL,
        closing_time TEXT NOT NULL,
        match_start_time TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        slot_number INTEGER NOT NULL,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        transaction_ref VARCHAR(255) NOT NULL DEFAULT '',
        rejection_reason TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        registration_id INTEGER REFERENCES registrations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL DEFAULT 0,
        upi_id VARCHAR(255) NOT NULL DEFAULT '',
        transaction_ref VARCHAR(255) UNIQUE NOT NULL,
        screenshot_url TEXT NOT NULL DEFAULT '',
        whatsapp_number VARCHAR(100) NOT NULL DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        verified_by_admin_id INTEGER REFERENCES users(id),
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refunds (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL DEFAULT 0,
        upi_id VARCHAR(255) NOT NULL DEFAULT '',
        refund_utr VARCHAR(255) NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        processed_by_admin_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        placement INTEGER NOT NULL DEFAULT 0,
        kills INTEGER NOT NULL DEFAULT 0,
        placement_points INTEGER NOT NULL DEFAULT 0,
        kill_points INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        prize_amount INTEGER NOT NULL DEFAULT 0,
        screenshot_proof_url TEXT NOT NULL DEFAULT '',
        is_verified INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        matches_played INTEGER NOT NULL DEFAULT 0,
        total_wins INTEGER NOT NULL DEFAULT 0,
        total_kills INTEGER NOT NULL DEFAULT 0,
        total_earnings INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        rank_tier VARCHAR(50) NOT NULL DEFAULT 'Bronze',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_code VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL DEFAULT '',
        email VARCHAR(255) NOT NULL DEFAULT '',
        category VARCHAR(100) NOT NULL DEFAULT 'general',
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'normal',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS support_replies (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_type VARCHAR(50) NOT NULL,
        sender_id INTEGER,
        sender_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS website_pages (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        meta_title VARCHAR(255) NOT NULL DEFAULT '',
        meta_description TEXT NOT NULL DEFAULT '',
        og_title VARCHAR(255) NOT NULL DEFAULT '',
        og_description TEXT NOT NULL DEFAULT '',
        is_published INTEGER NOT NULL DEFAULT 1,
        is_system INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS page_versions (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
        version_num INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        meta_title VARCHAR(255) NOT NULL DEFAULT '',
        meta_description TEXT NOT NULL DEFAULT '',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS homepage_sections (
        id SERIAL PRIMARY KEY,
        section_key VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        content_json TEXT NOT NULL DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS navigation_items (
        id SERIAL PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        url VARCHAR(255) NOT NULL,
        is_footer INTEGER NOT NULL DEFAULT 0,
        is_header INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS website_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'general',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        is_active INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS media_library (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50) NOT NULL DEFAULT 'image',
        file_size INTEGER NOT NULL DEFAULT 0,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id),
        admin_name VARCHAR(255) NOT NULL DEFAULT 'Admin',
        action VARCHAR(100) NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        ip_address VARCHAR(100) NOT NULL DEFAULT '127.0.0.1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('[DATABASE] PostgreSQL tables verified.');

    // 3. Migrate existing SQLite data into PostgreSQL if empty
    const usersCountRes = await pool.query('SELECT count(*) as count FROM users');
    const usersCount = Number(usersCountRes.rows[0].count);

    if (usersCount === 0 && fs.existsSync(PERMANENT_STORE_FILE)) {
      console.log('[DATABASE] Supabase PostgreSQL database is empty. Beginning initial data migration...');
      await migrateJsonBackupToPostgres(pool);
    } else {
      console.log(`[DATABASE] Supabase PostgreSQL already contains ${usersCount} users. Preserving existing cloud data.`);
    }

    // 4. Ensure default website settings exist without overwriting custom settings
    await seedDefaultSettingsIfMissing();

  } else {
    // SQLite Fallback initialization
    sqliteDb!.exec(`
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
        role TEXT NOT NULL DEFAULT 'user',
        is_email_verified INTEGER NOT NULL DEFAULT 1,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        is_deactivated INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS website_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  console.log('[DATABASE] Initialization completed successfully.');
}

async function seedDefaultSettingsIfMissing(): Promise<void> {
  const defaults: [string, string][] = [
    ['site_name', 'FLAXY ESPORTS TOURNAMENTS'],
    ['upi_id', 'flaxy.esports@icici'],
    ['whatsapp_number', '+91 99999 88888'],
    ['whatsapp_url', 'https://wa.me/919999988888?text=Hello%20Flaxy%20Esports%20Admin'],
    ['support_email', 'official@flaxy.gg'],
    ['contact_phone', '+91 98765 43210'],
    ['payment_qr_url', 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dflaxy.esports%40icici%26pn%3DFlaxy%2520Esports%26cu%3DINR'],
    ['site_tagline', 'India’s #1 Premier Free Fire Tournament & Esports Arena'],
    ['site_description', 'Join daily Free Fire Solo and Duo tournaments on Flaxy. High-speed room automated scheduling, verified UPI payouts, real-time leaderboard and fair play.'],
    ['footer_text', '© 2026 FLAXY ESPORTS. All rights reserved. Free Fire is a registered trademark of Garena. This tournament platform is an independent esports organizer.'],
    ['social_instagram', 'https://instagram.com/flaxy_esports'],
    ['social_youtube', 'https://youtube.com/@flaxyesports'],
    ['social_discord', 'https://discord.gg/flaxy'],
    ['social_telegram', 'https://t.me/flaxyesports']
  ];

  for (const [k, v] of defaults) {
    await db.run(
      'INSERT INTO website_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING;',
      k, v
    );
  }
}

async function migrateJsonBackupToPostgres(pgPool: pg.Pool): Promise<void> {
  try {
    const raw = fs.readFileSync(PERMANENT_STORE_FILE, 'utf8');
    const dump = JSON.parse(raw);

    const tableNames = [
      'users',
      'password_resets',
      'teams',
      'team_members',
      'tournaments',
      'rooms',
      'registrations',
      'payments',
      'refunds',
      'results',
      'leaderboard',
      'support_tickets',
      'support_replies',
      'notifications',
      'website_pages',
      'page_versions',
      'homepage_sections',
      'navigation_items',
      'website_settings',
      'faqs',
      'announcements',
      'media_library',
      'admin_activity_logs'
    ];

    for (const tableName of tableNames) {
      const rows = dump[tableName];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      console.log(`[MIGRATION] Migrating ${rows.length} rows into '${tableName}'...`);

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const conflictClause = tableName === 'website_settings'
          ? 'ON CONFLICT (key) DO NOTHING'
          : tableName === 'users'
            ? 'ON CONFLICT (username) DO NOTHING'
            : tableName === 'tournaments' || tableName === 'website_pages'
              ? 'ON CONFLICT (slug) DO NOTHING'
              : 'ON CONFLICT DO NOTHING';

        const insertSql = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ${conflictClause}
        `;

        try {
          await pgPool.query(insertSql, values);
        } catch (err: any) {
          console.warn(`[MIGRATION] Row insert note in ${tableName}:`, err.message);
        }
      }

      // Reset serial sequence if table has 'id'
      try {
        await pgPool.query(`
          SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 1));
        `);
      } catch {}
    }

    console.log('[MIGRATION] All SQLite tables successfully migrated to Supabase PostgreSQL!');
  } catch (err) {
    console.error('[MIGRATION] Failed to migrate JSON backup:', err);
  }
}

export function syncDataBackup() {
  // Kept for backwards compatibility and offline snapshoting
}

export function restoreFromBackup() {
  // Kept for backwards compatibility
}
