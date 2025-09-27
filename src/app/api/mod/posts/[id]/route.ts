import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  return /(?:^|;\s*)di_admin=1(?:;|$)/.test(cookie);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=>({} as any));
  if (typeof body?.hide === 'boolean') {
    await sb.rpc('set_reported', { p_post: id, p_state: body.hide });
    const { data } = await sb.from('posts').select('*').eq('id', id).single();
    return NextResponse.json({ ok: true, post: data });
  }
  return NextResponse.json({ error: 'bad_request' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  await sb.from('posts').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
