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

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const uid = getUID(req);
  if (!uid) return NextResponse.json({ error: 'no_uid' }, { status: 400 });
  const url = new URL(req.url);
  const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get('limit') || '500', 10) || 500));
  const { data, error } = await sb
    .from('journals')
    .select('id,text,analysis,created_at')
    .eq('user_uid', uid)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = (data || []).map((r:any) => ({ id: r.id, text: r.text, analysis: r.analysis || null, createdAt: new Date(r.created_at).getTime() }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const uid = getUID(req);
  if (!uid) return NextResponse.json({ error: 'no_uid' }, { status: 400 });
  const body = await req.json().catch(()=> ({} as any));
  const text = String(body?.text || '').trim();
  const analysis = body?.analysis || null;
  if (text.length < 3 || text.length > 5000) return NextResponse.json({ error: 'bad_length' }, { status: 400 });
  const { data, error } = await sb.from('journals').insert({ user_uid: uid, text, analysis }).select('id,text,analysis,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const j = { id: (data as any).id, text: (data as any).text, analysis: (data as any).analysis || null, createdAt: new Date((data as any).created_at).getTime() };
  return NextResponse.json({ journal: j });
}

