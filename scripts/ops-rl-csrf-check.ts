/**
 * Ops — Rate Limit & CSRF Self Check
 * - Probes RL/quota on posts, comments, vote, report, upload and checks CSRF on write routes.
 * Usage:
 *   BASE_URL=http://localhost:3000 TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/ops-rl-csrf-check.ts
 * Options via env:
 *   BASE_URL      : target base URL (default http://localhost:3000)
 *   USER_UID      : override user uid for quota tests (default: random u_<...>)
 */

type J = any;

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USER_UID = process.env.USER_UID || `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
const DI_UID   = USER_UID; // use same id for cookie and body

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function postJSON(path: string, body: any, extra: { cookie?: string; origin?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (extra.cookie) headers['cookie'] = extra.cookie;
  if (extra.origin) headers['origin'] = extra.origin;
  const r = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  let j: J = null; try { j = await r.json(); } catch { j = {}; }
  return { status: r.status, ok: r.ok, json: j, retryAfter: r.headers.get('retry-after') } as const;
}

async function main() {
  console.log(`[ops] base=${BASE_URL} uid=${USER_UID}`);
  const cookie = `di_uid=${encodeURIComponent(DI_UID)}; Path=/; SameSite=Lax`;
  const postBody = (i: number) => ({ text: `RL/CSRF 점검 메시지 #${i} — ${new Date().toISOString()}`, anon_name: 'ops', user_uid: USER_UID, private: false });

  // 0) Create a base post for comments/vote/report/upload tests
  const base = await postJSON('/api/community/posts', postBody(0), { cookie });
  const basePostId = base.json?.post?.id || null;
  console.log(`[ops] base post:`, base.status, basePostId ? `ok (${basePostId})` : 'fail', base.json?.error || '');

  // 1) RL/Quota probe — rapid 5 posts (posts: 3/min expected)
  const postResults: Array<{status:number; ok:boolean; type:'ok'|'rl'|'quota'|'other'; retry?:string|null}> = [];
  for (let i=1; i<=5; i++) {
    const r = await postJSON('/api/community/posts', postBody(i), { cookie });
    const isQuota = r.status === 429 && String(r.json?.error||'').includes('quota');
    const isRL = r.status === 429 && !isQuota;
    const type = r.ok ? 'ok' : (isQuota ? 'quota' : (isRL ? 'rl' : 'other'));
    postResults.push({ status: r.status, ok: r.ok, type, retry: r.retryAfter });
    console.log(`[ops] posts#${i}:`, r.status, type, r.retryAfter ? `(retry-after:${r.retryAfter})` : '', r.json?.error || '');
    await sleep(200); // tiny gap to keep in same minute window
  }

  // 2) CSRF probe — send with foreign Origin (posts/comments/upload)
  const csrfPosts = await postJSON('/api/community/posts', postBody(999), { cookie, origin: 'https://evil.example' });
  const csrfObservedPosts = csrfPosts.status === 403 && String(csrfPosts.json?.error||'') === 'csrf_rejected';
  console.log(`[ops] csrf(posts):`, csrfPosts.status, csrfObservedPosts ? 'blocked' : 'not blocked');

  let csrfObservedComments = false;
  let csrfObservedUpload = false;
  if (basePostId) {
    const cBody = { post_id: basePostId, text: 'csrf probe', anon_name: 'ops', user_uid: USER_UID };
    const csrfComments = await postJSON('/api/community/comments', cBody, { cookie, origin: 'https://evil.example' });
    csrfObservedComments = csrfComments.status === 403 && String(csrfComments.json?.error||'') === 'csrf_rejected';
    console.log(`[ops] csrf(comments):`, csrfComments.status, csrfObservedComments ? 'blocked' : 'not blocked');

    const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAH+wK0Kx2ejwAAAABJRU5ErkJggg==';
    const uBody = { post_id: basePostId, dataUrl: `data:image/png;base64,${png1x1}`, user_uid: USER_UID };
    const csrfUpload = await postJSON('/api/community/upload', uBody, { cookie, origin: 'https://evil.example' });
    csrfObservedUpload = csrfUpload.status === 403 && String(csrfUpload.json?.error||'') === 'csrf_rejected';
    console.log(`[ops] csrf(upload):`, csrfUpload.status, csrfObservedUpload ? 'blocked' : 'not blocked');
  }

  // 3) Comments RL — send 12 comments quickly (limit ~10/min)
  let commentResults: Array<{status:number; ok:boolean; type:'ok'|'rl'|'quota'|'other'}> = [];
  if (basePostId) {
    for (let i=1; i<=12; i++) {
      const r = await postJSON('/api/community/comments', { post_id: basePostId, text: `ops c#${i}`, anon_name: 'ops', user_uid: USER_UID }, { cookie });
      const isQuota = r.status === 429 && String(r.json?.error||'').includes('quota');
      const isRL = r.status === 429 && !isQuota;
      const type = r.ok ? 'ok' : (isQuota ? 'quota' : (isRL ? 'rl' : 'other'));
      commentResults.push({ status: r.status, ok: r.ok, type });
      console.log(`[ops] comments#${i}:`, r.status, type, r.json?.error || '');
      await sleep(100);
    }
  } else {
    console.log('[ops] skip comments RL — base post not created');
  }

  // 4) Vote RL — send 35 toggles (limit 30/min server-side)
  let voteResults: Array<{status:number; ok:boolean; type:'ok'|'rl'|'other'}> = [];
  if (basePostId) {
    for (let i=1; i<=35; i++) {
      const r = await postJSON('/api/community/vote', { post_id: basePostId, user_uid: USER_UID }, { cookie });
      const isRL = r.status === 429;
      const type = r.ok ? 'ok' : (isRL ? 'rl' : 'other');
      voteResults.push({ status: r.status, ok: r.ok, type });
      if (i % 5 === 0) console.log(`[ops] vote#${i}:`, r.status, type);
      await sleep(50);
    }
  } else {
    console.log('[ops] skip vote RL — base post not created');
  }

  // 5) Report RL/Quota — send 6 reports (limit 5/min, daily quota configurable)
  let reportResults: Array<{status:number; ok:boolean; type:'ok'|'rl'|'quota'|'other'}> = [];
  if (basePostId) {
    for (let i=1; i<=6; i++) {
      const r = await postJSON('/api/community/report', { post_id: basePostId, reporter_uid: USER_UID, reason: `abuse test ${i}` }, { cookie });
      const isQuota = r.status === 429 && String(r.json?.error||'').includes('quota');
      const isRL = r.status === 429 && !isQuota;
      const type = r.ok ? 'ok' : (isQuota ? 'quota' : (isRL ? 'rl' : 'other'));
      reportResults.push({ status: r.status, ok: r.ok, type });
      console.log(`[ops] report#${i}:`, r.status, type, r.json?.error || '');
      await sleep(80);
    }
  } else {
    console.log('[ops] skip report RL — base post not created');
  }

  // 6) Upload RL — send 12 tiny PNG uploads (limit ~10/min); requires base post exists
  let uploadResults: Array<{status:number; ok:boolean; type:'ok'|'rl'|'quota'|'other'}> = [];
  if (basePostId) {
    const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAH+wK0Kx2ejwAAAABJRU5ErkJggg==';
    for (let i=1; i<=12; i++) {
      const r = await postJSON('/api/community/upload', { post_id: basePostId, dataUrl: `data:image/png;base64,${png1x1}`, user_uid: USER_UID }, { cookie });
      const isQuota = r.status === 429 && String(r.json?.error||'').includes('quota');
      const isRL = r.status === 429 && !isQuota;
      const type = r.ok ? 'ok' : (isQuota ? 'quota' : (isRL ? 'rl' : 'other'));
      uploadResults.push({ status: r.status, ok: r.ok, type });
      console.log(`[ops] upload#${i}:`, r.status, type, r.json?.error || '');
      await sleep(80);
    }
  } else {
    console.log('[ops] skip upload RL — base post not created');
  }

  // Summary/Exit code
  const sum = (arr: any[], key: string) => arr.filter((r: any) => r.type === key).length;
  const postsOK = postResults.filter(r=>r.ok).length, postsRL = sum(postResults,'rl'), postsQ = sum(postResults,'quota');
  const cmOK = commentResults.filter(r=>r.ok).length, cmRL = sum(commentResults,'rl'), cmQ = sum(commentResults,'quota');
  const vtOK = voteResults.filter(r=>r.ok).length, vtRL = sum(voteResults,'rl');
  const rpOK = reportResults.filter(r=>r.ok).length, rpRL = sum(reportResults,'rl'), rpQ = sum(reportResults,'quota');
  const upOK = uploadResults.filter(r=>r.ok).length, upRL = sum(uploadResults,'rl'), upQ = sum(uploadResults,'quota');
  console.log('[ops] summary');
  console.log(`  posts  : ok=${postsOK} rl=${postsRL} quota=${postsQ}`);
  console.log(`  comments: ok=${cmOK} rl=${cmRL} quota=${cmQ}`);
  console.log(`  vote   : ok=${vtOK} rl=${vtRL}`);
  console.log(`  report : ok=${rpOK} rl=${rpRL} quota=${rpQ}`);
  console.log(`  upload : ok=${upOK} rl=${upRL} quota=${upQ}`);
  console.log(`  csrf   : posts=${csrfObservedPosts} comments=${csrfObservedComments} upload=${csrfObservedUpload}`);

  // Exit non-zero only if no protection triggered at all across all buckets
  const protectionsObserved = (postsRL+postsQ+cmRL+cmQ+vtRL+rpRL+rpQ+upRL+upQ) > 0;
  process.exit(protectionsObserved ? 0 : 2);
}

main().catch((e)=>{ console.error('[ops] error', e?.message || e); process.exit(1); });
