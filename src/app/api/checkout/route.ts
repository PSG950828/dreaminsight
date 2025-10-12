// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";

// 예전 결제 생성 로직은 archive/legacy_plus/api.checkout.route.md 참고
import { getServiceSupabase } from "@/lib/supabaseServer";

/**
 * Checkout endpoint - DISABLED
 * Service is now completely free
 */
export async function POST(req: Request) {
  return NextResponse.json({ 
    error: "Service is now completely free - no payment required",
    message: "All features are available without payment",
    redirectTo: "/"
  }, { status: 400 });
}
