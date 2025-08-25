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
  // ⚠️ 값은 노출하지 않고 길이만 확인
  res.headers.set(
    "x-di-env-len",
    `${(process.env.BASIC_AUTH_USER ?? "").length}:${(process.env.BASIC_AUTH_PASS ?? "").length}`
  );
  return res;
}

export function middleware(req: NextRequest) {
  if (needAuth(req)) return basicAuth(req);
  const res = NextResponse.next();
  res.headers.set("x-di-mw", "bypass");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
