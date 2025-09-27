import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();
  const prevSinceIso = prevSince.toISOString();
  const nowIso = new Date().toISOString();
  const { data, error } = await sb.from('telemetry').select('type,k,count,created_at').gte('created_at', sinceIso).lte('created_at', nowIso).limit(10000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: prev } = await sb.from('telemetry').select('type,k,count,created_at').gte('created_at', prevSinceIso).lt('created_at', sinceIso).limit(10000);
  const { data: events } = await sb.from('telemetry_events').select('type,k,delta,created_at').gte('created_at', sinceIso).lte('created_at', nowIso).limit(50000);
  // Aggregate by type/k
  const agg: Record<string, Record<string, number>> = {};
  const aggPrev: Record<string, Record<string, number>> = {};
  for (const row of data || []) {
    const t = (row as any).type as string;
    const k = (row as any).k as string;
    const c = Number((row as any).count) || 0;
    if (!agg[t]) agg[t] = {};
    agg[t][k] = (agg[t][k] || 0) + c;
  }
  for (const row of prev || []) {
    const t = (row as any).type as string;
    const k = (row as any).k as string;
    const c = Number((row as any).count) || 0;
    if (!aggPrev[t]) aggPrev[t] = {};
    aggPrev[t][k] = (aggPrev[t][k] || 0) + c;
  }
  function top(obj?: Record<string, number>) {
    return Object.entries(obj || {}).map(([label, count]) => ({ label, count })).sort((a,b)=> b.count - a.count).slice(0, 10);
  }
  // Build per-day series for top labels using events
  const dayCount = days;
  const dayLabels: string[] = [];
  const anchor = new Date();
  for (let i = dayCount-1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - i);
    dayLabels.push(d.toISOString().slice(0,10));
  }
  const seriesByType: Record<string, Record<string, number[]>> = { symbol: {}, suggestion: {}, 'action.done': {} };
  // Checkout plan success series (rough conversion proxy)
  const checkoutSuccDay: number[] = Array(dayCount).fill(0);
  const checkoutSuccMonth: number[] = Array(dayCount).fill(0);
  // Upsell A/B per-day
  const abOpenA: number[] = Array(dayCount).fill(0);
  const abOpenB: number[] = Array(dayCount).fill(0);
  const abSubA: number[] = Array(dayCount).fill(0);
  const abSubB: number[] = Array(dayCount).fill(0);
  // Upsell series by context
  const upsellOpenSeries: Record<string, number[]> = {};
  const upsellSubSeries: Record<string, number[]> = {};
  function ensureSeries(t: string, k: string) {
    if (!seriesByType[t]) seriesByType[t] = {} as any;
    if (!seriesByType[t][k]) seriesByType[t][k] = Array(dayCount).fill(0);
  }
  for (const ev of events || []) {
    const t = (ev as any).type as string;
    const k = (ev as any).k as string;
    const d = new Date((ev as any).created_at as string);
    const ds = d.toISOString().slice(0,10);
    const idx = dayLabels.indexOf(ds);
    if (idx >= 0) {
      ensureSeries(t,k);
      seriesByType[t][k][idx] += Number((ev as any).delta) || 1;
      if (t === 'upsell') {
        if (k.startsWith('open.')) {
          const parts = k.split('.'); // open.ctx.variant
          const ctx = parts[1] || 'unknown';
          if (!upsellOpenSeries[ctx]) upsellOpenSeries[ctx] = Array(dayCount).fill(0);
          upsellOpenSeries[ctx][idx] += Number((ev as any).delta) || 1;
          const v = (parts[2] || 'A').toUpperCase();
          if (v === 'A') abOpenA[idx] += Number((ev as any).delta) || 1; else if (v === 'B') abOpenB[idx] += Number((ev as any).delta) || 1;
        } else if (k.startsWith('click.subscribe.')) {
          const parts = k.split('.'); // click.subscribe.ctx.variant
          const ctx = parts[2] || 'unknown';
          if (!upsellSubSeries[ctx]) upsellSubSeries[ctx] = Array(dayCount).fill(0);
          upsellSubSeries[ctx][idx] += Number((ev as any).delta) || 1;
          const v = (parts[3] || 'A').toUpperCase();
          if (v === 'A') abSubA[idx] += Number((ev as any).delta) || 1; else if (v === 'B') abSubB[idx] += Number((ev as any).delta) || 1;
        }
      } else if (t === 'checkout') {
        if (k === 'success.day') checkoutSuccDay[idx] += Number((ev as any).delta) || 1;
        if (k === 'success.month') checkoutSuccMonth[idx] += Number((ev as any).delta) || 1;
      }
    }
  }
  // Hourly distribution (0-23) for last N days (overall and by label for tops)
  const hours: Record<string, number[]> = { symbol: Array(24).fill(0), suggestion: Array(24).fill(0), 'action.done': Array(24).fill(0) };
  const hoursByLabel: Record<string, Record<string, number[]>> = { symbol: {}, suggestion: {}, 'action.done': {} };
  const upsellHours = { open: Array(24).fill(0), subscribe: Array(24).fill(0) };
  const upsellHoursByCtx: Record<string, { open: number[]; subscribe: number[] }> = {};
  for (const ev of events || []) {
    const t = (ev as any).type as string;
    const k = (ev as any).k as string;
    const d = new Date((ev as any).created_at as string);
    const h = d.getHours();
    const dv = Number((ev as any).delta) || 1;
    if (hours[t]) hours[t][h] += dv;
    // label-specific hours for top labels only (later pick)
    if (hoursByLabel[t]) {
      if (!hoursByLabel[t][k]) hoursByLabel[t][k] = Array(24).fill(0);
      hoursByLabel[t][k][h] += dv;
    }
    if (t === 'upsell') {
      if (k.startsWith('open.')) {
        upsellHours.open[h] += dv;
        const ctx = (k.split('.')[1] || 'unknown');
        if (!upsellHoursByCtx[ctx]) upsellHoursByCtx[ctx] = { open: Array(24).fill(0), subscribe: Array(24).fill(0) };
        upsellHoursByCtx[ctx].open[h] += dv;
      } else if (k.startsWith('click.subscribe.')) {
        upsellHours.subscribe[h] += dv;
        const ctx = (k.split('.')[2] || 'unknown');
        if (!upsellHoursByCtx[ctx]) upsellHoursByCtx[ctx] = { open: Array(24).fill(0), subscribe: Array(24).fill(0) };
        upsellHoursByCtx[ctx].subscribe[h] += dv;
      }
    }
  }
  // Return series only for current top labels
  const tops = {
    symbols: top(agg['symbol']),
    suggestions: top(agg['suggestion']),
    actions: top(agg['action.done'])
  };
  // Encyclopedia tops
  const encOpens = Object.fromEntries(Object.entries(agg['enc'] || {}).filter(([k])=> k.startsWith('open.symbol.')));
  const encStarts = Object.fromEntries(Object.entries(agg['enc'] || {}).filter(([k])=> k.startsWith('click.start.')));
  function pickSeries(t: 'symbol'|'suggestion'|'action.done', arr: {label:string,count:number}[]) {
    const out: Record<string, number[]> = {};
    for (const it of arr) out[it.label] = seriesByType[t]?.[it.label] || Array(dayCount).fill(0);
    return out;
  }
  return NextResponse.json({
    days,
    symbols: tops.symbols,
    suggestions: tops.suggestions,
    actions: tops.actions,
    checkout: {
      starts: top(Object.fromEntries(Object.entries(agg['checkout'] || {}).filter(([k])=> k.startsWith('start.')))),
      successes: top(Object.fromEntries(Object.entries(agg['checkout'] || {}).filter(([k])=> k.startsWith('success.')))),
    },
    upsell: {
      opens: top(Object.fromEntries(Object.entries(agg['upsell'] || {}).filter(([k])=> k.startsWith('open.')))),
      subscribes: top(Object.fromEntries(Object.entries(agg['upsell'] || {}).filter(([k])=> k.startsWith('click.subscribe.')))),
    },
    encyclopedia: {
      opens: top(encOpens),
      starts: top(encStarts),
    },
    prev: {
      symbols: top(aggPrev['symbol']),
      suggestions: top(aggPrev['suggestion']),
      actions: top(aggPrev['action.done'])
    },
    series: {
      symbols: pickSeries('symbol', tops.symbols),
      suggestions: pickSeries('suggestion', tops.suggestions),
      actions: pickSeries('action.done', tops.actions),
      dayLabels,
      hours,
      hoursByLabel
    },
    upsellSeries: {
      dayLabels,
      openByContext: upsellOpenSeries,
      subscribeByContext: upsellSubSeries,
      hours: upsellHours,
      hoursByContext: upsellHoursByCtx,
    },
    checkoutSeries: {
      dayLabels,
      success: { day: checkoutSuccDay, month: checkoutSuccMonth },
      ratio: dayLabels.map((_, i) => {
        const d = checkoutSuccDay[i] || 0;
        const m = checkoutSuccMonth[i] || 0;
        return d > 0 ? Math.round((m / d) * 1000) / 10 : 0;
      }),
    },
    abSeries: {
      dayLabels,
      open: { A: abOpenA, B: abOpenB },
      subscribe: { A: abSubA, B: abSubB },
      rate: {
        A: dayLabels.map((_, i) => { const o = abOpenA[i]||0, s = abSubA[i]||0; return o>0 ? Math.round((s/o)*1000)/10 : 0; }),
        B: dayLabels.map((_, i) => { const o = abOpenB[i]||0, s = abSubB[i]||0; return o>0 ? Math.round((s/o)*1000)/10 : 0; }),
        delta: dayLabels.map((_, i) => { const ra = (abOpenA[i]||0)>0 ? (abSubA[i]||0)/(abOpenA[i]||1) : 0; const rb = (abOpenB[i]||0)>0 ? (abSubB[i]||0)/(abOpenB[i]||1) : 0; return Math.round(Math.abs((rb-ra))*1000)/10; })
      }
    }
  });
}
