// src/app/api/stripe/webhook/route.ts
// Stripe Webhook (minimal, no external SDK)
// - Verifies signature if STRIPE_WEBHOOK_SECRET is set
// - Logs important events; place to attach DB updates for entitlements

import { NextResponse } from "next/server";
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
      // TODO: connect customer/email to your user and mark Plus active in DB
      console.log("[stripe:webhook]", event.type, {
        customer: event?.data?.object?.customer,
        email: event?.data?.object?.customer_details?.email,
      });
      break;
    default:
      // noop
      break;
  }

  return NextResponse.json({ received: true });
}

