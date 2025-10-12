import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  try {
    const h = req.headers.get('cookie') || '';
    return /(?:^|;\s*)di_admin=1(?:;|$)/.test(h);
  } catch { return false; }
}

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';

  try {
    // 1) 대상 post id 수집(최근 N일)
    const { data: posts, error: perr } = await sb.from('posts').select('id,created_at').gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(20000);
    if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });
    const ids = (posts || []).map((p: any) => String(p.id));

    // 2) 각 post 폴더의 파일 나열
    const items: Array<{ post_id: string; files: { path: string; url: string|null; updated_at?: string }[] } > = [];
    for (const id of ids) {
      const prefix = `posts/${id}`;
      const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 100, sortBy: { column: 'updated_at', order: 'asc' } as any });
      if (error) continue;
      const files: { path: string; url: string|null; updated_at?: string }[] = [];
      for (const f of data || []) {
        const p = `${prefix}/${f.name}`;
        const { data: pub } = sb.storage.from(bucket).getPublicUrl(p);
        files.push({ path: p, url: pub?.publicUrl || null, updated_at: (f as any)?.updated_at });
      }
      if (files.length) items.push({ post_id: id, files });
    }

    // 3) 매니페스트 업로드
    const root = `backups/storage/${nowStamp()}.json`;
    const payload = JSON.stringify({ days, count: items.length, items }, null, 2);
    const { error: uerr } = await sb.storage.from(bucket).upload(root, new Blob([payload], { type: 'application/json;charset=utf-8' }) as any, { upsert: false, contentType: 'application/json;charset=utf-8' });
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(root);
    return NextResponse.json({ ok: true, manifest: root, url: pub?.publicUrl || null, posts: ids.length, withFiles: items.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'backup_failed' }, { status: 500 });
  }
}

