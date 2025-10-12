import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  try {
    const h = req.headers.get('cookie') || '';
    return /(?:^|;\s*)di_admin=1(?:;|$)/.test(h);
  } catch { return false; }
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
  try {
    const out: Record<string, { path: string; url: string|null; updated_at?: string }[]> = { db: [], storage: [] };
    const listPrefix = async (prefix: string) => {
      const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } as any });
      if (error) return [] as any[];
      const files: any[] = [];
      for (const f of data || []) {
        // recurse one level (db/<stamp>/file.json)
        if ((f as any).metadata) {
          // file at this level
          const path = `${prefix}/${f.name}`;
          const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
          files.push({ path, url: pub?.publicUrl || null, updated_at: (f as any)?.updated_at });
        } else {
          const leaf = `${prefix}/${f.name}`;
          const { data: leafs } = await sb.storage.from(bucket).list(leaf, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } as any });
          for (const lf of (leafs || [])) {
            const path = `${leaf}/${lf.name}`;
            const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
            files.push({ path, url: pub?.publicUrl || null, updated_at: (lf as any)?.updated_at });
          }
        }
      }
      return files;
    };
    out.db = await listPrefix('backups/db');
    out.storage = await listPrefix('backups/storage');
    return NextResponse.json({ ok: true, bucket, backups: out });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'list_failed' }, { status: 500 });
  }
}

