import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  return /(?:^|;\s*)di_admin=1(?:;|$)/.test(cookie);
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const sb = getServiceSupabase();
    if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
    const body = await req.json().catch(()=> ({} as any));
    const user_uid = String(body?.user_uid || '').trim();
    if (!user_uid) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const plus = typeof body?.plus === 'boolean' ? body.plus : undefined;
    const untilRaw = body?.plus_until;
    let plus_until: string | null | undefined = undefined;
    if (untilRaw === null) plus_until = null;
    else if (typeof untilRaw === 'string' && untilRaw.trim()) {
      const d = new Date(untilRaw);
      if (!isNaN(d.getTime())) plus_until = d.toISOString();
    }
    const payload: any = { user_uid };
    if (typeof plus === 'boolean') payload.plus = plus;
    if (plus_until !== undefined) payload.plus_until = plus_until;
    const { error } = await sb.from('entitlements').upsert(payload, { onConflict: 'user_uid' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 400 });
  }
}

