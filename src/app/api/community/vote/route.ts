import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { post_id, user_uid } = body || {};
  if (!post_id || !user_uid) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { data, error } = await sb.rpc('toggle_vote', { p_post: post_id, p_uid: user_uid });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ likes: data });
}

