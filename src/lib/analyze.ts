// src/lib/analyze.ts
import * as DICT from "./dictionary";
import { getServiceSupabase } from "./supabaseServer";

/** 0) 전처리: dictionary.ts의 표준 전처리 사용으로 일원화 */
function preprocessDreamText(raw: string): string {
  try {
    return DICT.preprocessDreamText(raw || "");
  } catch {
    return (raw || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  }
}

/** (옵션) 결과 표준 형태 */
export type AnalyzeResult = {
  input: {
    raw: string;          // 원본
    preprocessed: string; // 전처리 후
  };
  symbols: Array<{ key: string; label: string; tags: string[]; meaning: string; advice?: string }>;
  cues: {
    colors: Array<{ key: string; label: string; tags: string[] }>;
    emotions: Array<{ key: string; label: string; tags: string[] }>;
  };
  advice: string[];
  prompts: string[];
  actionPlan?: Array<{ key: string; title: string; duration: number; script: string; tags?: string[]; reason?: string }>;
  evidence?: { matchedSymbols: string[]; rules: string[]; confidence: number; alternatives: string[] };
  suggestions?: Array<{ key: string; label: string; reason: string }>;
};

/** 1) 메인 엔진: 이제 항상 전처리부터 돌린다 */
export function analyzeDream(dreamText: string): AnalyzeResult {
  // 서버/CLI에서만: 관리자 서버 동의어를 주입해 해석에 반영
  maybeLoadServerAliases().catch(()=>{});
  const pre = preprocessDreamText(dreamText);

  // 사전 매칭 + 색/감정 추출
  const quick = analyzeWithDictionary(pre);
  const ap = buildAdviceAndPrompts(pre);
  const plan = buildActionPlan(pre, quick);
  const ev = buildEvidence(pre, quick);
  const sug = buildSuggestions(pre, quick);

  // 프리젠테이션용으로 합치기
  const mergedSymbols = DICT.getMergedSymbols();
  const symbols = quick.symbolKeys.map((k: string) => {
    const s = mergedSymbols[k];
    return {
      key: k,
      label: s?.label ?? k,
      tags: s?.tags ?? [],
      meaning: s?.meaning ?? "",
      advice: s?.advice,
    };
  });

  return {
    input: { raw: dreamText, preprocessed: pre },
    symbols,
    cues: quick.cues,
    advice: ap.advice,
    prompts: ap.prompts,
    actionPlan: plan,
    evidence: ev,
    suggestions: sug,
  };
}

// ===== Utility: lightweight text normalize & correction & analysis =====
// NOTE: The normalizer/corrections/analyzer below are LOCAL to this file; do not import them from dictionary.ts

// 0) 간단 정규화 (NFKC, 공백/구두점 정리, 영문 소문자화)
// (전처리는 dictionary.ts의 preprocessDreamText로 일원화했습니다)

// 1) 붙여쓰기/오타 보정 (최소 안전치만 반영)
// (오타 보정은 dictionary.ts의 KOR_CORRECTIONS/EMOTION_CORRECTIONS에 통합)

// 2) 심볼/단서 추출
type Cue = { key: string; label: string; tags: string[] };
type QuickAnalysis = {
  symbolKeys: string[];
  cues: { colors: Cue[]; emotions: Cue[] };
};

// 색상 단서 추가 정의 (사전에 없는 색상까지 보강: 노란색 등)
// (색 단서는 dictionary.extractColorCues 사용)

// 감정 단서 (라이트버전)
// (감정 단서는 dictionary.extractEmotionCues 사용)

// 텍스트 내 포함 여부(부분문자열) 헬퍼
// (includesAny는 불필요하여 제거)

// '이가' 모호성 방지: 이/치아로 해석할 컨텍스트인지 체크
function looksLikeTeethContext(txt: string): boolean {
  // '이가' + 치아 맥락 동사/형용사 근접
  const re = /이가.{0,4}(빠지|부서|부러|깨지|아프|썩)/;
  return re.test(txt) || txt.includes("치아") || txt.includes("이빨");
}

// 사전/별칭 조회용 캐시
const MERGED = DICT.getMergedSymbols();

export function analyzeWithDictionary(text: string): QuickAnalysis {
  // 2-1) 심볼 매칭: 사전 내성 매칭 유틸 사용(오타/띄어쓰기/퍼지)
  let symbolKeys: string[] = [];
  try {
    if ((DICT as any).matchAliasKeys) {
      symbolKeys = ((DICT as any).matchAliasKeys(text) as string[]) || [];
    }
  } catch {
    symbolKeys = [];
  }

  // 2-2) 색/감정 단서: 사전 유틸 + 로컬 백업
  let colors: Cue[] = [];
  let emotions: Cue[] = [];
  try { if ((DICT as any).extractColorCues) colors = ((DICT as any).extractColorCues(text) as Cue[]) || []; } catch {}
  try { if ((DICT as any).extractEmotionCues) emotions = ((DICT as any).extractEmotionCues(text) as Cue[]) || []; } catch {}

  // 특수: teeth 맥락 보정
  if (symbolKeys.includes('teeth') && !looksLikeTeethContext(text)) {
    symbolKeys = symbolKeys.filter(k => k !== 'teeth');
  }

  return { symbolKeys: Array.from(new Set(symbolKeys)), cues: { colors, emotions } };
}

// 3) 조언/프롬프트 생성 (라이트버전)
export function buildAdviceAndPrompts(text: string): { advice: string[]; prompts: string[] } {
  const { symbolKeys, cues } = analyzeWithDictionary(text);

  const advice: string[] = [];
  const prompts: string[] = [
    "이 꿈에서 가장 강했던 감정과 그 첫 기억은?",
    "꿈 속 ‘나’가 하지 못한 행동은 무엇이며, 현실에서 10분 실험 가능?",
    "반복 상징이 내 삶의 어떤 영역을 은유하나?",
  ];

  // 심볼 기반: 사전에 조언이 있으면 수집
  for (const k of symbolKeys) {
    const s = MERGED[k];
    if (s?.advice) advice.push(s.advice);
  }

  // 감정 기반 보강
  const emoKeys = cues.emotions.map((e) => e.key);
  if (emoKeys.includes("emo_anxiety")) {
    advice.push("불안을 줄이는 가장 빠른 길은 '작은 통제 회복'. 10분 정리·호흡·라벨링 중 하나 즉시.");
  }
  if (emoKeys.includes("emo_sadness")) {
    advice.push("우울 신호: 수면·빛·움직임 중 오늘 한 가지를 바로 보정하세요.");
  }
  if (emoKeys.includes("emo_fear")) {
    advice.push("두려움의 이름을 1단어로 적고 4-7-8 호흡 3회 후 작은 노출을 시도하세요.");
  }

  // 색상 기반 보강
  const colorKeys = cues.colors.map((c) => c.key);
  if (colorKeys.includes("color_red")) {
    advice.push("즉흥 행동 전 10초 멈춤 규칙을 적용해 충동을 낮추세요.");
  }
  if (colorKeys.includes("color_yellow")) {
    advice.push("주의 신호: 결정 전에 핵심 질문 1개를 더 점검하세요.");
  }
  if (colorKeys.includes("color_green")) {
    advice.push("자연 노출 10분으로 회복 채널을 여세요.");
  }
  if (colorKeys.includes("color_black")) {
    advice.push("두려움의 이름을 1단어로 적고 호흡 3회로 안정하세요.");
  }
  if (advice.length === 0) {
    advice.push("꿈은 감정의 메타데이터. 감정-색-행동 중 하나를 현실에서 의식적으로 전환해 보세요.");
  }

  return {
    advice: Array.from(new Set(advice)).slice(0, 6),
    prompts,
  };
}

// 4) 심층 해석 API: GI/MDA 내러티브 포함 (프리미엄 보고서용)
export type DeepAnalyzeResult = AnalyzeResult & {
  narrative: string; // GI/MDA 통합 내러티브
  gi?: any;
  mda?: any;
};

export function analyzeDreamDeep(dreamText: string): DeepAnalyzeResult {
  const base = analyzeDream(dreamText);
  let narrative = "";
  let gi: any = undefined;
  let mda: any = undefined;
  try {
    const hybrid = (DICT as any).buildHybridInsight
      ? (DICT as any).buildHybridInsight(base.input.preprocessed)
      : null;
    if (hybrid) {
      narrative = hybrid.narrative;
      gi = hybrid.gi;
      mda = hybrid.mda;
    }
  } catch {
    // optional: dictionary.ts may not expose hybrid yet
  }
  return { ...base, narrative, gi, mda };
}

// ── 코칭: 행동 계획 생성 (5/10/25분) ─────────────────────────────
function hasSymbol(qa: QuickAnalysis, key: string) { return qa.symbolKeys.includes(key); }
function hasEmotion(qa: QuickAnalysis, key: string) { return qa.cues.emotions.some(e => e.key === key); }
function hasColor(qa: QuickAnalysis, key: string) { return qa.cues.colors.some(c => c.key === key); }

export function buildActionPlan(text: string, qa: QuickAnalysis): Array<{ key: string; title: string; duration: number; script: string; tags?: string[]; reason?: string }> {
  const out: Array<{ key: string; title: string; duration: number; script: string; tags?: string[]; reason?: string }> = [];

  // B) 규칙 샘플
  if (hasSymbol(qa, 'teeth') && hasEmotion(qa, 'emo_anxiety')) {
    out.push({ key: 'plan_teeth_anx_5', title: '4-7-8 호흡 3회', duration: 5, script: '4초 들이마시고, 7초 멈춤, 8초 내쉼 ×3회. 호흡 후 치아 관련 불안을 한 단어로 라벨링.', tags: ['불안↓','호흡'], reason: '치아×불안 → 발화/자기이미지' });
    out.push({ key: 'plan_teeth_anx_10', title: '발화 연습(10분)', duration: 10, script: '핵심 문장 1개를 소리내어 3번 읽고, 1분 셀카 스피치로 녹음.', tags: ['표현','연습'], reason: '발화 효능감 회복' });
  }
  if (hasSymbol(qa, 'falling') && hasColor(qa, 'color_black')) {
    out.push({ key: 'plan_fall_black_10', title: '리스크 버퍼 점검', duration: 10, script: '오늘 일정에서 최악의 경우를 상상하고 1) 중단 기준, 2) 연락처, 3) 대체 경로를 메모.', tags: ['안전','리스크'], reason: '추락×검정 → 급락 공포' });
  }
  if (hasSymbol(qa, 'exam') && hasSymbol(qa, 'cannot_speak')) {
    out.push({ key: 'plan_exam_speak_5', title: '3분 리허설', duration: 5, script: '핵심 메시지 1문장 → 근거 2개를 3분 스피치로 녹음. 반복 1회.', tags: ['평가','표현'], reason: '시험×발화불능' });
  }
  if (hasSymbol(qa, 'chase') && hasSymbol(qa, 'hiding')) {
    out.push({ key: 'plan_chase_hide_25', title: '25분 스타터 블록', duration: 25, script: '도망친 과제 1개를 25분 타이머로 착수. 끝난 뒤 감정 한 줄 기록.', tags: ['회피→착수'], reason: '추격×숨기' });
  }
  // 긍정 번들: 보라색 + 웃음 + 달리기(텍스트 기반 간단 탐지)
  const hasPurple = /보라|퍼플|자주|violet|purple/.test(text);
  const laughed = /웃|ㅎㅎ|ㅋㅋ|하하|헤헷/.test(text);
  const ran = /달리|러닝|뛰/.test(text);
  if (hasPurple && laughed && ran) {
    out.push({ key: 'plan_pos_bundle_10', title: '영감 캡처 10분', duration: 10, script: '조용한 곳에서 오늘 떠오른 아이디어를 10분간 메모/스케치.', tags: ['영감','기록'], reason: '보라+웃음+달리기' });
    out.push({ key: 'plan_pos_bundle_25', title: '추진 세션 25분', duration: 25, script: '작은 한 조각을 바로 실행(코딩/글쓰기/정리). 끝나면 복기 2줄.', tags: ['추진','실행'], reason: '보라+웃음+달리기' });
  }

  // ── 신규 조합: 관계/직장/건강/디지털 ─────────────────────────
  // 관계: 말다툼 + 질투 → 3줄 I-메시지 + 요청
  if (hasSymbol(qa, 'partner_argument') && hasSymbol(qa, 'jealousy_scene')) {
    out.push({ key: 'plan_rel_i_msg_10', title: 'I-메시지 10분', duration: 10, script: "사실-느낌-요구 각 1문장(I-메시지) 작성 → 전달 전 소리내어 읽기.", tags: ['관계','소통'], reason: '연인 다툼×질투' });
  }
  // 관계: 반지 분실 + 결혼식 취소 → 약속/가치 재선언
  if (hasSymbol(qa, 'ring_lost') && hasSymbol(qa, 'wedding_canceled')) {
    out.push({ key: 'plan_rel_values_10', title: '가치/약속 재선언', duration: 10, script: "관계 가치를 1문장으로 쓰고, 다음 7일의 작은 약속 1개를 합의.", tags: ['가치','약속'], reason: '반지×식 취소' });
  }
  // 직장: 상사 질책 + 동료 갈등 → 피드백 3줄 + 협업 규칙
  if (hasSymbol(qa, 'boss_criticism') && hasSymbol(qa, 'coworker_conflict')) {
    out.push({ key: 'plan_work_feedback_10', title: '피드백 3줄 요약', duration: 10, script: "사실-영향-다음 행동을 각 1줄로 문서화.", tags: ['직장','피드백'], reason: '상사 질책×동료 갈등' });
    out.push({ key: 'plan_work_contract_25', title: '협업 규칙 합의', duration: 25, script: "역할/시간/결과 3줄 작업계약을 작성해 공유.", tags: ['협업','규칙'], reason: '상사 질책×동료 갈등' });
  }
  // 건강: 검진 + 불안 → 질문 메모 + 대기 루틴
  if (hasSymbol(qa, 'medical_checkup') && hasEmotion(qa, 'emo_anxiety')) {
    out.push({ key: 'plan_health_precheck_10', title: '검진 질문 10분', duration: 10, script: "의사에게 물을 질문 1개와 최근 증상/기간/강도를 메모.", tags: ['건강','준비'], reason: '검진×불안' });
    out.push({ key: 'plan_health_wait_5', title: '대기 루틴 5분', duration: 5, script: "결과 대기 중 저자극 루틴(물 한 잔, 호흡 3회, 산책 5분).", tags: ['불안↓','회복'], reason: '검진×불안' });
  }
  // 건강: 발열/기침/두통/복통 → 휴식/수분/가벼운 회복 루틴
  if (hasSymbol(qa, 'fever') || hasSymbol(qa, 'cough') || hasSymbol(qa, 'headache') || hasSymbol(qa, 'stomach_pain')) {
    out.push({ key: 'plan_health_rest_10', title: '회복 루틴 10분', duration: 10, script: "수분 섭취 + 눈 휴식/가벼운 스트레칭 + 자극 줄이기.", tags: ['회복','휴식'], reason: '신체 증상' });
  }
  // 디지털: 로그인 실패 + 비번 잊음 → 비번관리/백업/2FA 3단계
  if (hasSymbol(qa, 'login_failed') && hasSymbol(qa, 'password_forgot')) {
    out.push({ key: 'plan_sec_pass_10', title: '비번/복구 10분', duration: 10, script: "비번 관리자 설정, 백업 코드 저장, 보안질문/메일 점검.", tags: ['보안','접근'], reason: '로그인 실패×비번 잊음' });
    out.push({ key: 'plan_sec_2fa_5', title: '2FA 활성화 5분', duration: 5, script: "핵심 계정 2개에 2FA 즉시 켜기.", tags: ['보안','2FA'], reason: '로그인 실패×비번 잊음' });
  }
  // 디지털: 계정 해킹 → 즉시 3단계
  if (hasSymbol(qa, 'account_hacked')) {
    out.push({ key: 'plan_sec_hacked_10', title: '세션 종료/비번변경', duration: 10, script: "모든 세션 종료 → 비번 변경 → 2FA 활성화 순으로 실행.", tags: ['보안','침해'], reason: '계정 해킹' });
  }
  // 디지털: 알림 폭주 → 노이즈 절감
  if (hasSymbol(qa, 'notifications_overflow')) {
    out.push({ key: 'plan_noise_cut_10', title: '알림 정리 10분', duration: 10, script: "오늘 하루 알림 채널 1개만 남기고 모두 끄기.", tags: ['노이즈↓','집중'], reason: '알림 폭주' });
  }
  // 디지털: 동기화 끊김 + 파일 삭제 → 백업/버전복구
  if (hasSymbol(qa, 'cloud_sync_lost') && hasSymbol(qa, 'file_deleted')) {
    out.push({ key: 'plan_backup_15', title: '백업/복구 15분', duration: 15, script: "휴지통/이전 버전 복구 확인 → 중요한 폴더 1개 수동 백업.", tags: ['백업','복구'], reason: '동기화 끊김×파일 삭제' });
  }

  // ── 추가 보강 룰(배치 2) ──────────────────────────────────────
  // 관계: 이별 + 읽씹 → 애도/경계 회복
  if (hasSymbol(qa, 'partner_breakup') && hasSymbol(qa, 'left_on_read')) {
    out.push({ key: 'plan_rel_grief_10', title: '애도 10분', duration: 10, script: '관계의 감사/후회/배움 각 1문장 기록.', tags: ['애도','경계'], reason: '이별×읽씹' });
  }
  // 관계: 시댁/처가 식사 + 시어머니 갈등 → 파트너 연대 규칙
  if (hasSymbol(qa, 'inlaws_dinner') && hasSymbol(qa, 'mother_in_law_conflict')) {
    out.push({ key: 'plan_rel_alliance_10', title: '연대 규칙 10분', duration: 10, script: '파트너와 한 팀 규칙 1개 합의(완충/역할 분담).', tags: ['연대','경계'], reason: '가족 식사×세대 갈등' });
  }
  // 직장: 상사 칭찬 → 승리 기록/재현 루틴
  if (hasSymbol(qa, 'boss_praise')) {
    out.push({ key: 'plan_work_win_5', title: '작은 승리 기록', duration: 5, script: '오늘 잘한 1가지를 문장/근거로 기록하고 재현 조건 메모.', tags: ['인정','루틴'], reason: '상사 칭찬' });
  }
  // 건강: 격리/감염 + 슬픔 → 연결 1가지 설계
  if (hasSymbol(qa, 'quarantine') && hasEmotion(qa, 'emo_sadness')) {
    out.push({ key: 'plan_health_connect_10', title: '연결 설계 10분', duration: 10, script: '오늘 연락할 사람 1명 선택 → 짧은 안부 메시지 전송.', tags: ['연결','우울↓'], reason: '격리×우울' });
  }
  // 건강: 두통 + 알림 폭주 → 디지털 디톡스
  if (hasSymbol(qa, 'headache') && hasSymbol(qa, 'notifications_overflow')) {
    out.push({ key: 'plan_detox_25', title: '디지털 디톡스 25분', duration: 25, script: '무알림 25분(휴대폰 비행기 모드) → 산책/눈 휴식.', tags: ['집중','회복'], reason: '두통×알림 폭주' });
  }
  // 디지털: 2FA 언급 + 비번 잊음 → 백업 코드 관리
  if (hasSymbol(qa, 'two_factor') && hasSymbol(qa, 'password_forgot')) {
    out.push({ key: 'plan_2fa_backup_10', title: '백업 코드 정리', duration: 10, script: '2FA 백업 코드 인쇄/암호화 노트 저장, 복구 이메일 확인.', tags: ['2FA','복구'], reason: '2FA×비번 잊음' });
  }

  // 배치 3 — 추가 6개 내외
  // 관계: 친구 배신 + 슬픔 → 관계 지도 재정렬
  if (hasSymbol(qa, 'friend_betrayal') && hasEmotion(qa, 'emo_sadness')) {
    out.push({ key: 'plan_rel_map_15', title: '관계 지도 15분', duration: 15, script: '에너지 지도(사람/빈도/깊이) 작성 → 과부하 연결 1개 줄이기.', tags: ['관계','정리'], reason: '배신×슬픔' });
  }
  // 관계: 질투 + 읽씹 → 경계 회복
  if (hasSymbol(qa, 'jealousy_scene') && hasSymbol(qa, 'left_on_read')) {
    out.push({ key: 'plan_rel_boundary_10', title: '경계 회복 10분', duration: 10, script: '내 하루 우선순위 1개 재선언, 답장 기대 24시간 유예 선언.', tags: ['경계','불안↓'], reason: '질투×읽씹' });
  }
  // 직장: 상사 칭찬 + 프로젝트(파일/동기화) 문제 → 승리 재현 + 리스크 관리
  if (hasSymbol(qa, 'boss_praise') && (hasSymbol(qa, 'cloud_sync_lost') || hasSymbol(qa, 'file_deleted'))) {
    out.push({ key: 'plan_work_risk_10', title: '리스크 체크 10분', duration: 10, script: '핵심 산출물 백업/버전 규칙 1개 정의.', tags: ['리스크','품질'], reason: '인정×산출물 리스크' });
  }
  // 건강: 발열/기침 + 격리 → 회복 계획
  if ((hasSymbol(qa, 'fever') || hasSymbol(qa, 'cough')) && hasSymbol(qa, 'quarantine')) {
    out.push({ key: 'plan_health_plan_10', title: '회복 계획 10분', duration: 10, script: '증상/기간/강도 기록 → 회복 루틴(수분/수면/가벼운 움직임) 설정.', tags: ['회복','계획'], reason: '증상×격리' });
  }
  // 디지털: 스팸 DM + 알림 폭주 → 필터/차단 세팅
  if (hasSymbol(qa, 'spam_dm') && hasSymbol(qa, 'notifications_overflow')) {
    out.push({ key: 'plan_noise_filter_10', title: '필터/차단 10분', duration: 10, script: '스팸 발신 차단/신고, 키워드 필터 활성화, 알림 범위 축소.', tags: ['노이즈↓','경계'], reason: '스팸×알림' });
  }
  // 디지털: 화면 깨짐 + 두통 → 스크린타임 절감
  if (hasSymbol(qa, 'screen_cracked') && hasSymbol(qa, 'headache')) {
    out.push({ key: 'plan_screen_break_15', title: '스크린타임 절감', duration: 15, script: '15분 오프스크린(눈 휴식/산책) + 수리/교체 일정 확인.', tags: ['휴식','품질'], reason: '화면 손상×두통' });
  }

  // 배치 4 — 추가 5개 내외
  // 관계: 읽씹 + 불안 → 주의 전환
  if (hasSymbol(qa, 'left_on_read') && hasEmotion(qa, 'emo_anxiety')) {
    out.push({ key: 'plan_focus_shift_10', title: '주의 전환 10분', duration: 10, script: '답장 집착을 내려놓고 나의 최우선 과제 1개에 10분 집중.', tags: ['집중','불안↓'], reason: '읽씹×불안' });
  }
  // 건강: 수술 + 두려움 → 2nd 의견 + 체크리스트
  if (hasSymbol(qa, 'surgery') && hasEmotion(qa, 'emo_fear')) {
    out.push({ key: 'plan_surgery_prep_10', title: '수술 준비 10분', duration: 10, script: '의견 2nd 후보 1명 찾기 + 준비/회복 체크리스트 초안.', tags: ['치유','준비'], reason: '수술×두려움' });
  }
  // 디지털: 저장공간 부족 + 동기화 끊김 → 공간 정리
  if (hasSymbol(qa, 'storage_full') && hasSymbol(qa, 'cloud_sync_lost')) {
    out.push({ key: 'plan_storage_clean_15', title: '공간 정리 15분', duration: 15, script: '큰 파일 3개 삭제/이동, 불필요 앱/캐시 정리.', tags: ['정리','용량'], reason: '용량 부족×동기화' });
  }
  // 건강/디지털: 두통 + 화상통화 끊김 → 아젠다 우선/품질 점검
  if (hasSymbol(qa, 'headache') && hasSymbol(qa, 'video_call_lag')) {
    out.push({ key: 'plan_call_quality_10', title: '품질/아젠다 10분', duration: 10, script: '핵심 아젠다부터 진행, 대역폭/장비 점검, 대안 채널 준비.', tags: ['소통','품질'], reason: '두통×화상 지연' });
  }
  // 여행/문서: 여권 분실 + 알람 미스 → 체크리스트/리마인더
  if (hasSymbol(qa, 'passport_lost') && hasSymbol(qa, 'alarm_missed')) {
    out.push({ key: 'plan_travel_check_10', title: '여행 체크 10분', duration: 10, script: '문서/시간 체크리스트 작성, 알람/리마인더 이중화.', tags: ['여행','준비'], reason: '여권×알람 미스' });
  }

  // 배치 5 — 추가 5개 내외
  // 일상: 문 잠김 × 열쇠 분실 → 대안 접근/도움 요청
  if (hasSymbol(qa, 'door_locked') && hasSymbol(qa, 'key_lost')) {
    out.push({ key: 'plan_access_alt_10', title: '대안 접근 10분', duration: 10, script: '대안 문/연락처 1개 준비, 보관 장소 재설계.', tags: ['접근','안전'], reason: '문 잠김×열쇠 분실' });
  }
  // 일상/재정: 지갑 분실 × 폰 방전 → 비상 결제/연락 설계
  if (hasSymbol(qa, 'wallet_lost') && hasSymbol(qa, 'phone_dead')) {
    out.push({ key: 'plan_emergency_pay_10', title: '비상 결제/연락', duration: 10, script: '현금 소액/대체 결제 수단 준비, 비상 연락처 메모.', tags: ['비상','재정'], reason: '지갑×폰 방전' });
  }
  // 프라이버시: 창문 깨짐 × 질투 → 공유 범위 재설정
  if (hasSymbol(qa, 'window_broken') && hasSymbol(qa, 'jealousy_scene')) {
    out.push({ key: 'plan_privacy_10', title: '공유 범위 10분', duration: 10, script: 'SNS/메신저 공개 범위 점검, 민감 정보 비공개 전환.', tags: ['프라이버시','경계'], reason: '창문×질투' });
  }
  // 버전 관리: 저장공간 부족 × 파일 삭제 → 버전 정책 수립
  if (hasSymbol(qa, 'storage_full') && hasSymbol(qa, 'file_deleted')) {
    out.push({ key: 'plan_versioning_10', title: '버전 정책 10분', duration: 10, script: '작업 파일 버전 규칙(날짜/번호) 정하고 적용.', tags: ['품질','버전'], reason: '용량×삭제' });
  }
  // 관계/직장: 화해 × 상사 칭찬 → 작은 승리 공유
  if (hasSymbol(qa, 'partner_reconcile') && hasSymbol(qa, 'boss_praise')) {
    out.push({ key: 'plan_share_win_5', title: '승리 공유 5분', duration: 5, script: '파트너/동료에게 작은 승리 1개를 감사와 함께 공유.', tags: ['인정','연대'], reason: '화해×인정' });
  }

  // 배치 6 — 최종 보강 4개 내외
  // 자연: 폭우 × 천둥/번개 → 정보 디톡스
  if (hasSymbol(qa, 'heavy_rain') && hasSymbol(qa, 'thunder_lightning')) {
    out.push({ key: 'plan_info_detox_10', title: '정보 디톡스 10분', duration: 10, script: '알림/뉴스/피드 중단 → 핵심 3줄 요약만 남기기.', tags: ['노이즈↓','정리'], reason: '폭우×번개' });
  }
  // 관계/프라이버시: 읽씹 × 창문 깨짐 → 공개 범위 점검
  if (hasSymbol(qa, 'left_on_read') && hasSymbol(qa, 'window_broken')) {
    out.push({ key: 'plan_sharing_scope_10', title: '공유 범위 점검', duration: 10, script: '상대/채널별 공개 범위를 2단계로 줄이고 예외를 지정.', tags: ['프라이버시','경계'], reason: '읽씹×창문' });
  }
  // 디지털 보안: 비번 잊음 × 계정 해킹 → 즉시 보호
  if (hasSymbol(qa, 'password_forgot') && hasSymbol(qa, 'account_hacked')) {
    out.push({ key: 'plan_immediate_protect_10', title: '즉시 보호 10분', duration: 10, script: '침해 계정 비번 변경 → 세션 종료 → 2FA → 의심 앱 점검.', tags: ['보안','침해'], reason: '비번×해킹' });
  }
  // 직장: 동료 갈등 × 알림 폭주 → 소통 창구 단일화
  if (hasSymbol(qa, 'coworker_conflict') && hasSymbol(qa, 'notifications_overflow')) {
    out.push({ key: 'plan_channel_single_10', title: '창구 단일화 10분', duration: 10, script: '팀 소통 채널 1개 합의, 알림 규칙 3줄 작성.', tags: ['소통','집중'], reason: '갈등×알림' });
  }

  // 기본 안전망: 아무 규칙도 없으면 일반 코칭 1~2개
  if (out.length === 0) {
    out.push({ key: 'plan_generic_10', title: '10분 감정 라벨링', duration: 10, script: '오늘 꿈에서 가장 강했던 감정 2개를 단어로 쓰고, 그 장면을 3문장으로 묘사.' });
    out.push({ key: 'plan_generic_25', title: '25분 집중 세션', duration: 25, script: '가장 작은 과제 1개를 골라 25분 타이머로 실행.' });
  }

  // 우선순위 스코어링: 안전/회복/보안/집중/경계 태그 가중치, 짧은 코스 약간 가산
  const emoSet = new Set(qa.cues.emotions.map(e => e.key));
  const colSet = new Set(qa.cues.colors.map(c => c.key));

  function scoreItem(it: { duration: number; tags?: string[] }): number {
    const t = (it.tags || []).join(' ').toLowerCase();
    const hit = (k: string) => t.includes(k);
    let s = 0;
    if (hit('불안')) s += 3;
    if (hit('회복')) s += 2;
    if (hit('보안') || hit('2fa')) s += 2;
    if (hit('집중') || hit('노이즈')) s += 1.5;
    if (hit('경계') || hit('프라이버시')) s += 1.5;
    if (hit('리스크')) s += 1.0;
    if (hit('여행') || hit('준비')) s += 0.8;
    // Emotion cues weighting
    if (emoSet.has('emo_anxiety')) s += 1.5;
    if (emoSet.has('emo_fear')) s += 1.3;
    if (emoSet.has('emo_sadness')) s += 1.0;
    // Color cues weighting
    if (colSet.has('color_black')) s += 1.0;    // 심도/두려움
    if (colSet.has('color_red')) s += 0.6;      // 경고/충동
    if (colSet.has('color_yellow')) s += 0.4;   // 주의/점검
    if (colSet.has('color_green')) s += 0.3;    // 회복/안정 (약한 보정)
    // shorter tasks first (slight boost)
    s += Math.max(0, 15 - Math.min(30, it.duration)) * 0.05; // up to +0.75 for 0~15분
    return s;
  }
  const sorted = out.sort((a,b)=> scoreItem(b) - scoreItem(a));
  return sorted.slice(0, 8);
}

// ── XAI: 근거/확신도/대안 ─────────────────────────────
export function buildEvidence(text: string, qa: QuickAnalysis): { matchedSymbols: string[]; rules: string[]; confidence: number; alternatives: string[] } {
  const rules: string[] = [];
  if (qa.symbolKeys.includes('teeth') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) rules.push('치아×불안 → 발화/자기이미지');
  if (qa.symbolKeys.includes('falling') && qa.cues.colors.some(c=>c.key==='color_black')) rules.push('추락×검정 → 급락 공포/통제 저하');
  if (qa.symbolKeys.includes('exam') && qa.symbolKeys.includes('cannot_speak')) rules.push('시험×발화불능 → 평가/표현 스트레스');
  if (qa.symbolKeys.includes('chase') && qa.symbolKeys.includes('hiding')) rules.push('추격×숨기 → 회피 인식');
  if (qa.symbolKeys.includes('partner_argument') && qa.symbolKeys.includes('jealousy_scene')) rules.push('연인 다툼×질투 → 욕구 불일치/XAI: I-메시지');
  if (qa.symbolKeys.includes('ring_lost') && qa.symbolKeys.includes('wedding_canceled')) rules.push('반지×식 취소 → 약속/가치 재검토');
  if (qa.symbolKeys.includes('boss_criticism') && qa.symbolKeys.includes('coworker_conflict')) rules.push('상사 질책×동료 갈등 → 피드백/협업 규칙');
  if (qa.symbolKeys.includes('medical_checkup') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) rules.push('검진×불안 → 질문/대기 루틴');
  if (qa.symbolKeys.includes('login_failed') && qa.symbolKeys.includes('password_forgot')) rules.push('로그인 실패×비번 잊음 → 비번/백업/2FA');
  if (qa.symbolKeys.includes('cloud_sync_lost') && qa.symbolKeys.includes('file_deleted')) rules.push('동기화 끊김×파일 삭제 → 백업/복구');
  if (qa.symbolKeys.includes('friend_betrayal') && qa.cues.emotions.some(e=>e.key==='emo_sadness')) rules.push('배신×슬픔 → 관계 지도');
  if (qa.symbolKeys.includes('jealousy_scene') && qa.symbolKeys.includes('left_on_read')) rules.push('질투×읽씹 → 경계 회복');
  if ((qa.symbolKeys.includes('fever') || qa.symbolKeys.includes('cough')) && qa.symbolKeys.includes('quarantine')) rules.push('증상×격리 → 회복 계획');
  if (qa.symbolKeys.includes('spam_dm') && qa.symbolKeys.includes('notifications_overflow')) rules.push('스팸×알림 → 필터/차단');
  if (qa.symbolKeys.includes('screen_cracked') && qa.symbolKeys.includes('headache')) rules.push('화면 손상×두통 → 스크린타임 절감');
  if (qa.symbolKeys.includes('left_on_read') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) rules.push('읽씹×불안 → 주의 전환');
  if (qa.symbolKeys.includes('surgery') && qa.cues.emotions.some(e=>e.key==='emo_fear')) rules.push('수술×두려움 → 준비/2nd 의견');
  if (qa.symbolKeys.includes('storage_full') && qa.symbolKeys.includes('cloud_sync_lost')) rules.push('용량 부족×동기화 → 공간 정리');
  if (qa.symbolKeys.includes('video_call_lag') && qa.symbolKeys.includes('headache')) rules.push('화상 지연×두통 → 품질/아젠다');
  if (qa.symbolKeys.includes('passport_lost') && qa.symbolKeys.includes('alarm_missed')) rules.push('여권×알람 미스 → 체크/리마인더');
  if (qa.symbolKeys.includes('door_locked') && qa.symbolKeys.includes('key_lost')) rules.push('문 잠김×열쇠 분실 → 대안 접근');
  if (qa.symbolKeys.includes('wallet_lost') && qa.symbolKeys.includes('phone_dead')) rules.push('지갑×폰 방전 → 비상 결제/연락');
  if (qa.symbolKeys.includes('window_broken') && qa.symbolKeys.includes('jealousy_scene')) rules.push('창문×질투 → 공유 범위 재설정');
  if (qa.symbolKeys.includes('storage_full') && qa.symbolKeys.includes('file_deleted')) rules.push('용량×삭제 → 버전 정책');
  if (qa.symbolKeys.includes('partner_reconcile') && qa.symbolKeys.includes('boss_praise')) rules.push('화해×인정 → 승리 공유');

  const symN = qa.symbolKeys.length;
  const cueN = qa.cues.emotions.length + qa.cues.colors.length;
  const confidence = Math.max(0.2, Math.min(1, 0.15*symN + 0.1*cueN + Math.min(0.3, 0.08*rules.length)));

  // 대안: 심볼이 적으면 공통 고빈도 상징 제안(간단)
  const alternatives: string[] = [];
  if (symN <= 1) alternatives.push('집/방', '물/바다', '길 잃음');

  return { matchedSymbols: qa.symbolKeys, rules, confidence: Math.round(confidence*100)/100, alternatives };
}

// ── 심볼 제안: 사전 매칭 보강(내성 매칭 결과 - 기존 심볼 제외) ──────────
export function buildSuggestions(text: string, qa: QuickAnalysis): Array<{ key: string; label: string; reason: string }> {
  const out: Array<{ key: string; label: string; reason: string }> = [];
  try {
    const all = (DICT as any).matchAliasKeys ? (DICT as any).matchAliasKeys(text) as string[] : [];
    const candidates = (all || []).filter((k) => !qa.symbolKeys.includes(k));
    const merged = DICT.getMergedSymbols();
    for (const k of candidates.slice(0, 5)) {
      const label = merged[k]?.label || k;
      out.push({ key: k, label, reason: "텍스트 유사/내성 매칭" });
    }
  } catch {}
  return out;
}

// ── 스모크 테스트 (ts-node로 직접 실행 시에만) ──
declare const require: any | undefined;
declare const module: any | undefined;

// ── 서버 별칭 로더 (SSR/CLI 전용, 60초 캐시) ─────────────────────
let serverAliasesLoadedAt = 0;
let serverAliasesTTL = 60_000; // 60s
async function maybeLoadServerAliases() {
  try {
    // 클라이언트에서는 수행하지 않음
    if (typeof window !== 'undefined') return;
    const now = Date.now();
    if (now - serverAliasesLoadedAt < serverAliasesTTL) return;
    const sb = getServiceSupabase();
    if (!sb) { serverAliasesLoadedAt = now; return; }
    const { data, error } = await sb.from('admin_aliases').select('*').limit(5000);
    if (error) { serverAliasesLoadedAt = now; return; }
    const map: Record<string, string[]> = {};
    for (const row of (data || []) as Array<any>) {
      const k = String(row?.sym_key || '').trim();
      const a = String(row?.alias || '').trim();
      if (!k || !a) continue;
      if (!map[k]) map[k] = [];
      if (!map[k].includes(a)) map[k].push(a);
    }
    DICT.setServerAliases(map);
    serverAliasesLoadedAt = now;
  } catch {
    // swallow
  }
}

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const argv: string[] = process.argv.slice(2);
  const wantJson = argv.includes("--json");
  const text = argv.filter((a) => a !== "--json").join(" ").trim();

  if (text) {
    const result = analyzeDream(text);
    if (wantJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.dir(result, { depth: null });
    }
    process.exit(0);
  }

  // No args provided: run samples as a smoke test
  const samples = [
    "대통령이랑밥먹는데 노란불켜지고 하늘로 날라갔어",
    "밤에 조상님 나타나셔서 밥 먹으라 하심",
    "검은밤 높은 건물에서 떨어졌고 이가 부서졌음 파란바다 멀리 보였음 우울했음",
    "시험장 갔는데 준비 안 돼 말이 안나옴 그래서 집으로 달려감",
    "빨간불이 깜빡였고 초록 불로 바뀐 뒤에 길 건넜어",
    "노란불/노랑불/노란불빛/노란빛/노오란불 켜짐"
  ];
  console.log("[analyze.ts] CLI samples (pass text or --json to parse input)\n");
  for (const s of samples) {
    const r = analyzeDream(s);
    console.log("====== 입력 ======");
    console.log(s);
    console.log("====== 결과 ======");
    console.dir(r, { depth: null });
    console.log("\n");
  }
}
