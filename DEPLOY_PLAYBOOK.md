# DreamInsight — Deploy & Operations Playbook

본 문서는 Staging/Production 배포, 보안/정책, 백업/복구, 모니터링과 점검 절차를 빠르게 실행하기 위한 체크리스트입니다.

## 1) 환경 구성
- Runtime: Next.js(App Router) + Supabase + Tailwind
- Environments: `staging`, `production`

### 1.1 환경변수(.env)
필수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

선택
- `SUPABASE_BUCKET_COMMUNITY=community` (기본값: `community`)
- `ENABLE_AUTH=true` (Staging에서 Basic Auth 활성화. `BASIC_AUTH_USER`, `BASIC_AUTH_PASS` 필요)
- Stripe: `STRIPE_PAYMENT_LINK*`, `STRIPE_WEBHOOK_SECRET`
- 텔레메트리 UID 해시: `HASH_UID=1`, `TELEMETRY_UID_SALT`

### 1.2 Supabase 초기화(SQL)
아래 항목을 Supabase SQL 에디터에서 실행합니다.
- 확장/테이블/인덱스/트리거/RLS
- RPC: `list_posts`, `list_comments`, `toggle_vote`, `set_reported`
- 스토리지 버킷 `community` 생성 + public read 정책

참고: 이 저장소의 마지막 배포 메시지에 포함된 “Supabase 초기화 SQL (테이블/정책/RPC/인덱스/스토리지)” 블럭을 사용하세요.

## 2) 빌드/배포
### 2.1 사전 점검
- 타입/린트/빌드
  - `cd dev/dreaminsight && npm run typecheck && npm run lint && npm run build`
- 환경변수 채워짐 확인
- Staging 도메인에 Basic Auth 적용(`ENABLE_AUTH=true`)

### 2.2 배포(예: Vercel)
- Project 연결 후 환경변수 주입
- 빌드 성공 확인 → Staging 배포 → 헬스 체크

## 3) 헬스 체크(스테이징)
- Storage 헬스: `GET /api/community/storage/health` → `{ ok: true }`
- 커뮤니티 업로드 HUD: 진행/실패/재시도/일시정지·재개/취소/제외 동작
- 썸네일: `/api/community/images?post=<id>&w=192&h=192`
- 모더레이션/레이트리밋: 욕설/스팸 차단, 투표/신고 429
- 통계(/stats): KPI(미커버/저정보), 업로드/투표/신고/저정보 시간대 카드, CSV 내보내기

## 4) 보안/정책
- 미들웨어(Basic Auth): Staging 전체, Prod에서는 `/app/**` 보호(옵션)
- 모더레이션: 욕설/혐오/연락처/스팸/반복/이모지 과다 차단
- 레이트리밋(미들웨어): `/api/community/*` 쓰기 — posts:3/min, comments:10/min, vote:30/min, report:5/min, upload:10/min (UID/IP 서명 포함)
- 업로드 API: FormData/매직넘버/해상도/용량 검증, 비공개 글 권한 확인

## 5) 백업/복구
관리자 쿠키 `di_admin=1` 필요(통계 페이지 로그인).

### 5.1 백업 API
- DB 스냅샷: `POST /api/admin/backup/db?days=30` (전체는 `&full=1`)
  - 저장: `backups/db/<UTC_STAMP>/*.json`
- 스토리지 매니페스트: `POST /api/admin/backup/storage?days=30`
  - 저장: `backups/storage/<UTC_STAMP>.json`
- 백업 목록: `GET /api/admin/backup/list`
- 오래된 백업 정리: `POST /api/admin/backup/cleanup?days=90`
- 삭제:
  - 디렉터리 단위: `POST /api/admin/backup/delete` body `{ "prefix": "backups/db/<stamp>" }`
  - 파일 단위: body `{ "paths": ["backups/storage/<stamp>.json"] }`

### 5.2 /stats(관리자)에서 실행
- 버튼: “DB 백업(수동)”, “스토리지 매니페스트”, “백업 목록”, “백업 정리(90일)”
- 백업 목록 카드: 최근 10개(다운로드/삭제)

### 5.3 자동화(권장)
- 매일: DB 스냅샷(1일), 스토리지 매니페스트(1일)
- 주 1회: 전체 DB 스냅샷
- 월 1회: 정리(90일 이전 삭제)

예시(curl)
```
# Daily
curl -X POST https://<host>/api/admin/backup/db?days=1
curl -X POST https://<host>/api/admin/backup/storage?days=1
# Weekly
curl -X POST https://<host>/api/admin/backup/db?full=1
# Monthly
curl -X POST https://<host>/api/admin/backup/cleanup?days=90
```

## 6) 모니터링
- /stats KPI: 심볼 매치/미커버/미커버율/저정보
- 시간대 카드: 업로드/투표/신고/저정보
- 업로드 실패 사유 분포: `fail.unsupported / fail.too_large / fail.signature / fail.unauthorized / fail.network`
- 저정보(parse:noise) 추이: 30분 쿨다운 기준으로 상승 추세 감시

## 7) 롤백 가이드
- 애플리케이션: 직전 성공 배포로 롤백(Vercel)
- 데이터: DB 스냅샷(JSON) 기준으로 부분 복원(테이블 단위 Import 스크립트 활용 권장)
- 이미지: 스토리지 매니페스트를 참고해 필요한 파일만 복원(외부 콜드 스토리지 복제 시)

## 8) 사전/해석 엔진 운영 루프
- /stats “동의어 동기화”로 서버 동의어 → 클라 즉시 반영(재컴파일)
- /admin/suggest: 후보 상위 100/300/500 대량 저장 → /stats에서 품질 확인
- unknown 비율 목표: ≤ 10–15%

## 9) 위험요소 & 권장
- 백업 파일 공개 노출 방지: 운영에서는 백업 전용 비공개 버킷 권장
- RPC는 SECURITY DEFINER로 최소한만 공개, 직접 SELECT는 제한
- 투표/신고 남용 모니터링 및 추가 제한 필요 시 강화

---
문의/개선 요청은 /stats 관리자 페이지에서 확인 가능한 지표를 기준으로 스프린트 아이템화하세요.

