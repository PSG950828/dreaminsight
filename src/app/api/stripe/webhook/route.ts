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
  // Service is now completely free - Stripe webhooks are no longer processed
  console.log("[stripe:webhook] Service is now free - webhook disabled");
  
  return NextResponse.json({ 
    message: "Service is now completely free", 
    received: false,
    status: "disabled" 
  });
}
