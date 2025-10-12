import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  try {
    const url = new URL(req.url);
    const postId = (url.searchParams.get('post') || '').trim();
    const w = parseInt(url.searchParams.get('w') || '0', 10) || 0;
    const h = parseInt(url.searchParams.get('h') || '0', 10) || 0;
    if (!postId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
    const prefix = `posts/${postId}`;
    const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
    const order = (url.searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit, sortBy: { column: 'created_at', order } as any });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const out: string[] = [];
    let lastMod = 0;
    for (const f of data || []) {
      const p = `${prefix}/${f.name}`;
      const opts = (w>0 || h>0) ? { transform: { width: w || undefined, height: h || undefined, resize: 'contain' as any } } : undefined;
      const { data: pub } = sb.storage.from(bucket).getPublicUrl(p, opts as any);
      if (pub?.publicUrl) out.push(pub.publicUrl);
      const ts = Date.parse((f as any).updated_at || (f as any).created_at || '') || 0;
      if (ts > lastMod) lastMod = ts;
    }
    // simple ETag & caching
    const etag = `"${postId}:${w}x${h}:${order}:${out.join(',').length}:${(data||[]).length}"`;
    const headers: Record<string,string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'ETag': etag,
    };
    if (lastMod > 0) headers['Last-Modified'] = new Date(lastMod).toUTCString();
    return new NextResponse(JSON.stringify({ images: out }), {
      status: 200,
      headers,
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
