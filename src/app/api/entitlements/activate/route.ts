import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const sb = getServiceSupabase();
    if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
    const body = await req.json().catch(()=> ({} as any));
    const user_uid = String(body?.user_uid || '').trim();
    const plus_until = body?.plus_until ? new Date(body.plus_until) : null;
    if (!user_uid) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    // Upsert entitlement
    const payload: any = { user_uid, plus: true };
    if (plus_until && !isNaN(plus_until.getTime())) payload.plus_until = plus_until.toISOString();
    const { error } = await sb.from('entitlements').upsert(payload, { onConflict: 'user_uid' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 400 });
  }
}

