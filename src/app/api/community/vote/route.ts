import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { post_id, user_uid } = body || {};
  if (!post_id || !user_uid) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  // server-side rate limit (best-effort): 30/min per user
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await sb.from('telemetry_events').select('*', { count: 'exact', head: true }).eq('type', 'vote').eq('k', 'toggle').eq('user_uid', user_uid).gte('created_at', since);
    if ((count || 0) >= 30) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  } catch {}
  // Ensure post exists; optional: block votes on reported posts
  try {
    const { data: post } = await sb.from('posts').select('id,reported').eq('id', String(post_id)).single();
    if (!post) {
      try { await sb.from('telemetry_events').insert({ type: 'vote', k: 'fail.not_found', delta: 1, user_uid }); } catch {}
      return NextResponse.json({ error: 'post_not_found' }, { status: 404 });
    }
    if ((post as any).reported) return NextResponse.json({ error: 'post_reported' }, { status: 400 });
  } catch {}
  const { data, error } = await sb.rpc('toggle_vote', { p_post: post_id, p_uid: user_uid });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await sb.from('telemetry_events').insert({ type: 'vote', k: 'toggle', delta: 1, user_uid }); } catch {}
  return NextResponse.json({ likes: data });
}
