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
  const full = url.searchParams.get('full') === '1';
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
  const root = `backups/db/${nowStamp()}`;
  const files: string[] = [];

  async function dump(table: string, query: any) {
    const path = `${root}/${table}.json`;
    const payload = JSON.stringify(query || [], null, 2);
    const { error } = await sb.storage.from(bucket).upload(path, new Blob([payload], { type: 'application/json;charset=utf-8' }) as any, { upsert: false, contentType: 'application/json;charset=utf-8' });
    if (error) throw new Error(`upload ${table}: ${error.message}`);
    files.push(`${bucket}/${path}`);
  }

  try {
    // Small tables (full export)
    const adminAliases = await sb.from('admin_aliases').select('*').limit(100000);
    await dump('admin_aliases', adminAliases.data || []);
    const ent = await sb.from('entitlements').select('*').limit(100000);
    await dump('entitlements', ent.data || []);

    // Large tables (windowed unless full=1)
    const rangeSel = full ? '*' : `*`;
    const posts = full
      ? await sb.from('posts').select(rangeSel).limit(200000)
      : await sb.from('posts').select(rangeSel).gte('created_at', sinceIso).limit(200000);
    await dump('posts', posts.data || []);

    const comments = full
      ? await sb.from('comments').select(rangeSel).limit(200000)
      : await sb.from('comments').select(rangeSel).gte('created_at', sinceIso).limit(200000);
    await dump('comments', comments.data || []);

    const reports = full
      ? await sb.from('reports').select(rangeSel).limit(200000)
      : await sb.from('reports').select(rangeSel).gte('created_at', sinceIso).limit(200000);
    await dump('reports', reports.data || []);

    const journals = full
      ? await sb.from('journals').select(rangeSel).limit(200000)
      : await sb.from('journals').select(rangeSel).gte('created_at', sinceIso).limit(200000);
    await dump('journals', journals.data || []);

    const tel = full
      ? await sb.from('telemetry_events').select('*').limit(500000)
      : await sb.from('telemetry_events').select('*').gte('created_at', sinceIso).limit(500000);
    await dump('telemetry_events', tel.data || []);

    return NextResponse.json({ ok: true, files, root, days, full });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'backup_failed', files }, { status: 500 });
  }
}

