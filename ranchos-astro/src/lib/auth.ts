import type { AstroRequest } from 'astro';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ranchos2024admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ranchos-secret-key-change-in-production';

export function checkAdminAuth(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const sessionMatch = cookie.match(/admin_session=([^;]+)/);
  if (!sessionMatch) return false;
  
  try {
    const decoded = Buffer.from(sessionMatch[1], 'base64').toString('utf-8');
    const [token, timestamp] = decoded.split(':');
    const age = Date.now() - parseInt(timestamp);
    // Session valid for 24 hours
    if (age > 24 * 60 * 60 * 1000) return false;
    return token === SESSION_SECRET;
  } catch {
    return false;
  }
}

export function createSessionCookie(): string {
  const token = Buffer.from(`${SESSION_SECRET}:${Date.now()}`).toString('base64');
  return `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`;
}

export function clearSessionCookie(): string {
  return 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
