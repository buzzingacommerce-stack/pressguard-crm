import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'pressguard.db');

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  initSchema(db);
  dbInstance = db;
  return db;
}

export function getDbPath() {
  return DB_PATH;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL DEFAULT 'PressGuard Publishing House',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      currency_code TEXT NOT NULL DEFAULT 'INR',
      soft_warning_pct INTEGER NOT NULL DEFAULT 80,
      overdue_hold_days INTEGER NOT NULL DEFAULT 15,
      ceo_overdue_days INTEGER NOT NULL DEFAULT 30,
      ceo_value_threshold REAL NOT NULL DEFAULT 200000,
      legal_overdue_days INTEGER NOT NULL DEFAULT 60,
      legal_value_threshold REAL NOT NULL DEFAULT 300000,
      max_broken_ptps INTEGER NOT NULL DEFAULT 2,
      interest_rate_pa REAL NOT NULL DEFAULT 18.0,
      block_advance_if_overdue INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Distributor',
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      gstin TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT 'B',
      credit_limit REAL NOT NULL DEFAULT 300000,
      payment_terms_days INTEGER NOT NULL DEFAULT 30,
      cod_only INTEGER NOT NULL DEFAULT 0,
      manual_hold TEXT NOT NULL DEFAULT '',
      manual_hold_reason TEXT NOT NULL DEFAULT '',
      credit_status TEXT NOT NULL DEFAULT 'ACTIVE',
      escalation_level INTEGER NOT NULL DEFAULT 0,
      trust_score INTEGER NOT NULL DEFAULT 85,
      ptp_reset_at TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      channel TEXT NOT NULL DEFAULT 'WHATSAPP',
      channel_ref TEXT NOT NULL DEFAULT '',
      raw_message TEXT NOT NULL DEFAULT '',
      book_title TEXT NOT NULL,
      isbn TEXT NOT NULL DEFAULT '',
      edition TEXT NOT NULL DEFAULT 'Standard Print',
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      order_value REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'CREDIT',
      advance_ref TEXT NOT NULL DEFAULT '',
      gate_status TEXT NOT NULL DEFAULT 'PENDING',
      gate_pass_code TEXT NOT NULL DEFAULT '',
      block_reasons TEXT NOT NULL DEFAULT '[]',
      production_stage TEXT NOT NULL DEFAULT 'HOLD',
      dispatch_challan TEXT NOT NULL DEFAULT '',
      dispatched_at TEXT NOT NULL DEFAULT '',
      override_by TEXT NOT NULL DEFAULT '',
      override_reason TEXT NOT NULL DEFAULT '',
      override_condition TEXT NOT NULL DEFAULT '',
      override_expires_at TEXT NOT NULL DEFAULT '',
      override_requested INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT 'Order Desk',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      description TEXT NOT NULL DEFAULT '',
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      cheque_bounced INTEGER NOT NULL DEFAULT 0,
      bounce_details TEXT NOT NULL DEFAULT '',
      dispatch_pod TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      mode TEXT NOT NULL DEFAULT 'NEFT',
      reference_no TEXT NOT NULL DEFAULT '',
      payment_date TEXT NOT NULL,
      recorded_by TEXT NOT NULL DEFAULT 'Accounts',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collection_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      caller_name TEXT NOT NULL DEFAULT 'Telecalling Desk',
      outcome TEXT NOT NULL,
      ptp_amount REAL NOT NULL DEFAULT 0,
      ptp_date TEXT NOT NULL DEFAULT '',
      ptp_status TEXT NOT NULL DEFAULT 'NA',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS legal_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT NOT NULL UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      stage TEXT NOT NULL DEFAULT 'CASE_OPENED',
      trigger_reason TEXT NOT NULL DEFAULT '',
      claimed_principal REAL NOT NULL DEFAULT 0,
      claimed_interest REAL NOT NULL DEFAULT 0,
      advocate_name TEXT NOT NULL DEFAULT 'Adv. Meera Deshmukh (In-House Legal)',
      notice_sent_date TEXT NOT NULL DEFAULT '',
      cure_deadline TEXT NOT NULL DEFAULT '',
      next_action_date TEXT NOT NULL DEFAULT '',
      settlement_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coordination_feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_dept TEXT NOT NULL,
      to_depts TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      alert_type TEXT NOT NULL DEFAULT 'NOTE',
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      requires_ack INTEGER NOT NULL DEFAULT 0,
      ack_by TEXT NOT NULL DEFAULT '',
      ack_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_role TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      summary TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe migration for existing databases missing company_name
  const cols = db.prepare(`PRAGMA table_info(policies)`).all();
  if (!cols.some(c => c.name === 'company_name')) {
    db.exec(`ALTER TABLE policies ADD COLUMN company_name TEXT NOT NULL DEFAULT 'PressGuard Publishing House';`);
  }

  // Ensure default policy row exists
  const existing = db.prepare('SELECT id FROM policies WHERE id = 1').get();
  if (!existing) {
    db.prepare(`INSERT INTO policies (id) VALUES (1)`).run();
  }
}

export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateOffsetISO(daysDelta) {
  const d = new Date();
  d.setDate(d.getDate() + daysDelta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(isoStart, isoEnd) {
  if (!isoStart || !isoEnd) return 0;
  const a = new Date(`${isoStart.slice(0, 10)}T00:00:00Z`);
  const b = new Date(`${isoEnd.slice(0, 10)}T00:00:00Z`);
  return Math.floor((b - a) / 86400000);
}
