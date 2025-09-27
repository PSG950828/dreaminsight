# 운영/관리자 지침서

본 문서는 DreamInsight 서비스 운영을 위한 관리자 가이드입니다. 환경 변수, 관리자 페이지, 보안/결제, 텔레메트리, 커뮤니티 모더레이션, 사전(딕셔너리) 관리 방법을 요약합니다.

## 1) 환경 변수(.env.local)
- 기본
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 프로젝트 공개 키
  - `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 서비스 키(절대 클라이언트에 노출 금지)
  - `ADMIN_PASSWORD`: 관리자 로그인 비밀번호(/stats, /community/mod 보호)
- 결제/웹훅
  - `STRIPE_PAYMENT_LINK_PLUS`, `STRIPE_PAYMENT_LINK_PRO` 또는 `STRIPE_PAYMENT_LINK`
  - `NEXT_PUBLIC_PAYMENT_LINK_URL`(대안)
  - `STRIPE_WEBHOOK_SECRET`: Stripe 웹훅 서명 검증
- 접근/보안(선택)
  - `ENABLE_AUTH=true`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`: 베이직 인증(미들웨어)
  - `HASH_UID=1`, `TELEMETRY_UID_SALT=임의값`: 텔레메트리 UID 해시 저장

## 2) 관리자 페이지/엔드포인트
- 대시보드: `/stats` (관리자 비번) — 기간 TOP, 증감(%), 스파크라인, 시간대 히트맵, CSV 내보내기
- 모더레이션: `/community/mod` (관리자 비번) — 신고 목록/숨김/삭제
- 공유 카드: `/api/og/post?id=POST_ID` — 커뮤니티 글 OG 이미지
- 결제 API: `/api/checkout` — Payment Link 생성
- 텔레메트리 API
  - `POST /api/telemetry` body: `{ type, key, delta, user_uid }`
  - `GET /api/stats?days=7|30|90` — 집계 반환(현재/전기간, 시리즈, 시간대)
- 관리자 인증 API: `/api/me-admin` (POST { password }) → 쿠키 `di_admin=1` 발급
- 모드 API(서버 프록시)
  - `GET /api/mod/reports`, `POST /api/mod/posts/:id`, `DELETE /api/mod/posts/:id`
- 사전(서버) API(관리자)
  - `GET /api/admin/dict/aliases?key=SYM_KEY`
  - `POST /api/admin/dict/aliases` body: `{ key, alias }`
  - `DELETE /api/admin/dict/aliases` body: `{ key, alias }`

## 3) 결제/Plus 플래그
- 성공/취소 페이지: `/checkout/success`, `/checkout/cancel`
  - 성공 시 `localStorage.dreaminsight.plus=1` + 쿠키 `di_plus=1`
- 서버 권한 저장: 성공 시 `/api/entitlements/activate`에 `user_uid`를 전송하여 Supabase `entitlements` 테이블에 권한을 저장합니다.
  - 테이블 권장 스키마: `user_uid text primary key`, `plus boolean`, `plus_until timestamptz null`, `created_at timestamptz default now()`, `updated_at timestamptz`(트리거로 갱신)
  - `/api/me`는 쿠키(`di_plus`)와 함께 `entitlements`를 조회하여 Plus 여부를 반환합니다.
- 대시보드/분해는 Plus일 때 전체 표시. 업셀은 결제 링크 또는 업셀 모달로 연결.

## 4) 텔레메트리/프라이버시
- 서버: `telemetry`, `telemetry_events` 테이블(집계/이벤트)
- UID 해시: `HASH_UID=1`과 `TELEMETRY_UID_SALT` 설정 시 SHA-256 해시 저장
- 관리자만 /stats 접근(쿠키 `di_admin=1`)

## 5) 커뮤니티/안전
- 하드 모더레이션(서버): 욕설/혐오/스팸/연락처/과도 반복/이모지 과다 차단
- 레이트리밋(미들웨어): `/api/community/*` 쓰기 요청 분당 제한(게시3/댓글10/신고5/투표30)
- 신고/차단/핀: 신고 시 사유 저장(reports), 모더레이션 뷰에서 처리(숨김/해제/삭제)

## 6) 사전(딕셔너리) 관리
- 로컬 동의어: /stats 라벨 상세 패널에서 “사전 동의어 추가(로컬)” — 즉시 반영(localStorage)
- 서버 동의어(관리자): `POST /api/admin/dict/aliases` — Supabase `admin_aliases` 테이블 저장(팀 공유용)
- 클라이언트 병합: 관리자일 때 앱이 `/api/admin/dict/aliases`를 가져와 `localStorage`에 캐시하고 별칭 패턴을 즉시 재컴파일합니다. /stats 상단의 “동의어 동기화” 버튼으로 수동 동기화 가능.
- 서버/CLI 병합: SSR/CLI 경로는 60초 캐시로 Supabase `admin_aliases`를 불러와 해석에 반영합니다.
- 병합 순서: 기본 사전 → 확장 사전 → 로컬 동의어 → 서버 동의어(클라이언트 캐시/서버 주입).

## 7) 운영 체크리스트
- 배포 전: .env 확인(서비스 키/웹훅/결제 링크), HASH_UID 설정
- 보안: 관리자 비번 교체 주기, 서비스 키 노출 금지, 웹훅 서명 검증
- 데이터: /stats TOP/증감 체크 → 자주 쓰이는 표현을 사전에 편입
- 커뮤니티: /community/mod에서 신고 처리 및 품질 유지

필요 시 이 문서를 팀 위키에도 복제하여 최신 상태로 유지하세요.
## 8) 개인 꿈 보관(서버)
- 테이블 권장 스키마(`journals`):
  - `id uuid primary key default gen_random_uuid()`
  - `user_uid text not null` — 디바이스/사용자 식별자(쿠키 `di_uid`)
  - `text text not null`
  - `analysis jsonb null` — 해석 결과 스냅샷(요약/상징/조언 등)
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()` (트리거로 갱신)
- API
  - `GET /api/journal?limit=1000` — 본인(`di_uid`)의 최근 N개 반환
  - `POST /api/journal` body: `{ text, analysis }` — 새 항목 저장
  - `DELETE /api/journal/:id` — 본인 항목 삭제
- 클라이언트
  - 메인 해석 화면은 생성 시 서버에 비동기 저장(로컬과 병행)
  - 전용 보관함 `/journal`은 서버 목록을 로딩 가능하면 병합/표시
