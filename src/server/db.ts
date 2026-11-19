import 'dotenv/config';
import dns from 'node:dns';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

// Prefer IPv4 DNS resolution for reliable Supabase connections on Render/cloud hosts
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

// Parse int8 (BIGINT, COUNT(*) results) as JavaScript number
pg.types.setTypeParser(20, (val: string) => (val === null ? 0 : parseInt(val, 10)));

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ''
  );
}

function buildPgPoolConfig(rawUrl: string): pg.PoolConfig {
  const isLocalhost = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
  let cleanUrl = rawUrl;

  if (!isLocalhost) {
    try {
      const parsed = new URL(rawUrl);
      // Avoid pg-connection-string sslmode=require verify-full conflict with Supabase pooler
      parsed.searchParams.delete('sslmode');
      parsed.searchParams.delete('uselibpqcompat');
      cleanUrl = parsed.toString();
    } catch {
      cleanUrl = rawUrl;
    }
  }

  return {
    connectionString: cleanUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
}

const DATABASE_URL = resolveDatabaseUrl();
export const isPostgres = Boolean(DATABASE_URL && DATABASE_URL.length > 5);

let pool: pg.Pool | null = null;
let devFallbackDb: any = null;

if (isPostgres) {
  console.log('[DATABASE] Connecting to Supabase PostgreSQL via pg connection pool...');
  pool = new Pool(buildPgPoolConfig(DATABASE_URL));

  pool.on('error', (err) => {
    console.error('[DATABASE] Unexpected error on idle PostgreSQL client:', err);
  });
} else if (process.env.NODE_ENV === 'production') {
  console.error(
    '[DATABASE] FATAL: DATABASE_URL is not set in production! Add your Supabase PostgreSQL URI to Render Environment Variables.'
  );
}

/**
 * Translates '?' placeholders and standard expressions to PostgreSQL syntax.
 */
export function toPgSql(sql: string): string {
  let paramIndex = 1;
  let out = '';
  let inString = false;
  let quoteChar = '';

  const trimmed = sql.trim().replace(/;+\s*$/, '');

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inString) {
      out += c;
      if (c === quoteChar) {
        if (trimmed[i + 1] === quoteChar) {
          out += trimmed[++i];
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

function normalizeParams(params: any[]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0].map((v) => (v === undefined ? null : v));
  }
  return params.map((v) => (v === undefined ? null : v));
}

function createRunner(executor: { query: (sql: string, params?: any[]) => Promise<pg.QueryResult<any>> }) {
  return {
    async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
      const cleanParams = normalizeParams(params);
      const pgSql = toPgSql(sql);
      const res = await executor.query(pgSql, cleanParams);
      return res.rows[0] as T | undefined;
    },
    async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
      const cleanParams = normalizeParams(params);
      const pgSql = toPgSql(sql);
      const res = await executor.query(pgSql, cleanParams);
      return res.rows as T[];
    },
    async run(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
      const cleanParams = normalizeParams(params);
      let pgSql = toPgSql(sql);
      const isInsert = /^\s*INSERT\s+INTO\s+/i.test(pgSql);
      const targetsSettings = /\bwebsite_settings\b/i.test(pgSql);
      if (isInsert && !targetsSettings && !/\bRETURNING\b/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }
      const res = await executor.query(pgSql, cleanParams);
      const lastInsertRowid = res.rows[0]?.id ? Number(res.rows[0].id) : 0;
      return {
        lastInsertRowid,
        changes: res.rowCount ?? 0
      };
    },
    prepare(sql: string) {
      return {
        get: async <T = any>(...params: any[]): Promise<T | undefined> => this.get<T>(sql, ...params),
        all: async <T = any>(...params: any[]): Promise<T[]> => this.all<T>(sql, ...params),
        run: async (...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> =>
          this.run(sql, ...params)
      };
    }
  };
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
 * Universal PostgreSQL-first Database Interface
 */
export const db = {
  isPostgres,

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      const pgSql = toPgSql(sql);
      const res = await pool.query(pgSql, cleanParams);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    }
    if (devFallbackDb) {
      const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sql);
      if (isSelect) {
        const rows = devFallbackDb.prepare(sql).all(...cleanParams) as T[];
        return { rows, rowCount: rows.length };
      } else {
        const res = devFallbackDb.prepare(sql).run(...cleanParams);
        return { rows: [], rowCount: Number(res.changes) };
      }
    }
    throw new Error('Database connection is not initialized. Please set DATABASE_URL for Supabase PostgreSQL.');
  },

  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      return createRunner(pool).get<T>(sql, ...cleanParams);
    }
    if (devFallbackDb) {
      return devFallbackDb.prepare(sql).get(...cleanParams) as T | undefined;
    }
    throw new Error('Database connection is not initialized.');
  },

  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      return createRunner(pool).all<T>(sql, ...cleanParams);
    }
    if (devFallbackDb) {
      return devFallbackDb.prepare(sql).all(...cleanParams) as T[];
    }
    throw new Error('Database connection is not initialized.');
  },

  async run(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const cleanParams = normalizeParams(params);
    if (isPostgres && pool) {
      return createRunner(pool).run(sql, ...cleanParams);
    }
    if (devFallbackDb) {
      const res = devFallbackDb.prepare(sql).run(...cleanParams);
      return {
        lastInsertRowid: Number(res.lastInsertRowid),
        changes: Number(res.changes)
      };
    }
    throw new Error('Database connection is not initialized.');
  },

  async exec(sql: string): Promise<void> {
    if (isPostgres && pool) {
      await pool.query(sql);
      return;
    }
    if (devFallbackDb) {
      devFallbackDb.exec(sql);
      return;
    }
    throw new Error('Database connection is not initialized.');
  },

  async transaction<T>(fn: (tx: ReturnType<typeof createRunner>) => Promise<T>): Promise<T> {
    if (isPostgres && pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const runner = createRunner(client);
        const result = await fn(runner);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {}
        throw err;
      } finally {
        client.release();
      }
    }

    if (devFallbackDb) {
      devFallbackDb.exec('BEGIN TRANSACTION');
      try {
        const localRunner = {
          get: async <R = any>(sql: string, ...params: any[]) =>
            devFallbackDb.prepare(sql).get(...normalizeParams(params)) as R | undefined,
          all: async <R = any>(sql: string, ...params: any[]) =>
            devFallbackDb.prepare(sql).all(...normalizeParams(params)) as R[],
          run: async (sql: string, ...params: any[]) => {
            const r = devFallbackDb.prepare(sql).run(...normalizeParams(params));
            return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
          },
          prepare(sql: string) {
            return {
              get: async <R = any>(...p: any[]) => this.get<R>(sql, ...p),
              all: async <R = any>(...p: any[]) => this.all<R>(sql, ...p),
              run: async (...p: any[]) => this.run(sql, ...p)
            };
          }
        };
        const result = await fn(localRunner);
        devFallbackDb.exec('COMMIT');
        return result;
      } catch (err) {
        try {
          devFallbackDb.exec('ROLLBACK');
        } catch {}
        throw err;
      }
    }

    throw new Error('Database connection is not initialized.');
  },

  prepare(sql: string) {
    return {
      get: async <T = any>(...params: any[]): Promise<T | undefined> => db.get<T>(sql, ...params),
      all: async <T = any>(...params: any[]): Promise<T[]> => db.all<T>(sql, ...params),
      run: async (...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> => db.run(sql, ...params)
    };
  }
};

const BACKUP_SEED_FILE = path.resolve(process.cwd(), 'sqlite_full_backup.json');

/**
 * Initializes Supabase PostgreSQL tables, upgrades any missing columns safely,
 * and migrates initial seed data only if the database is completely empty.
 */
export async function initDatabase(): Promise<void> {
  console.log('[DATABASE] Running schema setup and integrity checks...');

  if (!isPostgres) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL environment variable is required in production. Set your Supabase PostgreSQL URI in Render Environment Variables.'
      );
    }

    console.warn(
      '[DATABASE] DATABASE_URL not set in local dev environment. Starting local dev preview store; set DATABASE_URL for Supabase PostgreSQL.'
    );
    const { DatabaseSync } = await import('node:sqlite');
    const localPreviewPath = path.resolve(process.cwd(), 'flaxy_tournament.db');
    devFallbackDb = new DatabaseSync(localPreviewPath);
    devFallbackDb.exec(`
      PRAGMA journal_mode = DELETE;
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
    `);
    await ensureLocalPreviewSchema();
    await seedDefaultSettingsIfMissing();
    console.log('[DATABASE] Local preview store initialized.');
    return;
  }

  if (!pool) {
    throw new Error('PostgreSQL pool failed to initialize.');
  }

  // 1. Verify Supabase PostgreSQL connection
  const check = await pool.query('SELECT NOW() as current_time, current_database() as db_name;');
  console.log(
    `[DATABASE] Connected to Supabase PostgreSQL (${check.rows[0].db_name}) at ${check.rows[0].current_time}`
  );

  // 2. Create all 23 PostgreSQL tables
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
      rejection_reason TEXT NOT NULL DEFAULT '',
      verified_by_admin_id INTEGER REFERENCES users(id),
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
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
      rank INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      player_name TEXT NOT NULL DEFAULT '',
      kills INTEGER NOT NULL DEFAULT 0,
      placement_points INTEGER NOT NULL DEFAULT 0,
      kill_points INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      prize_amount INTEGER NOT NULL DEFAULT 0,
      screenshot_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_verified INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL DEFAULT '',
      free_fire_ign TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      total_matches INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      total_kills INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      total_earnings INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      ticket_code VARCHAR(100) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '',
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      priority VARCHAR(50) NOT NULL DEFAULT 'normal',
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_replies (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'system',
      is_read INTEGER NOT NULL DEFAULT 0,
      link_url TEXT NOT NULL DEFAULT '',
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
      og_image TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 0,
      scheduled_publish_at TEXT,
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
      edited_by_admin_name VARCHAR(255) NOT NULL DEFAULT 'Admin',
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
      target VARCHAR(50) NOT NULL DEFAULT '_self',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      is_footer INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id SERIAL PRIMARY KEY,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      banner_type VARCHAR(50) NOT NULL DEFAULT 'info',
      is_banner_visible INTEGER NOT NULL DEFAULT 1,
      start_time TEXT,
      end_time TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL DEFAULT 'asset.png',
      original_name VARCHAR(255) NOT NULL DEFAULT 'asset.png',
      mime_type VARCHAR(100) NOT NULL DEFAULT 'image/png',
      file_size INTEGER NOT NULL DEFAULT 0,
      url TEXT NOT NULL DEFAULT '',
      uploaded_by_admin_name VARCHAR(255) NOT NULL DEFAULT 'Admin',
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

  // 3. Upgrade any existing Supabase tables with missing columns safely (non-destructive)
  await pool.query(`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT NOT NULL DEFAULT '';
    ALTER TABLE refunds ALTER COLUMN tournament_id DROP NOT NULL;

    ALTER TABLE results ADD COLUMN IF NOT EXISTS rank INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS player_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE results ADD COLUMN IF NOT EXISTS screenshot_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE results ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
    ALTER TABLE results ALTER COLUMN user_id DROP NOT NULL;

    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS player_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS free_fire_ign TEXT NOT NULL DEFAULT '';
    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS total_matches INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link_url TEXT NOT NULL DEFAULT '';

    ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS og_image TEXT NOT NULL DEFAULT '';
    ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS scheduled_publish_at TEXT;

    ALTER TABLE page_versions ADD COLUMN IF NOT EXISTS edited_by_admin_name VARCHAR(255) NOT NULL DEFAULT 'Admin';

    ALTER TABLE navigation_items ADD COLUMN IF NOT EXISTS target VARCHAR(50) NOT NULL DEFAULT '_self';
    ALTER TABLE navigation_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS screenshot_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE support_replies ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE support_replies ADD COLUMN IF NOT EXISTS is_admin INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE support_replies ADD COLUMN IF NOT EXISTS screenshot_url TEXT NOT NULL DEFAULT '';

    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS banner_type VARCHAR(50) NOT NULL DEFAULT 'info';
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_banner_visible INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS start_time TEXT;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS end_time TEXT;
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_published INTEGER NOT NULL DEFAULT 1;

    ALTER TABLE media_library ADD COLUMN IF NOT EXISTS filename VARCHAR(255) NOT NULL DEFAULT 'asset.png';
    ALTER TABLE media_library ADD COLUMN IF NOT EXISTS original_name VARCHAR(255) NOT NULL DEFAULT 'asset.png';
    ALTER TABLE media_library ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) NOT NULL DEFAULT 'image/png';
    ALTER TABLE media_library ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';
    ALTER TABLE media_library ADD COLUMN IF NOT EXISTS uploaded_by_admin_name VARCHAR(255) NOT NULL DEFAULT 'Admin';
  `);

  console.log('[DATABASE] Supabase PostgreSQL schema verified.');

  // 4. Seed initial data from backup JSON ONLY when users table is empty (first-time setup)
  const usersCountRes = await pool.query('SELECT count(*) as count FROM users');
  const usersCount = Number(usersCountRes.rows[0].count);

  if (usersCount === 0 && fs.existsSync(BACKUP_SEED_FILE)) {
    console.log('[DATABASE] Empty Supabase database detected. Seeding initial records once...');
    await migrateJsonBackupToPostgres(pool);
  } else {
    console.log(`[DATABASE] Supabase PostgreSQL contains ${usersCount} users. Preserving cloud records.`);
  }

  // 5. Insert missing default settings only (never overwrite user edits)
  await seedDefaultSettingsIfMissing();

  console.log('[DATABASE] Supabase PostgreSQL initialization completed.');
}

async function ensureLocalPreviewSchema(): Promise<void> {
  if (!devFallbackDb) return;
  devFallbackDb.exec(`
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
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      tag TEXT NOT NULL DEFAULT '',
      captain_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'accepted',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(team_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      banner_image TEXT NOT NULL DEFAULT '',
      game_mode TEXT NOT NULL DEFAULT 'Solo',
      map_name TEXT NOT NULL DEFAULT 'Bermuda',
      entry_fee INTEGER NOT NULL DEFAULT 0,
      prize_pool INTEGER NOT NULL DEFAULT 0,
      total_slots INTEGER NOT NULL DEFAULT 48,
      available_slots INTEGER NOT NULL DEFAULT 48,
      reg_open_at TEXT NOT NULL,
      reg_close_at TEXT NOT NULL,
      match_at TEXT NOT NULL,
      rules_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Upcoming',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER UNIQUE NOT NULL,
      room_id_code TEXT NOT NULL DEFAULT '',
      room_password TEXT NOT NULL DEFAULT '',
      opening_time TEXT NOT NULL,
      closing_time TEXT NOT NULL,
      match_start_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      team_id INTEGER,
      slot_number INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      transaction_ref TEXT NOT NULL DEFAULT '',
      rejection_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tournament_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER,
      user_id INTEGER NOT NULL,
      tournament_id INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      upi_id TEXT NOT NULL DEFAULT '',
      transaction_ref TEXT UNIQUE NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      whatsapp_number TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NOT NULL DEFAULT '',
      verified_by_admin_id INTEGER,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      tournament_id INTEGER,
      amount INTEGER NOT NULL DEFAULT 0,
      upi_id TEXT NOT NULL DEFAULT '',
      refund_utr TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      processed_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER,
      team_id INTEGER,
      player_name TEXT NOT NULL DEFAULT '',
      kills INTEGER NOT NULL DEFAULT 0,
      placement_points INTEGER NOT NULL DEFAULT 0,
      kill_points INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      prize_amount INTEGER NOT NULL DEFAULT 0,
      screenshot_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      player_name TEXT NOT NULL DEFAULT '',
      free_fire_ign TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      total_matches INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      total_kills INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0,
      total_earnings INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS support_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER,
      is_admin INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      screenshot_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      is_read INTEGER NOT NULL DEFAULT 0,
      link_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS website_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL DEFAULT '',
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
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
    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'General',
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      banner_type TEXT NOT NULL DEFAULT 'info',
      is_banner_visible INTEGER NOT NULL DEFAULT 1,
      start_time TEXT,
      end_time TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS media_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL DEFAULT 'asset.png',
      original_name TEXT NOT NULL DEFAULT 'asset.png',
      mime_type TEXT NOT NULL DEFAULT 'image/png',
      file_size INTEGER NOT NULL DEFAULT 0,
      url TEXT NOT NULL DEFAULT '',
      uploaded_by_admin_name TEXT NOT NULL DEFAULT 'Admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_name TEXT NOT NULL DEFAULT 'Admin',
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function seedDefaultSettingsIfMissing(): Promise<void> {
  const defaults: [string, string][] = [
    ['site_name', 'FLAXY ESPORTS TOURNAMENTS'],
    ['upi_id', 'flaxy.esports@icici'],
    ['whatsapp_number', '+91 99999 88888'],
    ['whatsapp_url', 'https://wa.me/919999988888?text=Hello%20Flaxy%20Esports%20Admin'],
    ['support_email', 'official@flaxy.gg'],
    ['contact_phone', '+91 98765 43210'],
    [
      'payment_qr_url',
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dflaxy.esports%40icici%26pn%3DFlaxy%2520Esports%26cu%3DINR'
    ],
    ['site_tagline', 'India’s #1 Premier Free Fire Tournament & Esports Arena'],
    [
      'site_description',
      'Join daily Free Fire Solo and Duo tournaments on Flaxy. High-speed room automated scheduling, verified UPI payouts, real-time leaderboard and fair play.'
    ],
    [
      'footer_text',
      '© 2026 FLAXY ESPORTS. All rights reserved. Free Fire is a registered trademark of Garena. This tournament platform is an independent esports organizer.'
    ],
    ['social_instagram', 'https://instagram.com/flaxy_esports'],
    ['social_youtube', 'https://youtube.com/@flaxyesports'],
    ['social_discord', 'https://discord.gg/flaxy'],
    ['social_telegram', 'https://t.me/flaxyesports']
  ];

  for (const [k, v] of defaults) {
    await db.run(
      'INSERT INTO website_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING',
      k,
      v
    );
  }
}

async function migrateJsonBackupToPostgres(pgPool: pg.Pool): Promise<void> {
  try {
    const raw = fs.readFileSync(BACKUP_SEED_FILE, 'utf8');
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

      console.log(`[MIGRATION] Seeding ${rows.length} initial rows into '${tableName}'...`);

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const conflictClause =
          tableName === 'website_settings'
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
          console.warn(`[MIGRATION] Row seed note in ${tableName}:`, err.message);
        }
      }

      try {
        await pgPool.query(`
          SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 1));
        `);
      } catch {}
    }

    console.log('[MIGRATION] Initial seed into Supabase PostgreSQL finished.');
  } catch (err) {
    console.error('[MIGRATION] Failed to seed backup JSON:', err);
  }
}

export function syncDataBackup() {
  // No-op: All writes persist directly in Supabase PostgreSQL
}

export function restoreFromBackup() {
  // No-op: Cloud PostgreSQL is the single source of truth
}
