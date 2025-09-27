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
  const limit = Math.max(1, Math.min(1000, parseInt(url.searchParams.get('limit') || '200', 10) || 200));
  const q = url.searchParams.get('q') || '';
  let query = sb.from('entitlements').select('*').order('updated_at', { ascending: false }).limit(limit);
  if (q) query = query.ilike('user_uid', `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

