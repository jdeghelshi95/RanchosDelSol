import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'ranchos.db');

// Ensure data directory exists
import fs from 'fs';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = sqlite;

// Run migrations on startup
export function initDb() {
  sqlite.exec(`
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

initDb();
