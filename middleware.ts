// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 인증이 필요한지 여부를 결정
 * - ENABLE_AUTH === "true" 일 때만 동작
 * - staging.dreaminsight.co.kr 은 전면 보호
 * - 그 외(프로덕션)에서는 /app 이하만 보호
 */
function needAuth(req: NextRequest) {
  const enable = process.env.ENABLE_AUTH === "true";
  if (!enable) return false;

  const hostname = req.nextUrl.hostname;  // 예: staging.dreaminsight.co.kr
  const pathname = req.nextUrl.pathname;  // 예: /, /app, /app/dashboard

  // 스테이징: 전면 보호
  const isStagingHost =
    hostname === "staging.dreaminsight.co.kr" ||
    hostname.endsWith(".staging.dreaminsight.co.kr");

  // 프로덕션: /app 이하만 보호
  const protectAppPath = pathname.startsWith("/app");

  return isStagingHost || protectAppPath;
}

/**
 * Basic Auth 처리
 * - 올바른 자격 증명일 경우 통과
 * - 아니면 401 + WWW-Authenticate 로 브라우저 팝업 유도
 */
function basicAuth(req: NextRequest) {
  const USER = process.env.BASIC_AUTH_USER ?? "";
  const PASS = process.env.BASIC_AUTH_PASS ?? "";

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const idx = decoded.indexOf(":");
        const u = idx >= 0 ? decoded.slice(0, idx) : "";
        const p = idx >= 0 ? decoded.slice(idx + 1) : "";
        if (u === USER && p === PASS) {
          return NextResponse.next();
        }
      } catch {
        // base64 디코딩 실패 시 아래 401로 처리
      }
    }
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

function ipOrUA(req: NextRequest): string {
  try {
    const h = req.headers;
    return (
      h.get('cf-connecting-ip') ||
      h.get('x-forwarded-for') ||
      (req as unknown as { ip?: string }).ip ||
      h.get('x-real-ip') ||
      h.get('user-agent') ||
      'anon'
    );
  } catch { return 'anon'; }
}

export function middleware(req: NextRequest) {
  // Capture referral parameters (utm_*) into a cookie for 30 days (best-effort)
  try {
    const url = req.nextUrl;
    const sp = url.searchParams;
    const src = sp.get('utm_source') || sp.get('ref');
    const med = sp.get('utm_medium') || '';
    const camp = sp.get('utm_campaign') || '';
    if (src) {
      const ref = `${src}:${med}:${camp}`.replace(/\s+/g,'_').slice(0,80);
      const res = NextResponse.next();
      res.cookies.set('di_ref', ref, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 30*24*60*60 });
      return res;
    }
  } catch {}
  // Simple rate limiting for community write APIs (cookie-based, best-effort)
  const url = req.nextUrl;
  if (url.pathname.startsWith('/api/community/')) {
    const now = Date.now();
    const bucket = url.pathname.split('/')[3] || 'general'; // posts/comments/vote/report
    const uid = req.cookies.get('di_uid')?.value || '';
    const ipSig = ipOrUA(req).split(',')[0].trim().slice(-16).replace(/[^a-zA-Z0-9:_-]/g,'');
    const keySuffix = uid ? `u_${uid.slice(-8)}` : `i_${ipSig || 'anon'}`;
    const cookieKey = `di_rl_${bucket}_${keySuffix}`;
    const raw = req.cookies.get(cookieKey)?.value || '';
    let obj: { ts: number; c: number } = { ts: now, c: 0 };
    try { obj = JSON.parse(raw); } catch {}

    // Tunables via env: DI_RL_WINDOW_SEC (4..300), DI_RL_POSTS, DI_RL_COMMENTS, DI_RL_VOTE, DI_RL_REPORT, DI_RL_UPLOAD
    const secRaw = parseInt(String(process.env.DI_RL_WINDOW_SEC || ''), 10);
    const windowMs = (Number.isFinite(secRaw) && secRaw >= 4 && secRaw <= 300 ? secRaw : 60) * 1000; // default 60s
    const num = (v: string|undefined, d: number) => {
      const n = parseInt(String(v||''), 10);
      return Number.isFinite(n) && n >= 0 && n <= 200 ? n : d;
    };
    const limits: Record<string, number> = {
      posts: num(process.env.DI_RL_POSTS, 3),
      comments: num(process.env.DI_RL_COMMENTS, 10),
      vote: num(process.env.DI_RL_VOTE, 30),
      report: num(process.env.DI_RL_REPORT, 5),
      upload: num(process.env.DI_RL_UPLOAD, 10),
      general: 10,
    };
    const max = limits[bucket] ?? limits.general;
    if (now - obj.ts > windowMs) { obj = { ts: now, c: 0 }; }
    if (obj.c >= max && req.method !== 'GET') {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }
    // allow and increment
    if (req.method !== 'GET') obj.c += 1;
    const res = needAuth(req) ? basicAuth(req) : NextResponse.next();
    res.cookies.set(cookieKey, JSON.stringify(obj), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 });
    return res;
  }

  return needAuth(req) ? basicAuth(req) : NextResponse.next();
}

/**
 * 미들웨어 적용 범위
 * - _next/static, _next/image, favicon.ico 등은 제외
 * - 나머지 경로는 전부 미들웨어를 태운다
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
