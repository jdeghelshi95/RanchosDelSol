import { createClient, type Client } from '@libsql/client';

// Turso / libSQL client — works on Vercel serverless and locally.
// Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your environment.
// For local dev without Turso, uses a local SQLite file automatically.

function createDb(): Client {
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/ranchos.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// Proxy that lazily initialises the client on first use
export const db = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getDb();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

// Run migrations — creates tables if they don't exist
export async function initDb(): Promise<void> {
  const client = getDb();
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('sedan','suv','truck','van','convertible','economy')),
      daily_rate REAL NOT NULL,
      description TEXT,
      features TEXT,
      seats INTEGER DEFAULT 5,
      transmission TEXT NOT NULL DEFAULT 'automatic' CHECK(transmission IN ('automatic','manual')),
      fuel_type TEXT NOT NULL DEFAULT 'gasoline' CHECK(fuel_type IN ('gasoline','diesel','electric','hybrid')),
      available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS car_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      file_key TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL REFERENCES cars(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      deposit_amount REAL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','active','completed','cancelled')),
      stripe_payment_intent_id TEXT,
      stripe_session_id TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','deposit_paid','paid')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// Initialize lazily — called by pages/API routes that need the DB
// This avoids crashing the entire app on startup if env vars are missing
let _initialized = false;
export async function ensureDb(): Promise<void> {
  if (_initialized) return;
  try {
    await initDb();
    _initialized = true;
  } catch (err) {
    console.error('[DB] Init error (non-fatal):', err);
  }
}
