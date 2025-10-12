import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { matchAliasKeys, normalizeText, getMergedSymbols } from '@/lib/dictionary';

// GET /api/stats/coverage?days=7&limit=100
// Returns top unknown tokens and naive symbol suggestions
export async function GET(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '7', 10) || 7));
  const limit = Math.max(10, Math.min(1000, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  try {
    const { data, error } = await sb
      .from('telemetry_events')
      .select('k, delta')
      .eq('type', 'unknown')
      .gte('created_at', since)
      .lte('created_at', now)
      .limit(50000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

    // Naive suggestions: try matching each token itself; fallback to tag/label substring search
    const syms = getMergedSymbols() as any as Record<string, { label: string; tags?: string[] }>;
    const suggestions = items.map((it) => {
      const token = it.w;
      const keys = matchAliasKeys(token);
      let suggest: Array<{ key: string; label: string }> = [];
      if (keys.length) {
        suggest = keys.slice(0, 3).map((k) => ({ key: k, label: syms[k]?.label || k }));
      } else {
        // fallback: normalized substring over labels/tags
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
      return { w: token, c: it.c, suggest };
    });

    return NextResponse.json({ days, items: suggestions });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

