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
  const url = new URL(req.url);
  const key = url.searchParams.get('key') || undefined;
  const q = key ? sb.from('admin_aliases').select('*').eq('sym_key', key) : sb.from('admin_aliases').select('*').limit(1000);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const sym_key = String(body?.key || '');
  const alias = String(body?.alias || '');
  if (!sym_key || !alias) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { error } = await sb.from('admin_aliases').upsert({ sym_key, alias });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const sym_key = String(body?.key || '');
  const alias = String(body?.alias || '');
  if (!sym_key || !alias) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { error } = await sb.from('admin_aliases').delete().eq('sym_key', sym_key).eq('alias', alias);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

