// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookie = (req.headers.get('cookie') || '').split(';').map(s=>s.trim());
  const map = new Map<string,string>();
  for (const c of cookie) {
    const i = c.indexOf('=');
    if (i > 0) map.set(c.slice(0,i), decodeURIComponent(c.slice(i+1)));
  }
  const forced = process.env.NEXT_PUBLIC_FORCE_PLUS === '1';
  let plus = forced || map.get('di_plus') === '1';
  let plusUntilISO: string | null = null;
  let daysLeft: number | null = null;
  // Try server entitlements
  try {
    const sb = getServiceSupabase();
    const uid = map.get('di_uid') || '';
    if (sb && uid && !forced) {
      const { data, error } = await sb.from('entitlements').select('plus, plus_until').eq('user_uid', uid).single();
      if (!error && data) {
        const now = Date.now();
        const until = data.plus_until ? new Date(data.plus_until as any).getTime() : 0;
        plus = plus || !!data.plus || (until > now);
        if (until > 0) {
          plusUntilISO = new Date(until).toISOString();
          const d = Math.ceil((until - now) / (24*60*60*1000));
          daysLeft = d > 0 ? d : 0;
        }
      }
    }
  } catch {}
  return NextResponse.json({ plus, plusUntil: plusUntilISO, daysLeft });
}
