// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** 인증 필요 여부 판단 */
function needAuth(req: NextRequest) {
  const enable = process.env.ENABLE_AUTH === "true";
  if (!enable) return false;

  const hostname = req.nextUrl.hostname;  // e.g., staging.dreaminsight.co.kr
  const pathname = req.nextUrl.pathname;  // e.g., /, /app, /api/...

  // 스테이징: 전면 보호
  const isStagingHost =
    hostname === "staging.dreaminsight.co.kr" ||
    hostname.endsWith(".staging.dreaminsight.co.kr");

  // 프로덕션: /app 이하 보호
  const protectAppPath = pathname.startsWith("/app");

  return isStagingHost || protectAppPath;
}

/** Basic Auth 처리 */
function basicAuth(req: NextRequest) {
  const USER = process.env.BASIC_AUTH_USER ?? "";
  const PASS = process.env.BASIC_AUTH_PASS ?? "";

  // 인증 헤더 파싱
  const header = req.headers.get("authorization");
  let authState = "no-auth-header";

  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const idx = decoded.indexOf(":");
        const u = idx >= 0 ? decoded.slice(0, idx) : "";
        const p = idx >= 0 ? decoded.slice(idx + 1) : "";
        authState = u === USER && p === PASS ? "match" : "mismatch";
        if (authState === "match") {
          const ok = NextResponse.next();
          ok.headers.set("x-di-mw", "auth-ok");
          // 값 노출 방지: 길이만 표기
          ok.headers.set("x-di-env-len", `${USER.length}:${PASS.length}`);
          return ok;
        }
      } catch {
        authState = "decode-failed";
      }
    } else {
      authState = "bad-scheme";
    }
  }

  const res = new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
  res.headers.set("x-di-mw", `auth-challenge:${authState}`);
  // 값 노출 없이 길이만 확인
  res.headers.set(
    "x-di-env-len",
    `${(process.env.BASIC_AUTH_USER ?? "").length}:${(process.env.BASIC_AUTH_PASS ?? "").length}`
  );
  return res;
}

export function middleware(req: NextRequest) {
  // ✅ 진단용 엔드포인트는 임시로 인증 우회 (배포 상태 점검 후 제거 권장)
  if (req.nextUrl.pathname.startsWith("/api/diag")) {
    const res = NextResponse.next();
    res.headers.set("x-di-mw", "diag-bypass");
    return res;
  }

  if (needAuth(req)) return basicAuth(req);

  const res = NextResponse.next();
  res.headers.set("x-di-mw", "bypass");
  return res;
}

/** 미들웨어 적용 범위 (정적 자산/파비콘 제외) */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
