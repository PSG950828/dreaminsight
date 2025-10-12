# Supabase 설정 체크리스트

이 문서는 DreamInsight를 Supabase와 연동해 커뮤니티/저널/통계/백업 기능을 풀스택으로 점검하기 위한 단계별 가이드입니다.

## 1) 프로젝트/버킷/키
- Supabase 프로젝트 생성 → Project URL/Anon Key/Service Role Key 확보
- 스토리지 버킷 생성: 이름 `community`
  - 접근 정책: 공개 읽기 사용(또는 사설 + getPublicUrl 서명 URL 정책으로 대체)

## 2) 환경변수(.env.local)
- `dev/dreaminsight/.env.local.example`를 복사해 값 채우기
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - 선택: `SUPABASE_BUCKET_COMMUNITY=community`
  - 선택: 미들웨어 RL 튜닝 — `DI_RL_WINDOW_SEC`(기본 60), `DI_RL_POSTS`(기본 3), `DI_RL_COMMENTS`(10), `DI_RL_VOTE`(30), `DI_RL_REPORT`(5), `DI_RL_UPLOAD`(10)
  - 선택: CSRF 보호 — `ENABLE_CSRF=true`, `CSRF_ORIGIN_ALLOW="https://staging.example https://app.example"`
  - 선택: 일일 쿼터 — `DAILY_QUOTA_POSTS=3`, `DAILY_QUOTA_UPLOADS=10`, `DAILY_QUOTA_COMMENTS=10`, `DAILY_QUOTA_REPORTS=10`, `NEXT_PUBLIC_DAILY_QUOTA_ANALYZE=3`
  - 선택: `ADMIN_PASSWORD`, `ENABLE_AUTH`(+ `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`)
  - 선택: `HASH_UID=1`, `TELEMETRY_UID_SALT`
  - 선택: 결제/웹훅(`NEXT_PUBLIC_PAYMENT_LINK_URL`, `STRIPE_WEBHOOK_SECRET`)

## 3) 스키마 적용(SQL)
- Supabase 콘솔 → SQL Editor → 파일 `dev/dreaminsight/supabase/schema.sql` 전체 실행
  - 테이블: `posts`, `comments`, `votes`, `reports`, `telemetry`, `telemetry_events`, `admin_aliases`, `journals`
  - RPC: `list_posts`, `list_comments`, `toggle_vote`, `toggle_pin`, `set_reported`
  - 트리거: `journals.updated_at`
  - RLS 정책: 읽기/쓰기/보안 정책 포함(서비스 롤 경유 API 사용 설계)

## 4) 앱 실행/헬스 체크
- `cd dev/dreaminsight && npm ci && npm run dev`
- 관리자 쿠키 발급(`ADMIN_PASSWORD` 설정 시):
  - `curl -X POST http://localhost:3000/api/me-admin -H 'Content-Type: application/json' -d '{"password":"<ADMIN_PASSWORD>"}' -i`
- 헬스: `GET /api/admin/health` → env/storage/db/rpc 상태와 tips 확인

## 5) 커뮤니티 시나리오
- 글: `POST /api/community/posts` (서버 모더레이션 필터/레이트리밋)
- 이미지 업로드: `POST /api/community/upload` (FormData 또는 data-URL JSON)
  - 매직넘버 검사, JPEG/PNG/WebP/GIF 제한, 1.5MB/4096px 제한, 비공개 글 소유자 검증
  - CSRF(옵션) + EXIF 제거(JPEG/WEBP)
- 썸네일: `GET /api/community/images?post=<id>&w=192&h=192`
- 신고/모더레이션: `POST /api/community/report`, `/community/mod`에서 처리
  - 서버 측 1분 레이트리밋(5/min) + 일일 쿼터(옵션), CSRF(옵션)

## 6) 통계/백업
- `/stats`: unknown/unknownRate/noise KPI, 시간대 히트맵, CSV 내보내기
- 백업(관리자 쿠키 필요):
  - DB 스냅샷: `POST /api/admin/backup/db?days=30`
  - 스토리지 매니페스트: `POST /api/admin/backup/storage?days=30`
  - 목록/정리/삭제: `GET /api/admin/backup/list`, `POST /api/admin/backup/cleanup?days=90`, `POST /api/admin/backup/delete`
- 권장: 운영 환경에서 백업은 비공개 버킷으로 분리(공개 노출 금지)

## 7) 문제 해결 팁
- 401/403: 관리자 쿠키/서비스 롤 키/정책 확인
- 429: 레이트리밋 발생(쿠키 `di_uid` 생성 여부와 호출 빈도 확인)
- 업로드 실패: 응답 `error` 코드(`unsupported_type/mime_mismatch/too_large/too_large_dimensions`)와 텔레메트리 `upload.fail.*` 확인
- 썸네일 미노출: 버킷 공개 읽기 및 `getPublicUrl` 반환 확인

### QA 튜닝(스테이징에서 보호 메커니즘 재현)
- `.env.local` 임시 설정 예시(시연용, 운영 복원 필수):
  - `DAILY_QUOTA_POSTS=1`
  - `DAILY_QUOTA_UPLOADS=1`
  - `DAILY_QUOTA_COMMENTS=2`
  - `DAILY_QUOTA_REPORTS=2`
  - `NEXT_PUBLIC_DAILY_QUOTA_ANALYZE=1`
  - `ENABLE_CSRF=true`
  - `CSRF_ORIGIN_ALLOW="https://<staging.example> http://localhost:3000"`
- 검증:
  - `BASE_URL=<호스트> npm run ops:rl-csrf` → posts/comments/vote/report/upload RL·quota 및 CSRF 차단 관찰
  - `BASE_URL=<호스트> ADMIN_PASSWORD=<pw> npm run ops:health` → 헬스/백업 엔드포인트 확인
