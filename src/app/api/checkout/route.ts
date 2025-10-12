// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
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
