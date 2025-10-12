import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { matchAliasKeys, normalizeText, getMergedSymbols } from '@/lib/dictionary';

function isAdmin(req: Request) {
  try { const h = req.headers.get('cookie') || ''; return /(?:^|;\s*)di_admin=1(?:;|$)/.test(h); } catch { return false; }
}

type CovItem = { w: string; c: number; suggest: Array<{ key:string; label:string }> };

async function gatherCoverage(sb: any, days: number, limit: number): Promise<CovItem[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('telemetry_events')
    .select('k, delta')
    .eq('type', 'unknown')
    .gte('created_at', since)
    .lte('created_at', now)
    .limit(50000);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const key = String((row as any).k || '').slice(0, 64);
    const d = Number((row as any).delta) || 1;
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + d);
  }
  const items = Array.from(counts.entries())
    .map(([w, c]) => ({ w, c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, limit);

  const syms = getMergedSymbols() as any as Record<string, { label: string; tags?: string[] }>;
  const out: CovItem[] = [];
  for (const it of items) {
    const token = it.w;
    const keys = matchAliasKeys(token);
    let suggest: Array<{ key: string; label: string }> = [];
    if (keys.length) {
      suggest = keys.slice(0, 3).map((k) => ({ key: k, label: syms[k]?.label || k }));
    } else {
      const nt = normalizeText(token);
      const candidates: Array<{ key: string; label: string; score: number }> = [];
      for (const [k, v] of Object.entries(syms)) {
        const lab = normalizeText((v as any).label || '');
        const tags = ((v as any).tags || []).map((t: string) => normalizeText(t));
        const hit = lab.includes(nt) || tags.some((t: string) => t.includes(nt));
        if (hit) candidates.push({ key: k, label: (v as any).label || k, score: lab.length });
      }
      candidates.sort((a, b) => a.score - b.score);
      suggest = candidates.slice(0, 3).map(({ key, label }) => ({ key, label }));
    }
    out.push({ w: token, c: it.c, suggest });
  }
  return out;
}

// GET: dry-run — returns planned mappings using first suggestion when present
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '14', 10) || 14));
  const limit = Math.max(10, Math.min(2000, parseInt(url.searchParams.get('limit') || '500', 10) || 500));
  const minCount = Math.max(1, parseInt(url.searchParams.get('min') || '3', 10) || 3);
  const items = await gatherCoverage(sb, days, limit);
  const plan = items
    .filter(it => it.c >= minCount && Array.isArray(it.suggest) && it.suggest.length > 0)
    .map(it => ({ alias: it.w, count: it.c, target: it.suggest[0] }))
    .slice(0, limit);
  return NextResponse.json({ days, limit, minCount, total: items.length, planned: plan.length, plan });
}

// POST: apply — upsert admin_aliases using first suggestion per token
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '14', 10) || 14));
  const limit = Math.max(10, Math.min(2000, parseInt(url.searchParams.get('limit') || '500', 10) || 500));
  const minCount = Math.max(1, parseInt(url.searchParams.get('min') || '3', 10) || 3);
  try {
    const items = await gatherCoverage(sb, days, limit);
    let ok = 0, skip = 0, fail = 0;
    for (const it of items) {
      if (it.c < minCount) { skip++; continue; }
      const target = (it.suggest && it.suggest[0]) ? it.suggest[0] : null;
      if (!target) { skip++; continue; }
      const alias = it.w;
      const sym_key = target.key;
      try {
        const { error } = await sb.from('admin_aliases').upsert({ sym_key, alias });
        if (!error) ok++; else fail++;
      } catch { fail++; }
    }
    return NextResponse.json({ ok, skip, fail, days, limit, minCount });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

