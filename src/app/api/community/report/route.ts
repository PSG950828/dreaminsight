import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { moderateText } from '@/lib/moderation';

export async function POST(req: Request) {
  // CSRF/Origin check (optional)
  try {
    if (process.env.ENABLE_CSRF === 'true') {
      const origin = req.headers.get('origin') || '';
      const host = new URL(req.url).origin;
      const allow = (process.env.CSRF_ORIGIN_ALLOW || '').split(/[\s,]+/).filter(Boolean);
      if (origin && origin !== host && !allow.includes(origin)) {
        return NextResponse.json({ error: 'csrf_rejected' }, { status: 403 });
      }
    }
  } catch {}
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { post_id, reporter_uid, reason } = body || {};
  if (!post_id || !reporter_uid || !reason) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  // server-side rate limit (best-effort): 5/min per user
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await sb.from('telemetry_events').select('*', { count: 'exact', head: true }).eq('type', 'report').eq('k', 'submit').eq('user_uid', reporter_uid).gte('created_at', since);
    if ((count || 0) >= 5) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  } catch {}
  const t = String(reason||'').trim();
  if (t.length < 3 || t.length > 500) return NextResponse.json({ error: 'invalid_reason' }, { status: 400 });
  // Optional: sanitize/moderate reason text
  const mod = moderateText(t);
  if (!mod.ok && mod.violations.some(v => v.code === 'spam')) {
    try { await sb.from('telemetry_events').insert({ type: 'report', k: 'blocked.spam', delta: 1, user_uid: String(reporter_uid||'') }); } catch {}
    return NextResponse.json({ error: 'invalid_reason' }, { status: 400 });
  }
  // Ensure post exists
  try {
    const { data: post } = await sb.from('posts').select('id').eq('id', String(post_id)).single();
    if (!post) return NextResponse.json({ error: 'post_not_found' }, { status: 404 });
  } catch {}

  // Daily quota for reports (optional)
  try {
    const limit = parseInt(String(process.env.DAILY_QUOTA_REPORTS || '10'), 10) || 10;
    const since = new Date(Date.now() - 24*60*60*1000).toISOString();
    const { count } = await sb.from('telemetry_events').select('*', { count: 'exact', head: true })
      .eq('user_uid', String(reporter_uid||''))
      .eq('type', 'quota')
      .eq('k', 'report')
      .gte('created_at', since);
    if ((count || 0) >= limit) {
      return NextResponse.json({ error: 'quota_exceeded', upsell: true }, { status: 429 });
    }
  } catch {}
  await sb.rpc('set_reported', { p_post: post_id, p_state: true });
  const { error } = await sb.from('reports').insert({ post_id, reporter_uid, reason: t });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await sb.from('telemetry_events').insert({ type: 'quota', k: 'report', delta: 1, user_uid: String(reporter_uid||'') }); } catch {}
  try { await sb.from('telemetry_events').insert({ type: 'report', k: 'submit', delta: 1, user_uid: String(reporter_uid||'') }); } catch {}
  return NextResponse.json({ ok: true });
}
