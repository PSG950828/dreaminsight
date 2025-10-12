# Legacy Checkout API Route

```ts
// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

/**
 * Minimal checkout endpoint
 * - Uses pre-configured Payment Link URL from env (no server secret needed)
 * - Env: STRIPE_PAYMENT_LINK (generic) or STRIPE_PAYMENT_LINK_PLUS or NEXT_PUBLIC_PAYMENT_LINK_URL
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const plan = (body?.plan || "month") as string; // default to month plan

    // A/B variant per cookie or weight
    const rawCookie = req.headers.get('cookie') || '';
    const cmap = new Map<string,string>();
    rawCookie.split(';').map(s=>s.trim()).forEach((c)=>{ const i=c.indexOf('='); if(i>0) cmap.set(c.slice(0,i), decodeURIComponent(c.slice(i+1))); });
    let variant = (cmap.get('di_ab') || '').toUpperCase();
    if (variant !== 'A' && variant !== 'B') {
      const wA = parseFloat(String(process.env.CHECKOUT_AB_WEIGHT_A || '0.5'));
      const weightA = Number.isFinite(wA) ? Math.max(0, Math.min(1, wA)) : 0.5;
      variant = Math.random() < weightA ? 'A' : 'B';
    }
    // Map plan -> payment link env (A/B aware)
    const linkByPlan: Record<string, string | undefined> = {
      day: variant==='A' ? process.env.STRIPE_PAYMENT_LINK_DAY_A : process.env.STRIPE_PAYMENT_LINK_DAY_B,
      week: variant==='A' ? process.env.STRIPE_PAYMENT_LINK_WEEK_A : process.env.STRIPE_PAYMENT_LINK_WEEK_B,
      month: variant==='A' ? process.env.STRIPE_PAYMENT_LINK_MONTH_A : process.env.STRIPE_PAYMENT_LINK_MONTH_B,
      // fallbacks to existing keys if set
      plus: process.env.STRIPE_PAYMENT_LINK_PLUS,
      pro: process.env.STRIPE_PAYMENT_LINK_PRO,
    };

    const url = linkByPlan[plan] ||
      process.env.STRIPE_PAYMENT_LINK_PLUS ||
      process.env.STRIPE_PAYMENT_LINK ||
      process.env.NEXT_PUBLIC_PAYMENT_LINK_URL;
    if (!url) {
      return NextResponse.json({ error: "Payment link is not configured." }, { status: 400 });
    }
    // Optionally append plan hint for success page to read if link supports query params
    // Many Payment Links ignore appended params; ensure Stripe success URL embeds ?plan= in dashboard as primary.
    let finalUrl = url;
    try {
      const u = new URL(url);
      if (!u.searchParams.has('plan')) {
        u.searchParams.set('plan', plan);
        finalUrl = u.toString();
      }
    } catch {}
    // Telemetry: checkout start + set di_ab cookie (best-effort, server-side)
    try {
      const sb = getServiceSupabase();
      if (sb) {
        const uid = cmap.get('di_uid') || '';
        const ref = cmap.get('di_ref') || '';
        await sb.from('telemetry_events').insert({ type: 'checkout', k: `start.${plan}`, delta: 1, user_uid: uid || null });
        if (ref) {
          // also record referral start context
          await sb.from('telemetry_events').insert({ type: 'referral', k: `start.${ref}`, delta: 1, user_uid: uid || null });
        }
      }
    } catch {}
    const res = NextResponse.json({ url: finalUrl });
    // persist A/B variant for 180 days
    res.headers.append('Set-Cookie', `di_ab=${encodeURIComponent(variant)}; Max-Age=${180*24*60*60}; Path=/; SameSite=Lax`);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
```
