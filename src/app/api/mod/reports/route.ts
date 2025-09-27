import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  return /(?:^|;\s*)di_admin=1(?:;|$)/.test(cookie);
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const { data: r, error } = await sb.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const postIds = Array.from(new Set((r || []).map((x:any)=> x.post_id)));
  let posts: any[] = [];
  if (postIds.length) {
    const { data: p } = await sb.from('posts').select('*').in('id', postIds);
    posts = p || [];
  }
  return NextResponse.json({ reports: r || [], posts });
}

