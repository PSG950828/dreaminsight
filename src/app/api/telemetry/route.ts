import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import crypto from 'crypto';

export async function POST(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { type, key, delta = 1, user_uid } = body || {};
  const t = String(type || '').toLowerCase();
  const k = String(key || '');
  let uid = String(user_uid || '');
  // Optional: hash UID for privacy
  try {
    if (process.env.HASH_UID === '1') {
      const salt = process.env.TELEMETRY_UID_SALT || '';
      uid = crypto.createHash('sha256').update(salt + uid).digest('hex');
    }
  } catch {}
  if (!t || !k || !uid) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const d = Number(delta) || 1;
  // Try update existing: count = count + d
  const { data: existing } = await sb.from('telemetry').select('*').eq('user_uid', uid).eq('type', t).eq('k', k).single();
  if (existing) {
    const { error: e2 } = await sb.from('telemetry').update({ count: (existing.count || 0) + d }).eq('user_uid', uid).eq('type', t).eq('k', k);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    // also insert event
    await sb.from('telemetry_events').insert({ user_uid: uid, type: t, k, delta: d }).select().single().catch(()=>({} as any));
    return NextResponse.json({ ok: true, updated: true });
  } else {
    const { error: e3 } = await sb.from('telemetry').insert({ user_uid: uid, type: t, k, count: d });
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });
    await sb.from('telemetry_events').insert({ user_uid: uid, type: t, k, delta: d }).select().single().catch(()=>({} as any));
    return NextResponse.json({ ok: true, inserted: true });
  }
}
