/**
 * Ops Health Check Script
 * - Runs basic health checks and backup endpoints.
 * Usage:
 *   BASE_URL=http://localhost:3000 ADMIN_PASSWORD=your_pw \
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/ops-health.ts
 */

type JSONLike = any;

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

class CookieJar {
  private map = new Map<string, string>();
  get header(): string {
    const parts: string[] = [];
    for (const [k, v] of this.map.entries()) parts.push(`${k}=${encodeURIComponent(v)}`);
    return parts.join('; ');
  }
  mergeSetCookie(raw?: string | null) {
    if (!raw) return;
    // support multi-cookie in a single header by simple split (safe for our simple cookies)
    const items = raw.split(/,(?=[^;]+\s*=)/g);
    for (const it of items) {
      const p = it.split(';')[0].trim();
      const i = p.indexOf('=');
      if (i > 0) this.map.set(p.slice(0, i), decodeURIComponent(p.slice(i + 1)));
    }
  }
}

async function loginAdmin(jar: CookieJar) {
  if (!ADMIN_PASSWORD) return false;
  const r = await fetch(`${BASE_URL}/api/me-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD })
  });
  jar.mergeSetCookie(r.headers.get('set-cookie'));
  return r.ok;
}

async function getJSON(path: string, jar?: CookieJar): Promise<{ ok: boolean; status: number; json: JSONLike }>
{ const r = await fetch(`${BASE_URL}${path}`, { headers: jar ? { cookie: jar.header } : undefined }); const j = await r.json().catch(()=>({})); return { ok: r.ok, status: r.status, json: j }; }

async function postJSON(path: string, body?: any, jar?: CookieJar): Promise<{ ok: boolean; status: number; json: JSONLike; setCookie?: string | null }>
{ const r = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(jar? { cookie: jar.header }: {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(()=>({})); return { ok: r.ok, status: r.status, json: j, setCookie: r.headers.get('set-cookie') }; }

async function main() {
  const jar = new CookieJar();
  if (ADMIN_PASSWORD) {
    const ok = await loginAdmin(jar);
    console.log(`[ops] admin login: ${ok ? 'ok' : 'failed'}`);
  } else {
    console.log('[ops] ADMIN_PASSWORD not set — admin-only checks may fail');
  }

  // Health checks
  const health = await getJSON('/api/admin/health', jar);
  console.log('[ops] /api/admin/health', health.status, health.ok ? 'ok' : 'fail');
  if (!health.ok) console.log(JSON.stringify(health.json, null, 2));

  const storage = await getJSON('/api/community/storage/health', jar);
  console.log('[ops] /api/community/storage/health', storage.status, storage.ok ? 'ok' : 'fail');
  if (!storage.ok) console.log(JSON.stringify(storage.json, null, 2));

  // Backups (admin)
  const db = await postJSON('/api/admin/backup/db?days=30', null, jar);
  console.log('[ops] backup db', db.status, db.ok ? `ok (${(db.json?.files||[]).length || 0} files)` : 'fail');
  const st = await postJSON('/api/admin/backup/storage?days=30', null, jar);
  console.log('[ops] backup storage', st.status, st.ok ? `ok (posts with files: ${st.json?.withFiles ?? 0})` : 'fail');

  const list = await getJSON('/api/admin/backup/list', jar);
  console.log('[ops] backup list', list.status, list.ok ? `ok (db:${(list.json?.db||[]).length||0}, storage:${(list.json?.storage||[]).length||0})` : 'fail');

  // Summary
  const summary = {
    base: BASE_URL,
    admin: ADMIN_PASSWORD ? 'attempted' : 'skipped',
    health: health.ok,
    storage: storage.ok,
    backups: { db: db.ok, storage: st.ok, list: list.ok }
  };
  console.log('[ops] summary:', summary);
  process.exit((health.ok && storage.ok) ? 0 : 2);
}

main().catch((e) => { console.error('[ops] error', e?.message || e); process.exit(1); });

