/**
 * Ops — Coverage Ingest
 * Logs in as admin, shows dry-run plan, then applies ingestion of unknown tokens
 * to server aliases using first suggestion for each token.
 *
 * Env:
 *  - BASE_URL (required)
 *  - ADMIN_PASSWORD (required)
 *  - DAYS (optional, default 14)
 *  - LIMIT (optional, default 500)
 *  - MIN (optional, default 3)
 */

import http from 'node:http';
import https from 'node:https';

function fetchWithCookies(url: string, opts: any = {}, jar: Record<string,string> = {}) {
  return new Promise<{ status: number; headers: any; text: string }>((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const headers: any = { ...(opts.headers || {}) };
    const cookie = Object.entries(jar).map(([k,v])=> `${k}=${encodeURIComponent(v)}`).join('; ');
    if (cookie) headers['cookie'] = cookie;
    const req = lib.request({ method: opts.method || 'GET', hostname: u.hostname, port: u.port || (u.protocol==='https:'?443:80), path: u.pathname + u.search, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c)=> chunks.push(Buffer.isBuffer(c)? c : Buffer.from(c)));
      res.on('end', ()=> {
        const text = Buffer.concat(chunks).toString('utf8');
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const list = Array.isArray(setCookie) ? setCookie : [setCookie];
          for (const c of list) {
            const [kv] = c.split(';');
            const i = kv.indexOf('=');
            if (i>0) jar[kv.slice(0,i)] = decodeURIComponent(kv.slice(i+1));
          }
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, text });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

(async () => {
  const BASE_URL = process.env.BASE_URL || '';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
  const DAYS = parseInt(process.env.DAYS || '14', 10) || 14;
  const LIMIT = parseInt(process.env.LIMIT || '500', 10) || 500;
  const MIN = parseInt(process.env.MIN || '3', 10) || 3;
  if (!BASE_URL || !ADMIN_PASSWORD) {
    console.error('[ops] BASE_URL and ADMIN_PASSWORD are required');
    process.exit(2);
  }
  const jar: Record<string,string> = {};
  // Login admin
  const login = await fetchWithCookies(new URL('/api/me-admin', BASE_URL).toString(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD })
  }, jar);
  if (login.status !== 200) {
    console.error('[ops] Admin login failed:', login.text);
    process.exit(1);
  }
  console.log('[ops] Admin login OK');

  // Dry-run
  const dry = await fetchWithCookies(new URL(`/api/admin/dict/ingest-coverage?days=${DAYS}&limit=${LIMIT}&min=${MIN}`, BASE_URL).toString(), { method: 'GET' }, jar);
  let plan: any = {};
  try { plan = JSON.parse(dry.text); } catch {}
  console.log(`[ops] Dry-run: planned=${plan.planned||0}/${plan.total||0} (days=${DAYS}, limit=${LIMIT}, min=${MIN})`);
  if (!plan || !Array.isArray(plan.plan) || plan.plan.length === 0) {
    console.log('[ops] Nothing to ingest.');
    process.exit(0);
  }

  // Apply
  const apply = await fetchWithCookies(new URL(`/api/admin/dict/ingest-coverage?days=${DAYS}&limit=${LIMIT}&min=${MIN}`, BASE_URL).toString(), { method: 'POST' }, jar);
  let res: any = {};
  try { res = JSON.parse(apply.text); } catch {}
  console.log(`[ops] Apply: ok=${res.ok||0}, skip=${res.skip||0}, fail=${res.fail||0}`);
  if ((res.fail||0) > 0) process.exitCode = 1;
})().catch((e) => { console.error('[ops] Error:', e?.message || e); process.exit(1); });

