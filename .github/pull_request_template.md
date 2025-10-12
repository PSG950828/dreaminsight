## 요약
- 변경 목적(문제/기회)와 핵심 효과를 한 문장으로 설명해 주세요.

## 주요 변경 사항
- 

## 스크린샷/데모(옵션)
- Before / After 또는 GIF 첨부

## 검증 방법(로컬/스테이징)
- [ ] `npm run typecheck && npm run lint && npm run build`
- [ ] 기능 스모크(주요 흐름)
- [ ] 스테이징 헬스: `npm run ops:health` (BASE_URL, ADMIN_PASSWORD 설정)
- [ ] RL/CSRF: `npm run ops:rl-csrf` (BASE_URL 설정)
- [ ] (옵션) Stripe 웹훅: `npm run ops:webhook:replay -- <di_uid> 30`

## 보안/프라이버시 체크
- [ ] 비밀/키 노출 없음(.env / GitHub Secrets 사용)
- [ ] CSRF 설정 영향 확인(ENABLE_CSRF, CSRF_ORIGIN_ALLOW)
- [ ] 업로드 경로/메타데이터(서명/EXIF 제거) 이상 없음

## 레이트리밋/쿼터 영향
- [ ] 미들웨어 RL(DI_RL_WINDOW_SEC, DI_RL_*) 변경 없음/설명 추가
- [ ] 서버 쿼터(DAILY_QUOTA_*) 변경 없음/설명 추가

## 성능/호환성
- [ ] 빌드 사이즈/경고 확인
- [ ] 브라우저/반응형 주요 뷰 확인(360/768/1280)

## 배포/마이그레이션
- [ ] 환경변수 추가/변경 사항 문서화(PRODUCTION_PROFILE.md, SUPABASE_CHECKLIST.md)
- [ ] DB/RPC/스토리지 스키마 영향(있다면 SQL/롤백 포함)

## 롤백 플랜
- [ ] 직전 안정 배포로 롤백 가능(Vercel)
- [ ] 데이터 영향 시 백업 기준 복원 절차 기재(선택)

## 기타
- 연관 이슈/링크:

