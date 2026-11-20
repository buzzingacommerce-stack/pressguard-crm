import crypto from 'node:crypto';

export const SESSION_COOKIE = 'pg_session';
export const VALID_ROLES = ['CEO', 'SALES', 'PRODUCTION', 'TELECALLING', 'FINANCE', 'LEGAL'];

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const derived = crypto.scryptSync(String(password), salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function createSession(db, userId, daysValid = 14) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + daysValid * 86400000).toISOString();
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, exp);
  return { token, expiresAt: exp };
}

export function deleteSession(db, token) {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function getSessionUser(db, req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const row = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department, u.active, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);

  if (!row || !row.active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(db, token);
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    token
  };
}

export function sessionCookieHeader(token, clear = false) {
  if (clear) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${14 * 86400}`;
}

export function seedDefaultUsers(db) {
  const cnt = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  if (cnt > 0) return;

  const defaults = [
    ['Arjun Mehta (CEO)', 'ceo@pressguard.local', 'ceo123', 'CEO', 'Executive Management'],
    ['Neha Kapoor (Order Desk)', 'sales@pressguard.local', 'sales123', 'SALES', 'Sales & Order Intake'],
    ['Vikram Singh (Plant Head)', 'production@pressguard.local', 'prod123', 'PRODUCTION', 'Production & Dispatch'],
    ['Priya Sharma (Collections)', 'telecalling@pressguard.local', 'call123', 'TELECALLING', 'Telecalling & Recovery'],
    ['Rohan Iyer (Accounts Head)', 'finance@pressguard.local', 'fin123', 'FINANCE', 'Finance & Accounts'],
    ['Adv. Meera Deshmukh', 'legal@pressguard.local', 'legal123', 'LEGAL', 'Legal Department']
  ];

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  for (const [name, email, pass, role, dept] of defaults) {
    stmt.run(name, email, hashPassword(pass), role, dept);
  }
}
