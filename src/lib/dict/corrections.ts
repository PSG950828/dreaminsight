// DreamInsight 오타/정규화/감정 보정 모듈
// - 텍스트 전처리 파이프라인을 단일 경로로 유지하기 위해 사용합니다.

export const KOR_CORRECTIONS: Array<[RegExp, string | ((match: string) => string)]> = [
  // 1) '했' 관련 흔한 오타
  [new RegExp(String.raw`(?<!\p{L})햇어요(?!\p{L})`, "gu"), "했어요"],
  [new RegExp(String.raw`(?<!\p{L})햇어(?!\p{L})`, "gu"), "했어"],
  [new RegExp(String.raw`(?<!\p{L})햇다(?!\p{L})`, "gu"), "했다"],
  [new RegExp(String.raw`(?<!\p{L})햇는데(?!\p{L})`, "gu"), "했는데"],
  [new RegExp(String.raw`(?<!\p{L})햇네(?!\p{L})`, "gu"), "했네"],

  // 2) '봤' 관련
  [new RegExp(String.raw`(?<!\p{L})봣어요(?!\p{L})`, "gu"), "봤어요"],
  [new RegExp(String.raw`(?<!\p{L})봣어(?!\p{L})`, "gu"), "봤어"],
  [new RegExp(String.raw`(?<!\p{L})봣다(?!\p{L})`, "gu"), "봤다"],

  // 3) 색/불(등) 관련 오타
  [new RegExp(String.raw`(?<!\p{L})빨간뷸(?!\p{L})`, "gu"), "빨간불"],
  [new RegExp(String.raw`(?<!\p{L})파란뷸(?!\p{L})`, "gu"), "파란불"],
  [new RegExp(String.raw`(?<!\p{L})초록뷸(?!\p{L})`, "gu"), "초록불"],
  [new RegExp(String.raw`(?<!\p{L})빨강불(?!\p{L})`, "gu"), "빨간불"],
  [new RegExp(String.raw`(?<!\p{L})파랑불(?!\p{L})`, "gu"), "파란불"],

  // 4) '보였어요' 관련 격자 오타
  [new RegExp(String.raw`(?<!\p{L})보였서요(?!\p{L})`, "gu"), "보였어요"],

  // 5) 구어체/오타 → 표준 동사(먹다)
  [new RegExp(String.raw`(?<!\p{L})머그래(?!\p{L})`, "gu"), "먹으래"],
  [new RegExp(String.raw`(?<!\p{L})머거라(?!\p{L})`, "gu"), "먹어라"],
  [new RegExp(String.raw`(?<!\p{L})머그라(?!\p{L})`, "gu"), "먹으라"],
  [new RegExp(String.raw`(?<!\p{L})머겁시다(?!\p{L})`, "gu"), "먹읍시다"],

  // 6) 영어 표현 → 한국어 핵심 토큰
  [new RegExp(String.raw`\bred\s*light\b`, "giu"), "빨간불"],
  [new RegExp(String.raw`\bblue\s*light\b`, "giu"), "파란불"],
  [new RegExp(String.raw`\bgreen\s*light\b`, "giu"), "초록불"],
  [new RegExp(String.raw`\byellow\s*light\b`, "giu"), "노란불"],
  [new RegExp(String.raw`\bwhite\s*light\b`, "giu"), "하얀빛"],
  [new RegExp(String.raw`\borange\s*light\b`, "giu"), "주황불"],
  [new RegExp(String.raw`\bpurple\s*light\b`, "giu"), "보랏빛"],
  [new RegExp(String.raw`\bpink\s*light\b`, "giu"), "핑크빛"],
  [new RegExp(String.raw`\bgray\s*light\b`, "giu"), "회색빛"],
  [new RegExp(String.raw`\bgrey\s*light\b`, "giu"), "회색빛"],

  // 7) '날아' vs 구어 '날라'
  [new RegExp(String.raw`(?<!\p{L})날라갔어요(?!\p{L})`, "gu"), "날아갔어요"],
  [new RegExp(String.raw`(?<!\p{L})날라갔다(?!\p{L})`, "gu"), "날아갔다"],
  [new RegExp(String.raw`(?<!\p{L})날라가다(?!\p{L})`, "gu"), "날아가다"],
  [new RegExp(String.raw`(?<!\p{L})날라감(?!\p{L})`, "gu"), "날아감"],
  [new RegExp(String.raw`(?<!\p{L})노랑불(?!\p{L})`, "gu"), "노란불"],

  // 8) 한국어 색 + 라이트 → 색빛/색불
  [new RegExp(String.raw`보라\s*라이트`, "giu"), "보랏빛"],
  [new RegExp(String.raw`자주(색)?\s*라이트`, "giu"), "보랏빛"],
  [new RegExp(String.raw`빨간\s*라이트`, "giu"), "빨간불"],
  [new RegExp(String.raw`파란\s*라이트`, "giu"), "파란불"],
  [new RegExp(String.raw`초록\s*라이트`, "giu"), "초록불"],
  [new RegExp(String.raw`하얀\s*라이트|흰\s*라이트`, "giu"), "하얀빛"],

  // 9) 웃음 축약어/의성어 → 표준 토큰
  [new RegExp(String.raw`하하+`, "giu"), "웃다"],
  [new RegExp(String.raw`헤헤+`, "giu"), "웃다"],
  [new RegExp(String.raw`ㅎㅎ+`, "giu"), "웃다"],
  [new RegExp(String.raw`ㅋㅋ+`, "giu"), "웃다"],
  [new RegExp(String.raw`웃었?어(요)?`, "giu"), "웃다"],
  [new RegExp(String.raw`웃으며`, "giu"), "웃다"],

  // 10) 러닝/달렸어 → 달리기 정규화
  [new RegExp(String.raw`러?런닝`, "giu"), "달리기"],
  [new RegExp(String.raw`러닝`, "giu"), "달리기"],
  [new RegExp(String.raw`달렸?(다|어|어요)?`, "giu"), "달리기"],
  [new RegExp(String.raw`달리며`, "giu"), "달리기"],

  // 11) 붙여쓰기/띄어쓰기 교정 — 교통/문서/디지털 핵심
  [new RegExp(String.raw`지\s*하\s*철`, "giu"), "지하철"],
  [new RegExp(String.raw`전\s*철`, "giu"), "전철"],
  [new RegExp(String.raw`환\s*승\s*역`, "giu"), "환승역"],
  [new RegExp(String.raw`버\s*스\s*정\s*류\s*장`, "giu"), "버스정류장"],
  [new RegExp(String.raw`톨\s*게\s*이\s*트`, "giu"), "톨게이트"],
  [new RegExp(String.raw`인\s*터\s*체\s*인\s*지`, "giu"), "인터체인지"],
  [new RegExp(String.raw`분\s*기\s*점`, "giu"), "분기점"],
  [new RegExp(String.raw`여\s*권`, "giu"), "여권"],
  [new RegExp(String.raw`탑\s*승\s*권`, "giu"), "탑승권"],
  [new RegExp(String.raw`주\s*민\s*등\s*록\s*증`, "giu"), "주민등록증"],
  [new RegExp(String.raw`운\s*전\s*면\s*허`, "giu"), "운전면허"],
  [new RegExp(String.raw`동\s*기\s*화`, "giu"), "동기화"],
  [new RegExp(String.raw`저\s*장\s*공\s*간`, "giu"), "저장공간"],
  [new RegExp(String.raw`화\s*상\s*통\s*화`, "giu"), "화상통화"],
  [new RegExp(String.raw`법\s*당`, "giu"), "법당"],
  [new RegExp(String.raw`십\s*자\s*가`, "giu"), "십자가"],

  // 12) 구어/약칭 → 표준 토큰
  [new RegExp(String.raw`엘\s*베`, "giu"), "엘리베이터"],
  [new RegExp(String.raw`줌\b`, "giu"), "화상통화"],
  [new RegExp(String.raw`teams|팀즈`, "giu"), "화상통화"],
  [new RegExp(String.raw`카\s*톡|카카오\s*톡`, "giu"), "카톡"],
  [new RegExp(String.raw`교\s*무\s*실`, "giu"), "교무실"],
  [new RegExp(String.raw`수\s*행\s*평\s*가`, "giu"), "수행평가"],
  [new RegExp(String.raw`모\s*의\s*고\s*사`, "giu"), "모의고사"],
  [new RegExp(String.raw`주\s*일\s*예\s*배`, "giu"), "주일예배"],
  [new RegExp(String.raw`레\s*포\s*트|리\s*포\s*트`, "giu"), (m: string) => (m.replace(/\s+/g, "").startsWith("레포트") ? "레포트" : "리포트")],
];

export const EMOTION_CORRECTIONS: Array<[RegExp, string]> = [
  // ── 슬픔/우울 계열 → "우울"
  [new RegExp(String.raw`(?<!\p{L})울적(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})침울(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})멜랑콜리(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})멜랑꼴리(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})다운됨?(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`기분\s*이?\s*다운`, "giu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})슬펐?다?(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`\bdepress(ed|ing)?\b`, "giu"), "우울"],
  [new RegExp(String.raw`\bsad(ness)?\b`, "giu"), "우울"],
  [new RegExp(String.raw`feeling\s*blue`, "giu"), "우울"],

  // ── 불안/초조 계열 → "불안"
  [new RegExp(String.raw`(?<!\p{L})초조(?!\p{L})`, "gu"), "불안"],
  [new RegExp(String.raw`(?<!\p{L})조급(?!\p{L})`, "gu"), "불안"],
  [new RegExp(String.raw`(?<!\p{L})걱정(?!\p{L})`, "gu"), "불안"],
  [new RegExp(String.raw`(?<!\p{L})근심(?!\p{L})`, "gu"), "불안"],
  [new RegExp(String.raw`(?<!\p{L})긴장(?!\p{L})`, "gu"), "불안"],
  [new RegExp(String.raw`\banxious(ness)?\b`, "giu"), "불안"],
  [new RegExp(String.raw`\bnervous(ness)?\b`, "giu"), "불안"],
  [new RegExp(String.raw`\banxiety\b`, "giu"), "불안"],

  // ── 두려움/공포 계열 → "두려움"
  [new RegExp(String.raw`(?<!\p{L})무서웠?다?(?!\p{L})`, "gu"), "두려움"],
  [new RegExp(String.raw`(?<!\p{L})겁났?다?(?!\p{L})`, "gu"), "두려움"],
  [new RegExp(String.raw`(?<!\p{L})두려웠?다?(?!\p{L})`, "gu"), "두려움"],
  [new RegExp(String.raw`(?<!\p{L})공포\s*스?러웠?다?(?!\p{L})`, "gu"), "두려움"],
  [new RegExp(String.raw`\bscared\b`, "giu"), "두려움"],
  [new RegExp(String.raw`\bafraid\b`, "giu"), "두려움"],
  [new RegExp(String.raw`\bterrified\b`, "giu"), "두려움"],
  [new RegExp(String.raw`\bfear\b`, "giu"), "두려움"],

  // ── 분노/짜증 계열 → "분노"
  [new RegExp(String.raw`(?<!\p{L})화났?다?(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`(?<!\p{L})짜증(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`(?<!\p{L})열받(았|았어|았어요|음)?(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`(?<!\p{L})빡쳤?다?(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`(?<!\p{L})성났?다?(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`\bangry\b`, "giu"), "분노"],
  [new RegExp(String.raw`\bfurious\b`, "giu"), "분노"],
  [new RegExp(String.raw`\bmad\b`, "giu"), "분노"],

  // ── 기쁨/행복/설렘 계열 → "기쁨"
  [new RegExp(String.raw`(?<!\p{L})행복했?다?(?!\p{L})`, "gu"), "기쁨"],
  [new RegExp(String.raw`(?<!\p{L})즐거웠?다?(?!\p{L})`, "gu"), "기쁨"],
  [new RegExp(String.raw`(?<!\p{L})신났?다?(?!\p{L})`, "gu"), "기쁨"],
  [new RegExp(String.raw`(?<!\p{L})기뻤?다?(?!\p{L})`, "gu"), "기쁨"],
  [new RegExp(String.raw`(?<!\p{L})설렜?다?(?!\p{L})`, "gu"), "기쁨"],
  [new RegExp(String.raw`\bhappy\b`, "giu"), "기쁨"],
  [new RegExp(String.raw`\bjoy(ful|)\b`, "giu"), "기쁨"],
  [new RegExp(String.raw`\bdelight(ed|ful)?\b`, "giu"), "기쁨"],
  [new RegExp(String.raw`\bexcited\b`, "giu"), "기쁨"],

  // ── 평온/차분/안정 계열 → "차분"
  [new RegExp(String.raw`(?<!\p{L})편안(?!\p{L})`, "gu"), "차분"],
  [new RegExp(String.raw`(?<!\p{L})평온(?!\p{L})`, "gu"), "차분"],
  [new RegExp(String.raw`(?<!\p{L})차분(?!\p{L})`, "gu"), "차분"],
  [new RegExp(String.raw`(?<!\p{L})안정감(?!\p{L})`, "gu"), "차분"],
  [new RegExp(String.raw`\bcalm\b`, "giu"), "차분"],
  [new RegExp(String.raw`\bpeaceful\b`, "giu"), "차분"],
  [new RegExp(String.raw`\bserene\b`, "giu"), "차분"],

  // ── 후련/안도/안심 계열 → "안도"
  [new RegExp(String.raw`(?<!\p{L})후련(?!\p{L})`, "gu"), "안도"],
  [new RegExp(String.raw`(?<!\p{L})안도(?!\p{L})`, "gu"), "안도"],
  [new RegExp(String.raw`(?<!\p{L})안심(?!\p{L})`, "gu"), "안도"],
  [new RegExp(String.raw`\breliev(ed|ing)?\b`, "giu"), "안도"],

  // ── 수치/부끄/민망 계열 → "수치"
  [new RegExp(String.raw`(?<!\p{L})부끄(럽|러웠?다?)?`, "gu"), "수치"],
  [new RegExp(String.raw`(?<!\p{L})민망(했?다?)?`, "gu"), "수치"],
  [new RegExp(String.raw`(?<!\p{L})창피(했?다?)?`, "gu"), "수치"],
  [new RegExp(String.raw`(?<!\p{L})쪽팔(림|렸?다?)?`, "gu"), "수치"],
  [new RegExp(String.raw`\bashamed\b`, "giu"), "수치"],
  [new RegExp(String.raw`\bembarrass(ed|ing)?\b`, "giu"), "수치"],

  // ── 죄책/미안 계열 → "죄책감"
  [new RegExp(String.raw`(?<!\p{L})죄책(감)?(?!\p{L})`, "gu"), "죄책감"],
  [new RegExp(String.raw`(?<!\p{L})양심\s*찔림(?!\p{L})`, "gu"), "죄책감"],
  [new RegExp(String.raw`(?<!\p{L}) 미안(함|해서|했어|했어요)?(?!\p{L})`, "gu"), "죄책감"],
  [new RegExp(String.raw`\bguilt(y|)\b`, "giu"), "죄책감"],

  // ── 외로움/고독/쓸쓸 → "우울"
  [new RegExp(String.raw`(?<!\p{L})외로움?(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})고독(했?다?)?`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})쓸쓸(했?다?)?`, "gu"), "우울"],
  [new RegExp(String.raw`\blonely\b`, "giu"), "우울"],

  // ── 인터넷/속어 → 감정 정규화
  [new RegExp(String.raw`(?<!\p{L})빡치(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`(?<!\p{L})개무섭(?!\p{L})`, "gu"), "두려움"],
  [new RegExp(String.raw`(?<!\p{L})쫄렸?(?!\p{L})`, "gu"), "두려움"],
  [new RegExp(String.raw`(?<!\p{L})개짜증(?!\p{L})`, "gu"), "분노"],
  [new RegExp(String.raw`(?<!\p{L})현타(왔|옴)?(?!\p{L})`, "gu"), "우울"],
  [new RegExp(String.raw`(?<!\p{L})행복(했?다?)?`, "gu"), "기쁨"],
];

/**
 * 문자열 정규화 (NFKC + 소문자 + 공백 정리)
 */
export function normalizeText(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC").toLowerCase();
  s = s.replace(/\r\n?/g, "\n"); // 개행 통일
  s = s.replace(/\t/g, " ");      // 탭 → 공백
  s = s.replace(/\u00a0/g, " ");  // non-breaking space
  s = s.replace(/[^\S\n]+/g, " "); // 개행 제외 연속 공백 압축
  s = s.replace(/\s{2,}/g, " ");   // 이중 공백 축소
  return s.trim();
}

/** 감정 표현 보정 */
export function applyEmotionCorrections(normalizedLower: string): string {
  let out = normalizedLower || "";
  for (const [re, rep] of EMOTION_CORRECTIONS) {
    out = out.replace(re, rep);
  }
  return out;
}

/** 한글/영문 오타 보정 */
export function applyCorrections(normalizedLower: string): string {
  let out = normalizedLower || "";
  for (const [re, rep] of KOR_CORRECTIONS) {
    out = out.replace(re, (...args) =>
      typeof rep === "function" ? (rep as (match: string) => string)(args[0] ?? "") : (rep as string)
    );
  }
  out = applyEmotionCorrections(out);
  return out;
}

/** 최종 텍스트 전처리 (normalize → corrections) */
export function preprocessDreamText(text: string): string {
  const normalized = normalizeText(text);
  return applyCorrections(normalized);
}
