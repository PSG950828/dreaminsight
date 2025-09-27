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

export function middleware(req: NextRequest) {
  // Simple rate limiting for community write APIs (cookie-based, best-effort)
  const url = req.nextUrl;
  if (url.pathname.startsWith('/api/community/')) {
    const now = Date.now();
    const bucket = url.pathname.split('/')[3] || 'general'; // posts/comments/vote/report
    const cookieKey = `di_rl_${bucket}`;
    const raw = req.cookies.get(cookieKey)?.value || '';
    let obj: { ts: number; c: number } = { ts: now, c: 0 };
    try { obj = JSON.parse(raw); } catch {}

    const windowMs = 60 * 1000; // 60s window
    const limits: Record<string, number> = { posts: 3, comments: 10, vote: 30, report: 5, general: 10 };
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
