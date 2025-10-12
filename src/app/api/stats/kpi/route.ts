import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

// Lightweight KPI endpoint used by ops workflows
// GET /api/stats/kpi?days=7
export async function GET(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '7', 10) || 7));
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  try {
    // Pull aggregated telemetry rows only for needed types
    const types = ['unknown','symbol','upload'];
    const { data, error } = await sb
      .from('telemetry')
      .select('type,k,count')
      .in('type', types)
      .gte('created_at', sinceIso)
      .lte('created_at', nowIso)
      .limit(5000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const agg: Record<string, Record<string, number>> = {};
    for (const row of data || []) {
      const t = (row as any).type as string;
      const k = (row as any).k as string;
      const c = Number((row as any).count) || 0;
      if (!agg[t]) agg[t] = {};
      agg[t][k] = (agg[t][k] || 0) + c;
    }
    const unknown = Object.values(agg['unknown'] || {}).reduce((a,b)=> a + (b||0), 0);
    const symbol = Object.values(agg['symbol'] || {}).reduce((a,b)=> a + (b||0), 0);
    const upload = agg['upload'] || {};
    const uploadOk = Object.entries(upload).filter(([k])=> k.startsWith('success')).reduce((a,[,v])=> a + (v||0), 0);
    const failEntries = Object.entries(upload).filter(([k])=> k.startsWith('fail.'));
    const uploadFail = failEntries.reduce((a,[,v])=> a + (v||0), 0);
    const failBreakdown = Object.fromEntries(failEntries.map(([k,v])=> [k.replace('fail.',''), v||0]));
    const unknownRate = (unknown + symbol) > 0 ? Math.round((unknown / (unknown + symbol)) * 1000) / 1000 : 0;
    const failRate = (uploadOk + uploadFail) > 0 ? Math.round((uploadFail / (uploadOk + uploadFail)) * 1000) / 1000 : 0;
    return NextResponse.json({ days, unknownTotal: unknown, symbolTotal: symbol, unknownRate, upload: { ok: uploadOk, fail: uploadFail, failRate, failBreakdown } });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
