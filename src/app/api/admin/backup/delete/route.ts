import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  try { const h = req.headers.get('cookie') || ''; return /(?:^|;\s*)di_admin=1(?:;|$)/.test(h); } catch { return false; }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
  const body = await req.json().catch(()=> ({} as any));
  const prefix: string = String(body?.prefix || '').trim();
  const paths: string[] = Array.isArray(body?.paths) ? body.paths.map((p:string)=> String(p||'').trim()).filter(Boolean) : [];
  try {
    let removed = 0;
    if (prefix) {
      const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const toRemove = (data||[]).map((f: any) => `${prefix}/${f.name}`);
      if (toRemove.length) {
        const { error: rerr } = await sb.storage.from(bucket).remove(toRemove);
        if (rerr) return NextResponse.json({ error: rerr.message }, { status: 500 });
        removed += toRemove.length;
      }
    }
    if (paths.length) {
      const { error: rerr } = await sb.storage.from(bucket).remove(paths);
      if (rerr) return NextResponse.json({ error: rerr.message }, { status: 500 });
      removed += paths.length;
    }
    return NextResponse.json({ ok: true, removed });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'delete_failed' }, { status: 500 });
  }
}
