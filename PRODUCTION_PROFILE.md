# DreamInsight — Production Profile (Recommended Settings)

This profile packages our recommended security, rate‑limit, quota, payments, and ops defaults for production.

## 1) Security Posture
- Auth gating: `ENABLE_AUTH=false` in production (staging should be true).
- CSRF: `ENABLE_CSRF=true` and set `CSRF_ORIGIN_ALLOW` to only your app domains.
- Do not expose service role keys to client code. Server APIs load `SUPABASE_SERVICE_ROLE_KEY` only on the server.

## 2) Rate Limits (Edge, cookie/IP best‑effort)
Environment knobs (middleware):
- `DI_RL_WINDOW_SEC=60`
- `DI_RL_POSTS=3`
- `DI_RL_COMMENTS=10`
- `DI_RL_VOTE=30`
- `DI_RL_REPORT=5`
- `DI_RL_UPLOAD=10`

Notes:
- Use CDN/WAF for IP‑based global throttling as an outer layer.
- Server‐side daily quotas (below) complement edge RL for abuse resilience.

## 3) Server Daily Quotas
- `DAILY_QUOTA_POSTS=3`
- `DAILY_QUOTA_UPLOADS=10`
- `DAILY_QUOTA_COMMENTS=10`
- `DAILY_QUOTA_REPORTS=10`

Client analyze quota:
- `NEXT_PUBLIC_DAILY_QUOTA_ANALYZE=3` (Plus bypass; set `NEXT_PUBLIC_FORCE_PLUS=0`)

## 4) Payments & Webhook
- Client A/B 설정(업셀 노출 비율):
  - `NEXT_PUBLIC_UPSELL_WEIGHT_A` (0~1, 기본 0.5)
- 서버 A/B 결제 링크(체크아웃):
  - `CHECKOUT_AB_WEIGHT_A` (0~1, 기본 0.5)
  - 플랜별 링크(A/B): `STRIPE_PAYMENT_LINK_DAY_A|B`, `_WEEK_A|B`, `_MONTH_A|B`
  - 폴백: `STRIPE_PAYMENT_LINK_DAY|WEEK|MONTH` → `STRIPE_PAYMENT_LINK_PLUS|PRO` → `STRIPE_PAYMENT_LINK` → `NEXT_PUBLIC_PAYMENT_LINK_URL(_A|_B)`
- 웹훅/알림:
  - `STRIPE_WEBHOOK_SECRET` 필수(서명 검증)
  - `STRIPE_SLACK_WEBHOOK_URL`(선택) 설정 시 결제 성공 간단 알림

## 5) Supabase
- Bucket: `community` (public read or signed URLs if policy requires).
- Apply `supabase/schema.sql` (tables/RPC/RLS/triggers).

## 6) Turbopack / Build
- `next.config.ts` includes `turbopack.root=__dirname` to silence multi‑lockfile warnings.
- Keep lint/type checks in CI; prod build can ignore lint (`eslint.ignoreDuringBuilds=true`).

## 7) Observability & Ops
- Health: `GET /api/admin/health`, `GET /api/community/storage/health`.
- Backups: use `/api/admin/backup/*` from `/stats` or scripts (`npm run ops:health`).
- Abuse monitoring: `/stats` → uploads fails, vote/report timebands; telemetry in `telemetry_events`.

## 8) Incident Playbook (Quick)
1. Spike in writes → tighten `DI_RL_*` and/or `DAILY_QUOTA_*`, enable CDN throttling.
2. Webhook drift → replay via `npm run ops:webhook:replay -- <di_uid> 30` and/or `ops:entitlement:update`.
3. Data restore → `/api/admin/backup/list` → use `restore-db-from-json.ts` for partial table import.

## 9) Example Environment File
Use `.env.production.example` as a starting point and set real values in deployment secrets.

## 10) KPI Alert Thresholds (CI/Actions)
Release/Smoke workflows compute a lightweight KPI snapshot (7d window) and raise an alert flag when:
- unknownRate > threshold (default 0.15)
- upload failRate > threshold (default 0.10)

You can override per‑run in workflow inputs:
- `unknown_rate_threshold`: e.g., 0.20 for staging, 0.12 for production
- `upload_fail_rate_threshold`: e.g., 0.12 for staging, 0.08 for production

Suggested presets
- Staging: unknownRate 0.20, failRate 0.12 (exploratory traffic)
- Production: unknownRate 0.12–0.15, failRate 0.08–0.10 (tighter SLOs)

## 11) Scheduled Ops (GitHub Actions)
- Nightly Health + Backups + KPIs
  - Workflow: Ops Nightly — Health + KPIs
  - Secrets: `OPS_BASE_URL`, `OPS_ADMIN_PASSWORD`
  - Vars (optional): `KPI_THR_UNKNOWN`, `KPI_THR_UPLOAD_FAIL`
- Weekly Lighthouse Audit
  - Workflow: Lighthouse CI (workflow_dispatch or add a schedule)
  - Inputs: base_url, pages, thresholds
  - 옵션: `publish_pages=true`로 HTML 리포트 Pages에 자동 발행(링크 알림 포함)
