import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { post_id, reporter_uid, reason } = body || {};
  if (!post_id || !reporter_uid || !reason) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  await sb.rpc('set_reported', { p_post: post_id, p_state: true });
  const { error } = await sb.from('reports').insert({ post_id, reporter_uid, reason });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

