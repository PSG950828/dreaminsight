// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 인증이 필요한지 여부를 결정
 * - ENABLE_AUTH=true 일 때만 동작
 * - staging.dreaminsight.co.kr 은 전면 보호
 * - 그 외 프로덕션(메인 도메인)에서는 /app 이하만 보호
 */
function needAuth(req: NextRequest) {
  const enable = process.env.ENABLE_AUTH === "true";
  if (!enable) return false;

  const hostname = req.nextUrl.hostname;       // 예: staging.dreaminsight.co.kr
  const pathname = req.nextUrl.pathname;       // 예: /, /app, /app/dashboard

  // 스테이징: 전면 보호
  const isStagingHost =
    hostname === "staging.dreaminsight.co.kr" ||
    hostname.endsWith(".staging.dreaminsight.co.kr");

  // 프로덕션: /app 이하만 보호 (필요 시 메인 도메인 명시적으로 비교 가능)
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

  // ENV가 비어있으면 인증 자체가 의미 없으므로 401 반환(진단이 쉬움)
  if (!USER || !PASS) {
    return new NextResponse("Auth misconfigured (missing env)", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded); // Edge 런타임: atob 사용 가능
        const idx = decoded.indexOf(":");
        const u = idx >= 0 ? decoded.slice(0, idx) : "";
        const p = idx >= 0 ? decoded.slice(idx + 1) : "";
        if (u === USER && p === PASS) {
          // 성공: 통과
          return NextResponse.next();
        }
      } catch {
        // base64 디코딩 실패 시 아래로 떨어져 401
      }
    }
  }

  // 실패: 팝업 유도
  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(req: NextRequest) {
  // 정적 파일/이미지/파비콘 등은 config.matcher에서 제외하므로 여기서는 페이지 라우트만 통과
  if (needAuth(req)) {
    return basicAuth(req);
  }
  return NextResponse.next();
}

/**
 * 미들웨어 적용 범위
 * - _next/static, _next/image, favicon.ico 등은 제외
 * - 나머지 경로는 전부 미들웨어를 태운다
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
