import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const admin = /(?:^|;\s*)di_admin=1(?:;|$)/.test(cookie);
  return NextResponse.json({ admin });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({} as any));
    const pw = body?.password || '';
    const ok = !!process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD;
    if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', `di_admin=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24*60*60}`);
    return res;
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 400 });
  }
}
