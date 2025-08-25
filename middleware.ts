// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function needAuth(req: NextRequest) {
  const enable = process.env.ENABLE_AUTH === "true";
  if (!enable) return false;

  const hostname = req.nextUrl.hostname;
  const pathname = req.nextUrl.pathname;

  const isStagingHost =
    hostname === "staging.dreaminsight.co.kr" ||
    hostname.endsWith(".staging.dreaminsight.co.kr");

  const protectAppPath = pathname.startsWith("/app");

  return isStagingHost || protectAppPath;
}

function basicAuth(req: NextRequest) {
  const USER = process.env.BASIC_AUTH_USER ?? "";
  const PASS = process.env.BASIC_AUTH_PASS ?? "";

  if (!USER || !PASS) {
    const res = new NextResponse("Auth misconfigured (missing env)", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
    res.headers.set("x-di-mw", "auth-misconfig");
    return res;
  }

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
          const ok = NextResponse.next();
          ok.headers.set("x-di-mw", "auth-ok");
          return ok;
        }
      } catch {}
    }
  }

  const res = new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
  res.headers.set("x-di-mw", "auth-challenge");
  return res;
}

export function middleware(req: NextRequest) {
  let res: NextResponse;
  if (needAuth(req)) {
    res = basicAuth(req) as NextResponse;
  } else {
    res = NextResponse.next();
    res.headers.set("x-di-mw", "bypass");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
// trigger
