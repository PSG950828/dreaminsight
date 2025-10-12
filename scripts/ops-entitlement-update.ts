/**
 * Ops — Entitlement Update (Admin)
 * - Logs in with ADMIN_PASSWORD and updates entitlements for a user.
 * Usage:
 *   BASE_URL=http://localhost:3000 ADMIN_PASSWORD=your_pw \
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/ops-entitlement-update.ts u_xxx 30
 *   # or with absolute until:
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/ops-entitlement-update.ts u_xxx 2025-12-31T15:00:00.000Z
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

class CookieJar { map = new Map<string,string>(); get header(){return Array.from(this.map.entries()).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('; ');} mergeSetCookie(raw?:string|null){ if(!raw) return; for(const it of raw.split(/,(?=[^;]+\s*=)/g)){ const p=it.split(';')[0].trim(); const i=p.indexOf('='); if(i>0) this.map.set(p.slice(0,i), decodeURIComponent(p.slice(i+1))); }}}

async function loginAdmin(jar: CookieJar) {
  if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD not set');
  const r = await fetch(`${BASE_URL}/api/me-admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  jar.mergeSetCookie(r.headers.get('set-cookie'));
  if (!r.ok) throw new Error('admin login failed');
}

async function postJSON(path: string, body: any, jar: CookieJar) {
  const r = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: jar.header }, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  return { ok: r.ok, status: r.status, json: j } as const;
}

function toISO(input: string): string | null {
  // numeric days → add days; otherwise try parse as ISO date
  if (/^\d+$/.test(input)) {
    const days = parseInt(input, 10);
    if (Number.isFinite(days) && days > 0) return new Date(Date.now() + days*24*60*60*1000).toISOString();
    return null;
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function main() {
  const [uid, untilArg] = process.argv.slice(2);
  if (!uid) {
    console.error('Usage: ts-node scripts/ops-entitlement-update.ts <user_uid> <days|iso_until>');
    process.exit(2);
  }
  const jar = new CookieJar();
  await loginAdmin(jar);
  const payload: any = { user_uid: uid, plus: true };
  if (untilArg) {
    const iso = toISO(untilArg);
    if (!iso) { console.error('Invalid days/ISO value for plus_until'); process.exit(2); }
    payload.plus_until = iso;
  }
  const r = await postJSON('/api/entitlements/update', payload, jar);
  console.log('[ops] entitlements.update', r.status, r.ok ? 'ok' : 'fail', r.json);
  process.exit(r.ok ? 0 : 1);
}

main().catch((e)=>{ console.error('[ops] error', e?.message || e); process.exit(1); });

