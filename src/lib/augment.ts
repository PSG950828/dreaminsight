// 👉 This module is the post-processor (augment) for the base analyzer. We'll rename this file to `augment.ts`.

// ── 추가 패턴 증강 (색/행동) : 기존 엔진 결과를 후처리로 보강 ──

// 안전 가드: analyzeDream, 타입 등이 위에 이미 정의되어 있다는 전제
// (ts-node --transpile-only 로 실행하므로 타입 경고는 무시 가능)

export type ColorCue = { key: string; label: string; tags: string[] };

export type AnalyzeResultLike = {
  input: { raw: string; preprocessed: string };
  symbols: Array<{ key: string; label: string; tags: string[]; meaning: string; advice?: string }>;
  cues: { colors: ColorCue[]; emotions?: Array<{ key: string; label: string; tags: string[] }>; actions?: string[] };
  advice: string[];
  prompts: string[];
};

function ensureUnique<T extends { key?: string }>(arr: T[], toAdd: T, keyField: keyof T = "key"): T[] {
  const keyVal = (toAdd as any)[keyField];
  if (keyVal == null) return arr;
  if (arr.some((x) => (x as any)[keyField] === keyVal)) return arr;
  return [...arr, toAdd];
}

function containsAny(text: string, patterns: (string|RegExp)[]): boolean {
  for (const p of patterns) {
    if (p instanceof RegExp) { if (p.test(text)) return true; }
    else { if (text.includes(p)) return true; }
  }
  return false;
}

// 공백/붙여쓰기 모두 허용하는 한글 변형 정규식 생성
function kflex(word: string): RegExp {
  // 예: "보라 불빛" -> /보라\s*불빛/
  const flexible = word.replace(/\s+/g, "\\s*");
  return new RegExp(flexible, "u");
}

// 후처리 증강: 보라 계열 색상 + 웃음/달리기 행동
export function augmentResult(res: AnalyzeResultLike): AnalyzeResultLike {
  const text = (res?.input?.preprocessed || res?.input?.raw || "").toLowerCase();

  // 1) 보라/자주/퍼플/바이올렛 계열 색상 감지
  const purpleHits = [
    "보라", "보라색", "보랏빛", "보라빛", "보라 불", "보라불", "보라 불빛", "보라불빛",
    "자주", "자주색", "자줏빛", "자주빛", "자색",
    "퍼플", "바이올렛", "라일락", "보라 라이트", "보라등", "자주등"
  ];
  const purpleRegexes = [
    kflex("보라 불"), kflex("보라 불빛"), kflex("보라 빛"), kflex("자주 빛"), kflex("자주 불빛")
  ];

  const hasPurple = containsAny(text, [...purpleHits, ...purpleRegexes]);
  if (hasPurple) {
    const cue: ColorCue = { key: "color_purple", label: "보라색", tags: ["영감", "직관", "신비"] };
    const colors = res.cues?.colors ?? [];
    res.cues = { ...res.cues, colors: ensureUnique(colors, cue) };

    // 사전에 심볼이 없을 가능성이 높으므로, 조언만 보강
    const extraAdvice = "보라색 신호: 조용한 몰입 10분(메모/스케치)으로 떠오른 영감을 포착하세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 2) 웃음(긍정) & 달리기(추진) 행동 단서 감지
  const laughHits = ["웃", "ㅎㅎ", "ㅋㅋ", "하하", "헤헷", "미소", "싱긋"]; // 포함 검사
  const runHits = ["달리", "질주", "전력질주", "뛰", "러닝"]; // 포함 검사

  const laughed = containsAny(text, laughHits);
  const ran = containsAny(text, runHits);

  if (laughed || ran) {
    const actions = new Set([...(res.cues?.actions ?? [])]);
    if (laughed) actions.add("laugh");
    if (ran) actions.add("run");
    res.cues = { ...res.cues, actions: Array.from(actions) };
  }

  if (laughed) {
    const a = "긍정 에너지 포착: 오늘 감사 문장 1개를 기록해 정서 버퍼를 키우세요.";
    if (!res.advice?.includes(a)) res.advice = [...(res.advice ?? []), a];
  }

  if (ran) {
    const a = "추진력 신호: 25분 집중 세션 1회를 바로 배치하세요.";
    if (!res.advice?.includes(a)) res.advice = [...(res.advice ?? []), a];
  }

  // 3) 추가 색상 패턴 감지 및 보강

  // 빨강 계열
  const redHits = [
    "빨강", "빨간", "붉은", "빨간색", "붉은색", "빨간빛", "붉은빛", "빨간 불", "빨간불", "빨간 불빛", "빨간불빛"
  ];
  const redRegexes = [
    kflex("빨간 불"), kflex("빨간 불빛"), kflex("붉은 빛")
  ];
  const hasRed = containsAny(text, [...redHits, ...redRegexes]);
  if (hasRed) {
    const cue: ColorCue = { key: "color_red", label: "빨간색", tags: ["열정", "위험", "에너지"] };
    const colors = res.cues?.colors ?? [];
    res.cues = { ...res.cues, colors: ensureUnique(colors, cue) };
    const extraAdvice = "빨간색 신호: 에너지가 넘치거나 경고 신호일 수 있으니 주의 깊게 관찰하세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 파랑 계열
  const blueHits = [
    "파랑", "파란", "파란색", "푸른", "푸른색", "파란빛", "푸른빛", "파란 불", "파란불", "파란 불빛", "파란불빛"
  ];
  const blueRegexes = [
    kflex("파란 불"), kflex("파란 불빛"), kflex("푸른 빛")
  ];
  const hasBlue = containsAny(text, [...blueHits, ...blueRegexes]);
  if (hasBlue) {
    const cue: ColorCue = { key: "color_blue", label: "파란색", tags: ["평화", "안정", "신뢰"] };
    const colors = res.cues?.colors ?? [];
    res.cues = { ...res.cues, colors: ensureUnique(colors, cue) };
    const extraAdvice = "파란색 신호: 마음의 평화와 안정감을 느껴보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 흰색 계열
  const whiteHits = [
    "하얀", "하얗", "하얀색", "흰", "흰색", "흰빛", "하얀 빛", "흰 빛"
  ];
  const whiteRegexes = [
    kflex("하얀 빛"), kflex("흰 빛")
  ];
  const hasWhite = containsAny(text, [...whiteHits, ...whiteRegexes]);
  if (hasWhite) {
    const cue: ColorCue = { key: "color_white", label: "흰색", tags: ["순수", "평화", "새 시작"] };
    const colors = res.cues?.colors ?? [];
    res.cues = { ...res.cues, colors: ensureUnique(colors, cue) };
    const extraAdvice = "흰색 신호: 순수한 마음과 새로운 시작에 집중해 보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 검정 계열
  const blackHits = [
    "검은", "검정", "검은색", "검정색", "검은빛", "검정빛", "검은 빛", "검정 빛"
  ];
  const blackRegexes = [
    kflex("검은 빛"), kflex("검정 빛")
  ];
  const hasBlack = containsAny(text, [...blackHits, ...blackRegexes]);
  if (hasBlack) {
    const cue: ColorCue = { key: "color_black", label: "검은색", tags: ["불안", "미지", "깊이"] };
    const colors = res.cues?.colors ?? [];
    res.cues = { ...res.cues, colors: ensureUnique(colors, cue) };
    const extraAdvice = "검은색 신호: 내면의 불안이나 미지를 탐구해 보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 초록 계열
  const greenHits = [
    "초록", "초록색", "녹색", "녹색빛", "초록빛", "초록 빛", "녹색 빛"
  ];
  const greenRegexes = [
    kflex("초록 빛"), kflex("녹색 빛")
  ];
  const hasGreen = containsAny(text, [...greenHits, ...greenRegexes]);
  if (hasGreen) {
    const cue: ColorCue = { key: "color_green", label: "초록색", tags: ["성장", "치유", "자연"] };
    const colors = res.cues?.colors ?? [];
    res.cues = { ...res.cues, colors: ensureUnique(colors, cue) };
    const extraAdvice = "초록색 신호: 성장과 치유의 에너지를 받아들이세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 4) 행동 패턴 감지 및 보강

  // 날기
  const flyHits = ["날", "비행", "날아", "비상", "하늘을 날", "공중을 날"];
  const hasFly = containsAny(text, flyHits);
  if (hasFly) {
    const actions = new Set([...(res.cues?.actions ?? [])]);
    actions.add("fly");
    res.cues = { ...res.cues, actions: Array.from(actions) };
    const extraAdvice = "비행 신호: 자유와 높은 시야를 상징합니다. 새로운 관점에서 생각해 보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 떨어지기
  const fallHits = ["떨어지", "추락", "넘어지", "굴러떨어지", "떨어짐"];
  const hasFall = containsAny(text, fallHits);
  if (hasFall) {
    const actions = new Set([...(res.cues?.actions ?? [])]);
    actions.add("fall");
    res.cues = { ...res.cues, actions: Array.from(actions) };
    const extraAdvice = "추락 신호: 통제력 상실이나 불안감을 나타낼 수 있습니다. 현재 상황을 점검해 보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 쫓기기
  const chaseHits = ["쫓기", "도망", "쫓아오", "추격", "뒤쫓"];
  const hasChase = containsAny(text, chaseHits);
  if (hasChase) {
    const actions = new Set([...(res.cues?.actions ?? [])]);
    actions.add("chase");
    res.cues = { ...res.cues, actions: Array.from(actions) };
    const extraAdvice = "추격 신호: 압박감이나 회피하고 싶은 상황이 있을 수 있습니다. 원인을 탐색해 보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 숨기
  const hideHits = ["숨", "숨기", "숨다", "숨었", "숨겨"];
  const hasHide = containsAny(text, hideHits);
  if (hasHide) {
    const actions = new Set([...(res.cues?.actions ?? [])]);
    actions.add("hide");
    res.cues = { ...res.cues, actions: Array.from(actions) };
    const extraAdvice = "숨기 신호: 회피하거나 보호가 필요한 상황일 수 있습니다. 자신을 돌봐주세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 5) 상징 심볼 감지 및 보강

  // 물 관련: 비, 강, 바다
  const waterHits = ["비", "비가", "비오는", "강", "하천", "바다", "호수", "물결", "파도"];
  const hasWater = containsAny(text, waterHits);
  if (hasWater) {
    const symbols = res.symbols ?? [];
    const waterSymbol = { key: "symbol_water", label: "물", tags: ["감정", "변화", "무의식"], meaning: "감정의 흐름과 변화", advice: "물의 상징을 통해 감정 상태를 탐색해 보세요." };
    if (!symbols.some(s => s.key === waterSymbol.key)) res.symbols = [...symbols, waterSymbol];
    const extraAdvice = "물 상징: 감정과 무의식의 흐름을 주의 깊게 관찰하세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  // 동물 관련: 개, 뱀
  const dogHits = ["개", "강아지", "멍멍이", "개구리"];
  const hasDog = containsAny(text, dogHits);
  if (hasDog) {
    const symbols = res.symbols ?? [];
    const dogSymbol = { key: "symbol_dog", label: "개", tags: ["충성", "우정", "보호"], meaning: "신뢰와 우정을 상징", advice: "개 상징을 통해 인간관계에 대해 생각해 보세요." };
    if (!symbols.some(s => s.key === dogSymbol.key)) res.symbols = [...symbols, dogSymbol];
    const extraAdvice = "개 상징: 신뢰와 우정의 관계를 되돌아보세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  const snakeHits = ["뱀", "스네이크", "뱀장어"];
  const hasSnake = containsAny(text, snakeHits);
  if (hasSnake) {
    const symbols = res.symbols ?? [];
    const snakeSymbol = { key: "symbol_snake", label: "뱀", tags: ["변화", "위험", "치유"], meaning: "변화와 치유, 위험 신호", advice: "뱀 상징을 통해 변화와 경고를 인지하세요." };
    if (!symbols.some(s => s.key === snakeSymbol.key)) res.symbols = [...symbols, snakeSymbol];
    const extraAdvice = "뱀 상징: 변화와 치유의 메시지를 받아들이세요.";
    if (!res.advice?.includes(extraAdvice)) res.advice = [...(res.advice ?? []), extraAdvice];
  }

  return res;
}