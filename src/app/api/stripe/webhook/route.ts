import { NextResponse } from "next/server";

// 예전 Stripe 처리 로직은 archive/legacy_plus/api.stripe-webhook.route.md 참고

export async function POST(req: Request) {
  // Service is now completely free - Stripe webhooks are no longer processed
  console.log("[stripe:webhook] Service is now free - webhook disabled");
  
  return NextResponse.json({ 
    message: "Service is now completely free", 
    received: false,
    status: "disabled" 
  });
}
