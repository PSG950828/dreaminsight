import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

// GET /api/stats/funnel?days=7
// Returns basic funnel aggregates for upsell and checkout context
export async function GET(req: Request) {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days') || '7', 10) || 7));
  const since = new Date(Date.now() - days*24*60*60*1000).toISOString();
  const now = new Date().toISOString();
  try {
    const { data: events, error } = await sb.from('telemetry_events')
      .select('type,k,delta')
      .gte('created_at', since)
      .lte('created_at', now)
      .limit(50000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const upsellOpen: Record<string, number> = {}; // ctx -> count
    const upsellClick: Record<string, number> = {}; // ctx -> count
    let checkoutStart = 0;
    const checkoutStartByPlan: Record<string, number> = {};
    let checkoutSuccess = 0;
    const checkoutSuccessByPlan: Record<string, number> = {};
    const referralStart: Record<string, number> = {}; // ref -> count

    for (const ev of events || []) {
      const t = (ev as any).type as string;
      const k = (ev as any).k as string;
      const d = Number((ev as any).delta) || 1;
      if (t === 'upsell') {
        if (k.startsWith('open.')) {
          const parts = k.split('.'); // open.ctx.variant
          const ctx = parts[1] || 'unknown'; upsellOpen[ctx] = (upsellOpen[ctx]||0) + d;
        } else if (k.startsWith('click.subscribe.')) {
          const parts = k.split('.'); // click.subscribe.ctx.variant
          const ctx = parts[2] || 'unknown'; upsellClick[ctx] = (upsellClick[ctx]||0) + d;
        }
      } else if (t === 'checkout') {
        if (k.startsWith('start.')) { checkoutStart += d; const plan = k.split('.')[1]||'unknown'; checkoutStartByPlan[plan]=(checkoutStartByPlan[plan]||0)+d; }
        else if (k.startsWith('success')) { checkoutSuccess += d; const plan = k.split('.')[1]||'unknown'; checkoutSuccessByPlan[plan]=(checkoutSuccessByPlan[plan]||0)+d; }
      } else if (t === 'referral') {
        if (k.startsWith('start.')) { const ref = k.slice('start.'.length) || 'unknown'; referralStart[ref] = (referralStart[ref]||0) + d; }
      }
    }
    const top = (obj:Record<string,number>, n=10) => Object.entries(obj).map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,n);
    return NextResponse.json({
      days,
      upsell: { open: top(upsellOpen), click: top(upsellClick) },
      referral: { start: top(referralStart) },
      checkout: { start: checkoutStart, success: checkoutSuccess, startByPlan: top(checkoutStartByPlan), successByPlan: top(checkoutSuccessByPlan) }
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

