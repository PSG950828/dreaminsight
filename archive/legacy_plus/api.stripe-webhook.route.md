# Legacy Stripe Webhook Route

```ts
// src/app/api/stripe/webhook/route.ts
// Stripe Webhook (minimal, no external SDK)
// - Verifies signature if STRIPE_WEBHOOK_SECRET is set
// - Logs important events; place to attach DB updates for entitlements

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import crypto from "crypto";

export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyStripeSignature(body: string, sigHeader: string | null, secret: string): boolean {
  try {
    if (!sigHeader) return false;
    // Stripe format: t=timestamp,v1=signature[,...]
    const parts = Object.fromEntries(sigHeader.split(",").map(kv => kv.split("=") as [string,string]));
    const timestamp = parts["t"];
    const v1 = parts["v1"];
    if (!timestamp || !v1) return false;
    const signedPayload = `${timestamp}.${body}`;
    const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    return timingSafeEqual(v1, expected);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const sig = req.headers.get("stripe-signature");
  const text = await req.text();

  // Verify if secret provided; otherwise accept (dev mode)
  if (secret) {
    const ok = verifyStripeSignature(text, sig, secret);
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }
  }

  let event: any = undefined;
  try {
    event = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Handle important event types
  switch (event?.type) {
    case "checkout.session.completed":
    case "payment_intent.succeeded":
    case "customer.subscription.created":
    case "customer.subscription.updated":
      // Best-effort entitlement upsert using metadata/client_reference_id
      try {
        const obj: any = event?.data?.object || {};
        const meta = obj.metadata || {};
        const uid: string = meta.di_uid || obj.client_reference_id || "";
        const sb = getServiceSupabase();
        if (sb && uid) {
          // Determine entitlement window
          let plus_until: string | null = null;
          if (meta.plus_until) {
            const d = new Date(meta.plus_until);
            if (!isNaN(d.getTime())) plus_until = d.toISOString();
          } else if (meta.plus_days) {
            const days = parseInt(String(meta.plus_days), 10);
            if (Number.isFinite(days) && days > 0) {
              plus_until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            }
          }
          const payload: any = { user_uid: uid, plus: true };
          if (plus_until !== null) payload.plus_until = plus_until;
          await sb.from('entitlements').upsert(payload, { onConflict: 'user_uid' });
          // Telemetry: checkout success (plan context if available)
          try {
            const plan = (meta.plan || obj?.lines?.data?.[0]?.price?.nickname || 'plus').toString().toLowerCase();
            const k = plan.includes('month') ? 'success.month' : plan.includes('day') ? 'success.day' : 'success';
            await sb.from('telemetry_events').insert({ user_uid: uid, type: 'checkout', k, delta: 1 });
          } catch {}
        }
      } catch (e) {
        // swallow: webhook should not fail due to entitlement issues
      }
      // Log for observability
      console.log("[stripe:webhook]", event.type, {
        customer: event?.data?.object?.customer,
        email: event?.data?.object?.customer_details?.email,
        uid: event?.data?.object?.metadata?.di_uid || event?.data?.object?.client_reference_id || undefined,
      });
      // Optional Slack notify
      try {
        const hook = process.env.STRIPE_SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
        if (hook) {
          const plan = (event?.data?.object?.metadata?.plan || event?.data?.object?.lines?.data?.[0]?.price?.nickname || 'plus').toString();
          const uid = event?.data?.object?.metadata?.di_uid || event?.data?.object?.client_reference_id || '';
          const text = `💳 Stripe ${event.type} — ${plan} uid=${uid}`;
          await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        }
      } catch {}
      break;
    default:
      // noop
      break;
  }

  return NextResponse.json({ received: true });
}
```
