// app/api/diag/route.ts
export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") ?? "";

  const enable = process.env.ENABLE_AUTH ?? "";
  const user = process.env.BASIC_AUTH_USER ?? "";
  const pass = process.env.BASIC_AUTH_PASS ?? "";

  return new Response(
    JSON.stringify({
      ok: true,
      hostname: url.hostname,
      path: url.pathname,
      auth: {
        present: !!auth,
        scheme: auth.split(" ")[0] || null,
      },
      env: {
        enable,
        userLen: user.length,
        passLen: pass.length,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
