import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

// POST /api/telemetry
// Body: { type: string; key: string; delta?: number; user_uid?: string }
export async function POST(req: Request) {
  try {
    const sb = getServiceSupabase();
    if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
    // Optional CSRF
    try {
      if (process.env.ENABLE_CSRF === 'true') {
        const origin = req.headers.get('origin') || '';
        const host = new URL(req.url).origin;
        const allow = (process.env.CSRF_ORIGIN_ALLOW || '').split(/[\s,]+/).filter(Boolean);
        if (origin && origin !== host && !allow.includes(origin)) {
          return NextResponse.json({ error: 'csrf_rejected' }, { status: 403 });
        }
      }
    } catch {}
    const body = await req.json().catch(()=> ({} as any));
    const type = String(body?.type || '').trim();
    const key = String(body?.key || '').trim();
    const delta = Number.isFinite(Number(body?.delta)) ? Number(body?.delta) : 1;
    const user_uid = String(body?.user_uid || '').trim();
    if (!type || !key) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    await sb.from('telemetry_events').insert({ type, k: key, delta, user_uid: user_uid || null });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

