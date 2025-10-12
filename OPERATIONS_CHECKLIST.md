# DreamInsight — Operations Checklist (Roles & Routines)

## Roles
- Release Manager
  - 배포 승인/롤백 결정, Change log 공유, 헬스/지표 확인 주관
- Backend (Supabase/API)
  - SQL/RPC/정책 변경, 백업/정리 스케줄 관리, 성능/보안 점검
- Frontend (Next.js)
  - 릴리즈 브랜치·환경변수 확인, UI 리그레션, 접근성/성능 점검
- Data/Quality
  - /stats 지표 리뷰(unknown/parse:noise/업로드 실패), 사전 보강 루프 실행
- SRE
  - 모니터링/알림, 장애 대응, 비용/리소스 관리

## Pre‑Deploy (Staging)
- [ ] 환경변수 점검(Secrets, Basic Auth)
- [ ] Supabase SQL 적용(테이블/정책/RPC/스토리지)
- [ ] 타입/린트/빌드 통과
- [ ] 헬스 체크: `/api/community/storage/health`
- [ ] 커뮤니티 업로드 HUD(실패/재시도/일시정지/취소/제외)
- [ ] /stats KPI/시간대/CSV 확인(저정보 포함)
- [ ] 백업 버튼 테스트(DB/스토리지/목록/정리)

## Pre‑Deploy (Prod)
- [ ] Staging 승인 / Change log 공유
- [ ] ~~환경변수 차이 검토(Stripe/도메인 등)~~ **[서비스 무료화로 Stripe 관련 환경변수 불필요]**
- [ ] 빠른 헬스 체크 동일 수행

## Post‑Deploy (D+0)
- [ ] /stats: unknown ≤ 15%, parse:noise 과다 상승 여부
- [ ] 업로드 실패 사유 분포 확인(fail.*)
- [ ] 투표/신고 429 발생률 과다 여부

## Weekly
- [ ] /admin/suggest 대량 저장 → /stats 동의어 동기화
- [ ] unknown 상위 문구 수집 → 사전/보정 규칙 반영
- [ ] 커버리지 자동 주입(추천 기반)
  - Dry-run: `GET /api/admin/dict/ingest-coverage?days=14&limit=500&min=3`
  - Apply:   `POST /api/admin/dict/ingest-coverage?days=14&limit=500&min=3`
  - Script:  `BASE_URL=<host> ADMIN_PASSWORD=<pw> DAYS=14 LIMIT=500 MIN=3 npm run -s ops:coverage:ingest`
  - Actions: GitHub Actions → "Ops — Coverage Ingest" 수동 실행
- [ ] 백업 목록 증가율 점검(필요시 cleanup 주기 조정)

## Monthly
- [ ] /api/admin/backup/cleanup?days=90 실행(또는 스케줄 확인)
- [ ] 복구 리허설(스테이징): DB JSON 일부 Import + 이미지 샘플 복원
- [ ] 비용/성능 리뷰(스토리지/쿼리/트래픽)

## Incident Response
- [ ] 롤백 시나리오: Vercel 이전 버전 복구
- [ ] 데이터 이상: 최근 DB 스냅샷으로 테이블 단위 부분 복원
- [ ] 이미지 손실: 스토리지 매니페스트 기반 필요한 파일만 복원

### 롤백 워크플로우(GitHub Actions)
- `Rollback — Vercel Production` 실행 → `deployment_url` 입력(이전 배포 URL) → Promote to prod
- 참고: Vercel CLI의 `vercel promote <url> --prod` 사용

## Operations Runbook

### 1) 폭주/남용 대응 (429, RL/쿼터)
- 증상
  - 사용자 429 빈발, 업로드 실패 증가, 댓글/신고 급증, API 지연.
- 진단
  - /stats 시간대 카드(uploads/vote/report)에서 급증 구간 확인.
  - 텔레메트리(DB) 샘플 쿼리: `telemetry_events`
    - 일일 쿼터 적중(post/upload): `type='quota' AND k IN ('post','upload','comment','report')`
    - 업로드 실패 분포: `type='upload' AND k LIKE 'fail.%'`
  - 프록시/CDN(예: Vercel/Cloudflare) 로그에서 특정 IP/UA 폭주 여부 확인.
- 즉각 대응(우선순위)
  1) CSRF 강화: `ENABLE_CSRF=true`, `CSRF_ORIGIN_ALLOW`에 허용 오리진만 기입 → 재배포.
  2) 엣지 레이트리밋: CDN/WAF에서 `/api/community/*` 쓰기 요청 분당/분초 제한(아이피/UA 기준) 적용.
  3) 서버 쿼터/엣지 RL 튜닝: `.env`에서 `DAILY_QUOTA_*`(POST/UPLOAD/COMMENTS/REPORTS) 또는 미들웨어 RL(`DI_RL_WINDOW_SEC`, `DI_RL_POSTS`, `DI_RL_COMMENTS`, `DI_RL_VOTE`, `DI_RL_REPORT`, `DI_RL_UPLOAD`) 조정 후 재배포.
  4) 금지어/태그 보강: `src/app/api/community/posts/route.ts`의 `FORBIDDEN_TAGS`·금지어 목록 점검 및 보강.
  5) (최후) 미들웨어 분당 제한 수정: `middleware.ts`의 `limits` 값을 상황에 맞게 조정 후 재배포.
- 후속
  - /stats에서 상위 텍스트/태그 패턴 점검 → 모더레이션 단어/정책 업데이트.
  - Abuse IP/ASN 차단(프록시/WAF). 필요 시 임시 국가 제한 검토.

### 2) ~~Stripe 웹훅 실패/지연 대응 (Plus 미적용)~~ **[DEPRECATED - 서비스 무료 전환]**
<!--
- 증상
  - 결제 성공 후 `/api/me` 응답에서 `plus=false`, 혹은 적용 지연.
- 진단
  - 환경변수 확인: `STRIPE_WEBHOOK_SECRET` 설정/오타 여부.
  - Stripe 대시보드 → Webhooks → 최근 이벤트 재시도(로그의 서명검증 실패 여부 확인).
  - DB 확인: `entitlements`에서 대상 `user_uid`의 `plus/plus_until` 상태.
  - 서버 로그: `src/app/api/stripe/webhook/route.ts`에서 `console.log`된 이벤트 타입 확인.
- 즉시 복구(수동 업서트)
  1) 관리자 쿠키 발급(`/api/me-admin`): body `{ "password": "<ADMIN_PASSWORD>" }`
  2) 엔타이틀먼트 수동 갱신:
     - `POST /api/entitlements/update` (관리자) body 예시:
       `{ "user_uid": "u_xxx", "plus": true, "plus_until": "2025-12-31T15:00:00.000Z" }`
  3) Stripe 이벤트 재전송(대시보드 Re‑deliver)로 파이프라인 정상 동작 재확인.
- 예방
  - 체크아웃 시 `metadata.di_uid` 또는 `client_reference_id`에 `di_uid`가 반드시 포함되도록 점검.
  - 스테이징에서 Stripe CLI(또는 대시보드 테스트 이벤트)로 서명 검증/업서트 흐름 사전 검증.
-->

### 3) 백업/복구 (DB/스토리지)
- 확인
  - 백업 목록: `GET /api/admin/backup/list` (관리자 쿠키 필요)
  - 원클릭: `/stats` → “DB 백업(수동)”/“스토리지 매니페스트” 버튼 실행 결과 확인.
- DB 복구(부분/테이블 단위)
  1) 최신 스냅샷(JSON) 획득(스토리지/CI 아카이브 등).
  2) 로컬에서 서비스 롤 키로 스크립트 실행:
     - `cd dev/dreaminsight`
     - `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` 설정
     - `npm run backup:restore-sql` 또는 `ts-node scripts/restore-db-from-json.ts` 실행(필요 테이블만 지정)
  3) Supabase 콘솔로 소용량 JSON은 SQL Editor Import도 가능(주의: RLS/정책 영향 검토).
  4) 복구 후 인덱스/RPC/트리거/정책 일관성 점검.
- 스토리지 복구
  - 매니페스트(`backups/storage/<UTC>.json`) 기준 필요한 파일만 선별 복원.
  - Supabase Storage 콘솔/SDK로 경로 `posts/<postId>/<file>`에 업로드. 공개 읽기/정책 재검토.
- 주의
  - 반드시 스테이징에서 리허설(샘플 테이블) 후 운영 복구.
  - 테이블 참조 순서(Journals/Posts/Comments 등 외래키)와 트리거를 고려.

### 4) 헬스/점검 단축키
- `GET /api/admin/health` — env/storage/db/rpc 상태 및 팁
- `GET /api/community/storage/health` — 스토리지 버킷/정책 확인
- `GET /api/stats/coverage` — 최근 N일 unknown 상위 토큰 미리보기

## QA 튜닝 팁(임시 설정으로 보호 메커니즘 가시화)
- 목적: 스테이징에서 레이트리밋/일일 쿼터/CSRF 차단을 빠르게 재현해 시연/검증.
- 권장 임시 값(.env.local):
  - `DAILY_QUOTA_POSTS=1`
  - `DAILY_QUOTA_UPLOADS=1`
  - `DAILY_QUOTA_COMMENTS=2`
  - `DAILY_QUOTA_REPORTS=2`
  - `NEXT_PUBLIC_DAILY_QUOTA_ANALYZE=1`
  - `ENABLE_CSRF=true` + `CSRF_ORIGIN_ALLOW="https://<스테이징도메인> http://localhost:3000"`
- 절차:
  1) 위 값을 설정 후 재배포(또는 로컬 재시작).
  2) `BASE_URL=<호스트> npm run ops:rl-csrf` 실행 → 각 버킷의 OK/RL/quota 및 CSRF 차단 여부 요약 확인.
  3) `BASE_URL=<호스트> ADMIN_PASSWORD=<pw> npm run ops:health`로 헬스/백업도 함께 점검.
- 주의: QA 종료 후 원래 운영 값으로 반드시 되돌린 뒤 재배포.

## KPI 경보 임계치 (Actions 입력)
- 배포/스모크 워크플로우 실행 시 다음 입력으로 경고 민감도 조정 가능
  - `unknown_rate_threshold` (기본 0.15): /stats unknownRate 경계
  - `upload_fail_rate_threshold` (기본 0.10): 업로드 실패율 경계
- 권장값
  - 스테이징: unknownRate 0.20, failRate 0.12
  - 프로덕션: unknownRate 0.12–0.15, failRate 0.08–0.10
