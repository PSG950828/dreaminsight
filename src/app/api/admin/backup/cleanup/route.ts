import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  try {
    const h = req.headers.get('cookie') || '';
    return /(?:^|;\s*)di_admin=1(?:;|$)/.test(h);
  } catch { return false; }
}

function parseStamp(name: string): Date | null {
  // Expect: YYYYMMDD_HHMMSS or YYYYMMDD_HHMM
  const m = name.match(/^(\d{8})_(\d{4,6})$/);
  if (!m) return null;
  const y = Number(m[1].slice(0,4));
  const mo = Number(m[1].slice(4,6)) - 1;
  const d = Number(m[1].slice(6,8));
  const hh = Number(m[2].slice(0,2));
  const mm = Number(m[2].slice(2,4));
  const ss = m[2].length >= 6 ? Number(m[2].slice(4,6)) : 0;
  return new Date(Date.UTC(y, mo, d, hh, mm, ss));
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(3650, parseInt(url.searchParams.get('days') || '90', 10) || 90));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';

  let removedDb = 0;
  let removedStorage = 0;
  const removedStamps: string[] = [];

  // Clean backups/db/<stamp>/*
  try {
    const { data: roots } = await sb.storage.from(bucket).list('backups/db', { limit: 1000 });
    for (const ent of roots || []) {
      const stamp = ent.name;
      const dt = parseStamp(stamp);
      if (!dt) continue;
      if (dt.getTime() >= cutoff) continue;
      const prefix = `backups/db/${stamp}`;
      const { data: leafs } = await sb.storage.from(bucket).list(prefix, { limit: 100 });
      const paths: string[] = [];
      for (const f of leafs || []) {
        paths.push(`${prefix}/${f.name}`);
      }
      if (paths.length) {
        const { data, error } = await sb.storage.from(bucket).remove(paths);
        if (!error) { removedDb += paths.length; removedStamps.push(stamp); }
      }
    }
  } catch {}

  // Clean backups/storage/<stamp>.json
  try {
    const { data: items } = await sb.storage.from(bucket).list('backups/storage', { limit: 1000 });
    const toRemove: string[] = [];
    for (const it of items || []) {
      const name = it.name; // <stamp>.json
      const base = name.replace(/\.json$/,'');
      const dt = parseStamp(base);
      if (!dt) continue;
      if (dt.getTime() >= cutoff) continue;
      toRemove.push(`backups/storage/${name}`);
    }
    if (toRemove.length) {
      const { error } = await sb.storage.from(bucket).remove(toRemove);
      if (!error) removedStorage += toRemove.length;
    }
  } catch {}

  return NextResponse.json({ ok: true, removedDbFiles: removedDb, removedStorageFiles: removedStorage, stamps: removedStamps, days });
}

