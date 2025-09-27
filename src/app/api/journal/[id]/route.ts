import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function getUID(req: NextRequest): string {
  const cookie = (req.headers.get('cookie') || '').split(';').map(s=>s.trim());
  const map = new Map<string,string>();
  for (const c of cookie) {
    const i = c.indexOf('=');
    if (i > 0) map.set(c.slice(0,i), decodeURIComponent(c.slice(i+1)));
  }
  return map.get('di_uid') || '';
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const uid = getUID(req);
  if (!uid) return NextResponse.json({ error: 'no_uid' }, { status: 400 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 });
  const { error } = await sb.from('journals').delete().eq('id', id).eq('user_uid', uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

