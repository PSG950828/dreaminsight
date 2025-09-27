// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";

/**
 * Minimal checkout endpoint
 * - Uses pre-configured Payment Link URL from env (no server secret needed)
 * - Env: STRIPE_PAYMENT_LINK (generic) or STRIPE_PAYMENT_LINK_PLUS or NEXT_PUBLIC_PAYMENT_LINK_URL
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const plan = (body?.plan || "month") as string; // default to month plan

    // Map plan -> payment link env
    const linkByPlan: Record<string, string | undefined> = {
      day: process.env.STRIPE_PAYMENT_LINK_DAY,
      week: process.env.STRIPE_PAYMENT_LINK_WEEK,
      month: process.env.STRIPE_PAYMENT_LINK_MONTH,
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
    return NextResponse.json({ url: finalUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
