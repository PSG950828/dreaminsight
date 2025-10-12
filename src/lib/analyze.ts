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
  narrative?: string;    // 통합 내러티브
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

  // 통합 내러티브 생성
  const narrative = buildIntegratedNarrative(dreamText, symbols, quick.cues, ap.advice);

  return {
    input: { raw: dreamText, preprocessed: pre },
    symbols,
    cues: quick.cues,
    advice: ap.advice,
    prompts: ap.prompts,
    actionPlan: plan,
    evidence: ev,
    suggestions: sug,
    narrative,
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

// Negation window and tokens for local exclusion
const NEG_WINDOW = 12;
const NEG_TOKENS = ['안','못','아니','않','없','미발생','금지','거부','no','not','without'];

// Proximity token maps for emotions/colors
const EMO_TOKEN_MAP: Record<string, string[]> = {
  emo_anxiety: ['불안','불안감','초조','긴장','조마조마','걱정','근심','anxiety','anx','anxious','nervous','uneasy'],
  emo_fear: ['두려움','두렵','공포','공포감','무섭','겁','겁먹','오싹','섬뜩','fear','fright','panic','scared','terrified'],
  emo_sadness: ['슬픔','슬퍼','우울','울적','침울','눈물','상실감','그리움','쓸쓸','down','melancholy','blue'],
  emo_joy: ['기쁨','기쁘','행복','즐거움','환희','설렘','유쾌','고양','반가움','웃음','joy','joyful','delight','happy','happiness'],
  emo_anger: ['분노','분개','격노','화','화가','짜증','열받','성남','분통','irritated','anger','angry','furious','rage'],
};
const COLOR_TOKEN_MAP: Record<string, string[]> = {
  color_red: ['빨강','빨간','붉','붉은빛','적색','red'],
  color_yellow: ['노랑','노란','노오란','노란불','yellow'],
  color_green: ['초록','초록빛','녹색','green'],
  color_blue: ['파랑','파란','푸른','푸른빛','blue'],
  color_black: ['검정','검은','암흑','깜깜','어둠','그림자','black'],
  color_white: ['하양','하얀','순백','백색','white'],
  color_purple: ['보라','보랏빛','보라빛','보라불빛','자주','자줏빛','퍼플','바이올렛','라일락','purple','violet'],
  color_orange: ['주황','주황빛','오렌지','orange'],
  color_gray: ['회색','회빛','잿빛','그레이','gray','grey'],
  color_brown: ['갈색','갈색빛','흙빛','브라운','brown'],
};

// Env-tunable negation config
function getNegTokens(): string[] {
  try {
    const raw = process?.env?.DI_NEG_TOKENS || '';
    const arr = raw.split(/[\s,]+/).map(s=>s.trim()).filter(Boolean);
    return arr.length ? arr : NEG_TOKENS;
  } catch {
    return NEG_TOKENS;
  }
}

// Env-tunable gains/penalties
function getProxGains(): { close: number; mid: number } {
  const d = { close: 0.05, mid: 0.02 };
  try {
    const c = parseFloat(String((process as any)?.env?.DI_PROX_GAIN_CLOSE || ''));
    const m = parseFloat(String((process as any)?.env?.DI_PROX_GAIN_MID || ''));
    return {
      close: Number.isFinite(c) ? Math.max(0, Math.min(0.2, c)) : d.close,
      mid: Number.isFinite(m) ? Math.max(0, Math.min(0.2, m)) : d.mid,
    };
  } catch { return d; }
}
function getWeakNegPenalty(): { per: number; max: number } {
  const d = { per: 0.03, max: 0.1 };
  try {
    const p = parseFloat(String((process as any)?.env?.DI_WEAK_NEG_PENALTY_PER || ''));
    const mx = parseFloat(String((process as any)?.env?.DI_WEAK_NEG_PENALTY_MAX || ''));
    return {
      per: Number.isFinite(p) ? Math.max(0, Math.min(0.1, p)) : d.per,
      max: Number.isFinite(mx) ? Math.max(0, Math.min(0.3, mx)) : d.max,
    };
  } catch { return d; }
}
function getNegWindow(): number {
  try {
    const n = parseInt(String((process as any)?.env?.DI_NEG_WINDOW || ''), 10);
    if (Number.isFinite(n) && n >= 4 && n <= 64) return n;
    return NEG_WINDOW;
  } catch { return NEG_WINDOW; }
}

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

  // 2-2-b) 이모지 기반 보강(난해/말도 안 되는 입력에서도 최소 단서 확보)
  try {
    const e = extractEmojiCues(text);
    const seenC = new Set(colors.map(c=>c.key));
    const seenE = new Set(emotions.map(c=>c.key));
    for (const c of e.colors) if (!seenC.has(c.key)) colors.push(c);
    for (const m of e.emotions) if (!seenE.has(m.key)) emotions.push(m);
  } catch {}

  // 특수: teeth 맥락 보정
  if (symbolKeys.includes('teeth') && !looksLikeTeethContext(text)) {
    symbolKeys = symbolKeys.filter(k => k !== 'teeth');
  }

  // 2-1-b) 부정/제외 규칙: 상징 근처(±12자)에 부정 토큰이 있으면 해당 상징 제외
  try {
    const normalizeText = (DICT as any).normalizeText as ((s:string)=>string) | undefined;
    const applyCorrections = (DICT as any).applyCorrections as ((s:string)=>string) | undefined;
    const base = normalizeText ? normalizeText(text) : String(text || '').toLowerCase();
    const normalized = applyCorrections ? applyCorrections(base) : base;
    const aliasMap: Record<string, string[]> = (DICT as any).getMergedAliases ? (DICT as any).getMergedAliases() : {};
    const negRe = new RegExp(`(${getNegTokens().map(t=>t.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|')})`, 'gi');
    // 0: none, 1: weak(pre), 2: strong(post)
    function negationStrength(src: string, alias: string): number {
      if (!alias) return 0;
      const pat = new RegExp(alias.replace(/\s+/g, '\\s*'), 'gi');
      let m: RegExpExecArray | null;
      const winF = getNegWindow();
      const winB = Math.max(4, Math.floor(winF * 0.66));
      while ((m = pat.exec(src)) !== null) {
        const aStart = m.index;
        const aEnd = m.index + m[0].length;
        // scan local window for neg tokens, direction-aware
        let nm: RegExpExecArray | null;
        let strength = 0;
        const scanStart = Math.max(0, aStart - (winF + 2));
        negRe.lastIndex = scanStart;
        while ((nm = negRe.exec(src)) !== null) {
          const p = nm.index;
          if (p >= aEnd && (p - aEnd) <= winF) { strength = 2; break; } // post-negation strong
          if (p < aStart && (aStart - p) <= winB) { strength = Math.max(strength, 1); } // pre-negation weak
          if (p > aEnd + winF) break; // outside forward window
        }
        if (strength > 0) return strength;
      }
      return 0;
    }
    symbolKeys = symbolKeys.filter((k) => {
      const list = aliasMap?.[k] || [];
      if (!list.length) return true;
      for (const raw of list) {
        const a = normalizeText ? normalizeText(raw) : String(raw || '').toLowerCase();
        if (!a) continue;
        const s = negationStrength(normalized, a);
        if (s >= 2) return false; // strong(post) negation → exclude
      }
      return true;
    });
  } catch {}

  // 2-3) Fallback domain detectors: ensure something matches for messy inputs
  if (symbolKeys.length === 0) {
    const t = (text || '').toLowerCase();
    const has = (arr: (string|RegExp)[]) => arr.some(p => p instanceof RegExp ? p.test(t) : t.includes(p as string));
    const push = (k: string) => { if (!symbolKeys.includes(k)) symbolKeys.push(k); };
    if (has(['연인','남친','여친','배우자','가족','친구','헤어지','이별','키스','섹스'])) push('domain_relationship');
    if (has(['병원','의사','주사','수술','검사','검진','약','두통','복통','기침','발열','감기','코로나'])) push('domain_health');
    if (has(['회사','직장','회의','보고서','상사','팀장','프로젝트','마감','야근'])) push('domain_work');
    if (has(['학교','교실','선생','수업','숙제','시험','중간','기말','지각'])) push('domain_school');
    if (has(['귀신','유령','좀비','괴물','공포','무섭'])) push('domain_fear');
    if (has(['여행','비행기','기차','버스','배','공항','여권','탑승'])) push('domain_travel');
    if (has(['집','방','거실','침실','주방','창문','문','현관','청소','정리'])) push('domain_home');
    if (has(['돈','지갑','카드','계좌','이체','대출','지출','저축'])) push('domain_money');
    if (has(['핸드폰','휴대폰','스마트폰','로그인','비번','비밀번호','계정','동기화','백업','알림','카톡','dm','디엠','스팸'])) push('domain_digital');
    if (has(['비','눈','바람','태풍','번개','천둥','무지개','일출','일몰','바다','강','숲','산'])) push('domain_nature');
    // category generics
    if (has(['강아지','개','고양이','반려'])) push('animal_pet');
    if (has(['호랑이','사자','곰','코끼리','여우','늑대'])) push('animal_wild');
    if (has(['새','비둘기','참새','독수리','갈매기','까마귀'])) push('bird_generic');
    if (has(['물고기','생선','고래','상어','돌고래','잉어','금붕어'])) push('fish_generic');
    if (has(['벌','나비','모기','파리','개미','거미'])) push('insect_generic');
    if (has(['자동차','차','운전'])) push('vehicle_car');
    if (has(['버스','셔틀'])) push('vehicle_bus');
    if (has(['기차','지하철','전철'])) push('vehicle_train');
    if (has(['자전거'])) push('vehicle_bike');
    if (has(['비행기','항공'])) push('vehicle_plane');
    if (has(['배','선박','보트'])) push('vehicle_ship');
    if (has(['아파트','오피스텔','빌라'])) push('building_apartment');
    if (has(['사무실','오피스'])) push('building_office');
    if (has(['학교','교실','캠퍼스'])) push('building_school');
    if (has(['병원','응급실'])) push('building_hospital2');
    if (has(['시장','마트','백화점','편의점'])) push('building_market');
    if (has(['사찰','절','교회','성당'])) { if (!symbolKeys.includes('building_temple2')&&!symbolKeys.includes('building_church2')) push('building_temple2'); }
    if (has(['핸드폰','휴대폰','스마트폰','폰'])) push('object_phone');
    if (has(['노트북','컴퓨터','맥북','PC'])) push('object_laptop');
    if (has(['카메라','DSLR','미러리스'])) push('object_camera');
    if (has(['책','교재'])) push('object_book');
    if (has(['펜','연필','볼펜'])) push('object_pen');
    if (has(['열쇠','키'])) push('object_key2');
    if (has(['지갑','카드'])) push('object_wallet2');
    if (has(['가방','백팩','토트'])) push('object_bag');
    if (has(['옷','셔츠','바지','치마','재킷','코트'])) push('object_clothes');
    if (has(['반지','목걸이','귀걸이','팔찌'])) push('object_jewelry');
    if (has(['밥','빵','과일','고기','라면'])) push('food_generic');
    if (has(['물','생수'])) push('drink_water');
    if (has(['술','소주','맥주','와인'])) push('drink_alcohol');
    if (has(['여권','주민증','면허','티켓'])) push('document_passport');
    if (has(['머리','두통'])) push('body_head');
    if (has(['손','손가락'])) push('body_hand');
    if (has(['발','발가락'])) push('body_foot');
    if (has(['상처','베임','피멍','골절'])) push('injury_wound');
  }

  // Final fallback
  if (symbolKeys.length === 0) symbolKeys.push('unknown_generic');

  return { symbolKeys: Array.from(new Set(symbolKeys)), cues: { colors, emotions } };
}

// ── Emoji cues: colors/emotions from common emojis ─────────────────────────
function extractEmojiCues(text: string): { colors: Cue[]; emotions: Cue[] } {
  const T = (text || "");
  const colors: Cue[] = [];
  const emotions: Cue[] = [];
  const pushC = (key: string, label: string, tags: string[]) => { colors.push({ key, label, tags }); };
  const pushE = (key: string, label: string, tags: string[]) => { emotions.push({ key, label, tags }); };

  // Colors: squares/circles
  if (/🟥|🔴/.test(T)) pushC('color_red', '빨간색', ['에너지','경고']);
  if (/🟧|🟠/.test(T)) pushC('color_orange', '주황색', ['에너지','사교']);
  if (/🟨|🟡/.test(T)) pushC('color_yellow', '노란색', ['주의','점검']);
  if (/🟩|🟢/.test(T)) pushC('color_green', '초록색', ['성장','회복']);
  if (/🟦|🔵/.test(T)) pushC('color_blue', '파란색', ['차분','집중']);
  if (/🟪|🟣|🫐/.test(T)) pushC('color_purple', '보라색', ['직관','영감']);
  if (/🟫|🟤/.test(T)) pushC('color_brown', '갈색', ['안정','뿌리']);
  if (/⬛️|◼️|⚫️/.test(T)) pushC('color_black', '검은색', ['무의식','깊이']);
  if (/⬜️|◻️|⚪️/.test(T)) pushC('color_white', '하얀색', ['정화','새출발']);
  // Other pictographs implying colors/contexts
  if (/✨|⭐|🌟/.test(T)) pushC('color_white', '하얀색', ['통찰','반짝임']);
  if (/☀️|🌞/.test(T)) pushC('color_yellow', '노란색', ['활력','낙관']);
  if (/🌙|🌑|🌚/.test(T)) pushC('color_black', '검은색', ['밤','고요']);
  if (/🌊|💧|🌧️|☔/.test(T)) pushC('color_blue', '파란색', ['정화','흐름']);
  if (/🔥|💥/.test(T)) pushC('color_red', '빨간색', ['열정','경고']);

  // Emotions: faces
  if (/[😂🤣😄😁🙂😊]/.test(T)) pushE('emo_joy', '기쁨', ['긍정','유쾌']);
  if (/[😢😭😔😞😿]/.test(T)) pushE('emo_sadness', '슬픔', ['정화','회복필요']);
  if (/[😱😨😰😧]/.test(T)) pushE('emo_fear', '두려움', ['경계','안정']);
  if (/[😡🤬😤]/.test(T)) pushE('emo_anger', '분노', ['경계','표현']);
  if (/[😅😬😓]/.test(T)) pushE('emo_anxiety', '불안', ['통제','안정']);
  if (/[😍🥰❤️💕💖💗]/.test(T)) pushE('emo_joy', '기쁨', ['애정','연결']);
  if (/[💔]/.test(T)) pushE('emo_sadness', '슬픔', ['상실']);
  if (/[💀☠️]/.test(T)) pushE('emo_fear', '두려움', ['유한성','경계']);

  return { colors: uniqueC(colors), emotions: uniqueC(emotions) } as any;
}

function uniqueC<T extends { key: string }>(arr: T[]): T[] {
  const m = new Map<string, T>();
  for (const it of arr) if (!m.has(it.key)) m.set(it.key, it);
  return Array.from(m.values());
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

  // 상황별 맞춤 조언 생성 (우선순위)
  const contextualAdvice = generateContextualAdvice(symbolKeys, cues, text);
  advice.push(...contextualAdvice);

  // 감정-색상 조합별 특별 조언
  const combinedAdvice = generateCombinedAdvice(cues.emotions, cues.colors, symbolKeys);
  advice.push(...combinedAdvice);

  // 기본 심볼 기반 조언 (백업)
  if (advice.length === 0) {
    for (const k of symbolKeys) {
      const s = MERGED[k];
      if (s?.advice) advice.push(s.advice);
    }
  }

  // 최종 안전망
  if (advice.length === 0) {
    advice.push("꿈은 감정의 메타데이터. 감정-색-행동 중 하나를 현실에서 의식적으로 전환해 보세요.");
  }

  return {
    advice: Array.from(new Set(advice)).slice(0, 6),
    prompts,
  };
}

// 4) 통합 내러티브 생성
function buildIntegratedNarrative(
  dreamText: string, 
  symbols: Array<{ key: string; label: string; tags: string[]; meaning: string; advice?: string }>,
  cues: { colors: Array<{ key: string; label: string; tags: string[] }>; emotions: Array<{ key: string; label: string; tags: string[] }> },
  advice: string[]
): string {
  if (symbols.length === 0) return "이 꿈은 일반적인 상징보다는 개인적인 경험과 감정이 강하게 반영된 것으로 보입니다.";

  // 주요 테마 식별
  const themes = {
    relationship: symbols.filter(s => s.tags.includes("관계") || s.tags.includes("친밀") || s.tags.includes("이별")),
    emotion: [...symbols.filter(s => s.tags.includes("감정") || s.tags.includes("불안") || s.tags.includes("슬픔")), ...cues.emotions.map(e => ({ key: e.key, label: e.label, tags: e.tags, meaning: "" }))],
    transformation: symbols.filter(s => s.tags.includes("변화") || s.tags.includes("재생") || s.tags.includes("새시작")),
    supernatural: symbols.filter(s => s.tags.includes("초자연") || s.tags.includes("미지") || s.tags.includes("마법")),
    death: symbols.filter(s => s.tags.includes("죽음") || s.tags.includes("종결")),
    colors: cues.colors
  };

  let narrative = "";

  // 관계 중심 내러티브
  if (themes.relationship.length >= 2) {
    const relSymbols = themes.relationship.map(s => s.label).join(", ");
    narrative = `이 꿈은 **관계의 변화와 감정적 성장**에 대한 이야기입니다. ${relSymbols} 등의 상징을 통해 `;
    
    if (symbols.some(s => s.key === "breakup") && symbols.some(s => s.key === "new_relationship")) {
      narrative += "과거의 이별과 새로운 만남 사이에서 느끼는 복잡한 감정을 표현하고 있습니다. ";
    }
    
    if (themes.emotion.some(e => e.key === "emotion_sadness") && symbols.some(s => s.key === "jealousy")) {
      narrative += "상실감과 질투라는 상반된 감정이 공존하면서 내면의 갈등을 보여줍니다. ";
    }
  }
  
  // 변화/재생 내러티브
  else if (themes.transformation.length >= 1 || themes.death.length >= 1) {
    narrative = `이 꿈은 **인생의 중대한 전환점**을 상징합니다. `;
    
    if (symbols.some(s => s.key === "death") && symbols.some(s => s.key === "resurrection")) {
      narrative += "죽음과 부활의 순환을 통해 완전히 새로운 자아로 거듭날 준비가 되었음을 의미합니다. ";
    }
    
    if (themes.transformation.length > 0) {
      narrative += "변화에 대한 두려움보다는 성장에 대한 기대가 더 크다는 신호로 해석됩니다. ";
    }
  }
  
  // 초자연적 체험 내러티브
  else if (themes.supernatural.length >= 2) {
    const supSymbols = themes.supernatural.map(s => s.label).join("과 ");
    narrative = `${supSymbols}이 등장하는 이 꿈은 **의식의 확장과 새로운 가능성**에 대한 메시지입니다. `;
    
    if (symbols.some(s => s.key === "alien") && symbols.some(s => s.key === "invisible")) {
      narrative += "기존 관점의 한계를 벗어나 완전히 다른 시각에서 현실을 바라보라는 촉구로 볼 수 있습니다. ";
    }
  }
  
  // 감정 중심 내러티브
  else if (themes.emotion.length >= 1) {
    const mainEmotion = themes.emotion[0].label;
    narrative = `**${mainEmotion}**을 중심으로 한 감정 정화의 꿈입니다. `;
    
    if (themes.colors.length > 0) {
      const colorMeaning = themes.colors.map(c => c.label).join("과 ");
      narrative += `${colorMeaning}의 상징적 의미와 함께 `;
    }
    
    narrative += "현재 마음 상태를 솔직하게 인정하고 적절한 돌봄이 필요함을 알려주고 있습니다. ";
  }
  
  // 일반적 내러티브
  else {
    const mainSymbols = symbols.slice(0, 2).map(s => s.label).join("과 ");
    narrative = `${mainSymbols}이 중심이 되는 이 꿈은 **일상의 소중한 변화**에 주목하라는 메시지입니다. `;
  }

  // 색상 보강
  if (themes.colors.length >= 2) {
    const colorEnergy = themes.colors.map(c => {
      if (c.key === "color_red") return "강한 에너지";
      if (c.key === "color_blue") return "차분한 이성";
      if (c.key === "color_purple") return "직관적 통찰";
      if (c.key === "color_green") return "회복과 성장";
      return c.label;
    }).join("과 ");
    
    narrative += `특히 ${colorEnergy}의 조화를 통해 균형 잡힌 접근이 필요함을 시사합니다. `;
  }

  // 실행 방향 제시
  if (advice.length > 0) {
    narrative += `이 꿈이 제시하는 핵심 방향은 "${advice[0]}"입니다.`;
  }

  return narrative || "이 꿈은 현재 내면에서 일어나고 있는 변화를 섬세하게 반영하고 있습니다.";
}

// 5) 심층 해석 API: GI/MDA 내러티브 포함 (프리미엄 보고서용)
export type DeepAnalyzeResult = AnalyzeResult & {
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
  // 물 + 슬픔 → 정화/정서 케어
  if (hasSymbol(qa, 'water') && hasEmotion(qa, 'emo_sadness')) {
    out.push({ key: 'plan_water_sad_10', title: '정화 루틴 10분', duration: 10, script: '미지근한 물 한 잔, 4-7-8 호흡, 감정 3문장 기록.', tags: ['정화','우울↓'], reason: '물×슬픔' });
  }
  // 집 + 문 잠김 → 경계 설정 점검
  if (hasSymbol(qa, 'house') && hasSymbol(qa, 'door_locked')) {
    out.push({ key: 'plan_boundary_10', title: '경계 재설정 10분', duration: 10, script: '하루 경계(시간/공간/알림) 3항목을 재정의하고 1개를 즉시 적용.', tags: ['경계','안정'], reason: '집×문 잠김' });
  }
  // 폭우 + 불안 → 저자극 루틴
  if (hasSymbol(qa, 'heavy_rain') && hasEmotion(qa, 'emo_anxiety')) {
    out.push({ key: 'plan_low_stim_10', title: '저자극 10분', duration: 10, script: '알림 Off, 조용한 공간에서 호흡/정리/스트레칭 중 1개 실행.', tags: ['불안↓','회복'], reason: '폭우×불안' });
  }
  // 천둥/번개 → 통찰 캡처
  if (hasSymbol(qa, 'thunder_lightning')) {
    out.push({ key: 'plan_insight_10', title: '통찰 캡처 10분', duration: 10, script: '방금 떠오른 생각/걱정을 5줄 목록화 → 상위 1개만 다음 행동 정의.', tags: ['통찰','기록'], reason: '천둥/번개' });
  }
  // 안개 + 불안 → 가시성 높이기
  if (hasSymbol(qa, 'fog') && (hasEmotion(qa, 'emo_anxiety') || hasColor(qa, 'color_yellow'))) {
    out.push({ key: 'plan_visibility_10', title: '가시성 10분', duration: 10, script: '다음 행동을 10분 단위로 3조각으로 쪼개고, 질문 1개를 명확히 작성.', tags: ['가시성','계획'], reason: '안개×불안/주의' });
  }
  // 지하철 혼잡 + 불안 → 출퇴근 버퍼
  if (hasSymbol(qa, 'subway_crowd') && hasEmotion(qa, 'emo_anxiety')) {
    out.push({ key: 'plan_commute_buffer_10', title: '출퇴근 버퍼 10분', duration: 10, script: '출발/도착 버퍼 각 5분 확보, 대체 경로/대기 루틴 메모.', tags: ['버퍼','불안↓'], reason: '지하철 혼잡×불안' });
  }
  // 여권 분실 + 폰 방전 → 비상 연락
  if (hasSymbol(qa, 'passport_lost') && hasSymbol(qa, 'phone_dead')) {
    out.push({ key: 'plan_emergency_contact_10', title: '비상 연락 10분', duration: 10, script: '오프라인 비상 연락처 3개를 종이/사진으로 준비.', tags: ['비상','준비'], reason: '여권×폰 방전' });
  }
  // 지갑 분실 + 알람 미스 → 결제/리마인더
  if (hasSymbol(qa, 'wallet_lost') && hasSymbol(qa, 'alarm_missed')) {
    out.push({ key: 'plan_payment_reminder_10', title: '결제/리마인더 정비', duration: 10, script: '비상 결제 수단/현금 준비, 주요 일정 이중 알림 설정.', tags: ['결제','리마인더'], reason: '지갑×알람 미스' });
  }
  // 저장공간 부족 + 파일 삭제 → 버전 정책
  if (hasSymbol(qa, 'storage_full') && hasSymbol(qa, 'file_deleted')) {
    out.push({ key: 'plan_version_policy_10', title: '버전 정책 10분', duration: 10, script: '작업 폴더 1개에 버전 규칙(접미사/날짜) 적용, 휴지통/백업 점검.', tags: ['버전','백업'], reason: '용량 부족×삭제' });
  }
  // 시험 + 노란불 → 체크리스트 점검
  if (hasSymbol(qa, 'exam') && hasColor(qa, 'color_yellow')) {
    out.push({ key: 'plan_exam_check_10', title: '체크리스트 10분', duration: 10, script: '합격 기준/필수 항목 3칸 체크, 미흡 1개만 메우기.', tags: ['평가','점검'], reason: '시험×노란불' });
  }
  // 추락 + 두려움 → 사후 안정화
  if (hasSymbol(qa, 'falling') && hasEmotion(qa, 'emo_fear')) {
    out.push({ key: 'plan_aftercare_5', title: '사후 안정화 5분', duration: 5, script: '안정 호흡 3회, 단단한 표면에 발 딛기, 현재 감각 3가지 적기.', tags: ['안정','두려움↓'], reason: '추락×두려움' });
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
  type RuleItem = { text: string; dist?: number };
  const items: RuleItem[] = [];
  const ns = noiseStats(text);
  const aliases: Record<string, string[]> = (DICT as any).getMergedAliases ? (DICT as any).getMergedAliases() : {};
  const merged = DICT.getMergedSymbols();
  const norm = ((DICT as any).normalizeText?.(text) || String(text)).toLowerCase();
  const toCands = (k: string) => {
    if (k.startsWith('emo:')) {
      const key = k.slice(4);
      return (EMO_TOKEN_MAP[key] || []).map((s)=> ((DICT as any).normalizeText?.(s) || String(s)));
    }
    if (k.startsWith('color:')) {
      const key = k.slice(6);
      return (COLOR_TOKEN_MAP[key] || []).map((s)=> ((DICT as any).normalizeText?.(s) || String(s)));
    }
    return [merged[k]?.label || '', ...(aliases[k]||[])].filter(Boolean).map((s:any)=> ((DICT as any).normalizeText?.(s) || String(s)));
  };
  const findAll = (src: string, pat: string) => { const re = new RegExp(pat.replace(/\s+/g,'\\s*'), 'gi'); const out: number[] = []; let m: RegExpExecArray|null; while ((m = re.exec(src)) !== null) out.push(m.index); return out; };
  const minDist = (k1: string, k2: string): number | undefined => { try { const A = toCands(k1).flatMap((w)=> findAll(norm, w)); const B = toCands(k2).flatMap((w)=> findAll(norm, w)); let best: number | undefined; for (const a of A) for (const b of B) { const d = Math.abs(a-b); best = best===undefined? d : Math.min(best, d); } return best; } catch { return undefined; } };
  const push = (text: string, k1?: string, k2?: string) => { const dist = (k1 && k2) ? minDist(k1, k2) : undefined; items.push({ text, dist }); };

  if (qa.symbolKeys.includes('teeth') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) push('치아×불안 → 발화/자기이미지','teeth','emo:emo_anxiety');
  if (qa.symbolKeys.includes('falling') && qa.cues.colors.some(c=>c.key==='color_black')) push('추락×검정 → 급락 공포/통제 저하','falling','color:color_black');
  if (qa.symbolKeys.includes('exam') && qa.symbolKeys.includes('cannot_speak')) push('시험×발화불능 → 평가/표현 스트레스','exam','cannot_speak');
  if (qa.symbolKeys.includes('chase') && qa.symbolKeys.includes('hiding')) push('추격×숨기 → 회피 인식','chase','hiding');
  if (qa.symbolKeys.includes('partner_argument') && qa.symbolKeys.includes('jealousy_scene')) push('연인 다툼×질투 → 욕구 불일치/XAI: I-메시지');
  if (qa.symbolKeys.includes('ring_lost') && qa.symbolKeys.includes('wedding_canceled')) push('반지×식 취소 → 약속/가치 재검토','ring_lost','wedding_canceled');
  if (qa.symbolKeys.includes('boss_criticism') && qa.symbolKeys.includes('coworker_conflict')) push('상사 질책×동료 갈등 → 피드백/협업 규칙','boss_criticism','coworker_conflict');
  if (qa.symbolKeys.includes('medical_checkup') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) push('검진×불안 → 질문/대기 루틴','medical_checkup','emo:emo_anxiety');
  if (qa.symbolKeys.includes('login_failed') && qa.symbolKeys.includes('password_forgot')) push('로그인 실패×비번 잊음 → 비번/백업/2FA','login_failed','password_forgot');
  if (qa.symbolKeys.includes('cloud_sync_lost') && qa.symbolKeys.includes('file_deleted')) push('동기화 끊김×파일 삭제 → 백업/복구');
  if (qa.symbolKeys.includes('friend_betrayal') && qa.cues.emotions.some(e=>e.key==='emo_sadness')) push('배신×슬픔 → 관계 지도','friend_betrayal','emo:emo_sadness');
  if (qa.symbolKeys.includes('jealousy_scene') && qa.symbolKeys.includes('left_on_read')) push('질투×읽씹 → 경계 회복','jealousy_scene','left_on_read');
  if ((qa.symbolKeys.includes('fever') || qa.symbolKeys.includes('cough')) && qa.symbolKeys.includes('quarantine')) push('증상×격리 → 회복 계획');
  if (qa.symbolKeys.includes('spam_dm') && qa.symbolKeys.includes('notifications_overflow')) push('스팸×알림 → 필터/차단');
  if (qa.symbolKeys.includes('screen_cracked') && qa.symbolKeys.includes('headache')) push('화면 손상×두통 → 스크린타임 절감','screen_cracked','headache');
  if (qa.symbolKeys.includes('left_on_read') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) push('읽씹×불안 → 주의 전환','left_on_read','emo:emo_anxiety');
  if (qa.symbolKeys.includes('surgery') && qa.cues.emotions.some(e=>e.key==='emo_fear')) push('수술×두려움 → 준비/2nd 의견','surgery','emo:emo_fear');
  if (qa.symbolKeys.includes('storage_full') && qa.symbolKeys.includes('cloud_sync_lost')) push('용량 부족×동기화 → 공간 정리');
  if (qa.symbolKeys.includes('video_call_lag') && qa.symbolKeys.includes('headache')) push('화상 지연×두통 → 품질/아젠다','video_call_lag','headache');
  if (qa.symbolKeys.includes('passport_lost') && qa.symbolKeys.includes('alarm_missed')) push('여권×알람 미스 → 체크/리마인더','passport_lost','alarm_missed');
  if (qa.symbolKeys.includes('door_locked') && qa.symbolKeys.includes('key_lost')) push('문 잠김×열쇠 분실 → 대안 접근','door_locked','key_lost');
  if (qa.symbolKeys.includes('wallet_lost') && qa.symbolKeys.includes('phone_dead')) push('지갑×폰 방전 → 비상 결제/연락','wallet_lost','phone_dead');
  if (qa.symbolKeys.includes('window_broken') && qa.symbolKeys.includes('jealousy_scene')) push('창문×질투 → 공유 범위 재설정','window_broken','jealousy_scene');
  if (qa.symbolKeys.includes('storage_full') && qa.symbolKeys.includes('file_deleted')) push('용량×삭제 → 버전 정책','storage_full','file_deleted');
  if (qa.symbolKeys.includes('partner_reconcile') && qa.symbolKeys.includes('boss_praise')) push('화해×인정 → 승리 공유','partner_reconcile','boss_praise');
  if (qa.symbolKeys.includes('water') && qa.cues.emotions.some(e=>e.key==='emo_sadness')) push('물×슬픔 → 정화 루틴','water','emo:emo_sadness');
  if (qa.symbolKeys.includes('house') && qa.symbolKeys.includes('door_locked')) push('집×문 잠김 → 경계 재설정','house','door_locked');
  if (qa.symbolKeys.includes('heavy_rain') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) push('폭우×불안 → 저자극 루틴','heavy_rain','emo:emo_anxiety');
  if (qa.symbolKeys.includes('thunder_lightning')) push('천둥/번개 → 통찰 캡처');
  if (qa.symbolKeys.includes('fog')) {
    const hasAnx = qa.cues.emotions.some(e=>e.key==='emo_anxiety');
    const hasYellow = qa.cues.colors.some(c=>c.key==='color_yellow');
    if (hasAnx) push('안개×불안/주의 → 가시성 높이기','fog','emo:emo_anxiety');
    else if (hasYellow) push('안개×불안/주의 → 가시성 높이기','fog','color:color_yellow');
    else push('안개×불안/주의 → 가시성 높이기');
  }
  if (qa.symbolKeys.includes('subway_crowd') && qa.cues.emotions.some(e=>e.key==='emo_anxiety')) push('지하철 혼잡×불안 → 출퇴근 버퍼');
  if (qa.symbolKeys.includes('passport_lost') && qa.symbolKeys.includes('phone_dead')) push('여권×폰 방전 → 비상 연락','passport_lost','phone_dead');
  if (qa.symbolKeys.includes('wallet_lost') && qa.symbolKeys.includes('alarm_missed')) push('지갑×알람 미스 → 결제/리마인더','wallet_lost','alarm_missed');
  if (qa.symbolKeys.includes('exam') && qa.cues.colors.some(c=>c.key==='color_yellow')) push('시험×노란불 → 체크리스트 점검');
  if (qa.symbolKeys.includes('falling') && qa.cues.emotions.some(e=>e.key==='emo_fear')) push('추락×두려움 → 사후 안정화');

  const symN = qa.symbolKeys.length;
  const cueN = qa.cues.emotions.length + qa.cues.colors.length;
  const dists = items.map(r=> r.dist).filter((n)=> typeof n === 'number') as number[];
  const minD = dists.length ? Math.min(...dists) : undefined;
  const gains = getProxGains();
  const proxBoost = minD !== undefined ? (minD <= 10 ? gains.close : (minD <= 20 ? gains.mid : 0)) : 0;
  let confidence = Math.max(0.2, Math.min(1, 0.15*symN + 0.1*cueN + Math.min(0.3, 0.08*items.length) + proxBoost));
  if (ns.lowInfo) {
    items.push({ text: '저정보 입력: 이모지/반복/무의미 토큰 다수' });
    confidence = Math.max(0.2, confidence * 0.85);
  }

  // 대안: 심볼이 적으면 공통 고빈도 상징 제안(간단)
  const alternatives: string[] = [];
  if (symN <= 1) alternatives.push('집/방', '물/바다', '길 잃음');

  const ordered = items.slice().sort((a,b)=> {
    const ad = a.dist ?? Number.POSITIVE_INFINITY;
    const bd = b.dist ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  }).map(r=> r.text);

  // Weak negation penalty: if pre-negation tokens appear near kept symbols, slightly reduce confidence
  try {
    const negTokens = getNegTokens();
    const win = getNegWindow();
    const winB = Math.max(4, Math.floor(win*0.66));
    const negPositions: number[] = [];
    for (const tok of negTokens) {
      const re = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
      let m: RegExpExecArray | null; while ((m = re.exec(norm)) !== null) negPositions.push(m.index);
    }
    function hasPreNegAround(posStart: number): boolean {
      for (const np of negPositions) { if (np < posStart && (posStart - np) <= winB) return true; }
      return false;
    }
    let weak = 0;
    for (const k of qa.symbolKeys) {
      const cand = toCands(k as any);
      for (const c of cand) {
        const positions = findAll(norm, c);
        if (positions.some(p => hasPreNegAround(p))) { weak++; break; }
      }
    }
    if (weak > 0) {
      const { per, max } = getWeakNegPenalty();
      confidence = Math.max(0.2, confidence - Math.min(max, per * weak));
    }
  } catch {}

  return { matchedSymbols: qa.symbolKeys, rules: ordered, confidence: Math.round(confidence*100)/100, alternatives };
}

// ── Low-info/noise detector ───────────────────────────
export function noiseStats(text: string): { emoji: number; repeats: number; nonWordRatio: number; lowInfo: boolean } {
  const t = (text || '').normalize('NFKC');
  const len = t.length || 1;
  const emoji = (t.match(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu) || []).length;
  const nonWord = (t.match(/[^\p{L}\p{N}\s]/gu) || []).length;
  const nonWordRatio = nonWord / len;
  let repeats = 0;
  t.replace(/(.)\1{2,}/g, (m) => { repeats += m.length; return m; });
  const repRatio = repeats / len;
  const letters = (t.match(/[\p{L}\p{N}]/gu) || []).length;
  const letterRatio = letters / len;
  const lowInfo = (len < 10) || (emoji >= 2 && letterRatio < 0.4) || (repRatio > 0.3) || (nonWordRatio > 0.5);
  return { emoji, repeats, nonWordRatio, lowInfo };
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
const serverAliasesTTL = 60_000; // 60s
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

// ── 동적 조언 생성 시스템 (새로 추가) ─────────────────────────────────

// 상황별 맞춤 조언 생성
function generateContextualAdvice(symbolKeys: string[], cues: { colors: Cue[]; emotions: Cue[] }, text: string): string[] {
  const advice: string[] = [];
  
  // 관계 문제 상황
  const relationshipSymbols = symbolKeys.filter(k => 
    ['partner', 'ex', 'breakup', 'jealousy', 'mother', 'father', 'friend'].some(rel => k.includes(rel))
  );
  if (relationshipSymbols.length >= 1) {
    if (symbolKeys.includes('breakup') || symbolKeys.includes('partner_breakup')) {
      advice.push("관계 종료의 아픔: 3단계 애도(인정→감정표현→새로운 루틴) 중 오늘 한 단계를 10분 실행하세요.");
    }
    if (symbolKeys.includes('jealousy') || symbolKeys.includes('jealousy_scene')) {
      advice.push("질투 감정은 내면의 불안정 신호. 자존감 회복 활동 1가지를 지금 바로 시작하세요.");
    }
    if (symbolKeys.some(k => k.includes('mother')) || symbolKeys.some(k => k.includes('father'))) {
      advice.push("가족 관계 이슈: 경계 설정과 자율성 확보를 위한 작은 실천 1개를 오늘 시도하세요.");
    }
  }

  // 직장/학업 스트레스 상황  
  const workSymbols = symbolKeys.filter(k =>
    ['exam', 'boss', 'coworker', 'presentation', 'meeting', 'deadline'].some(work => k.includes(work))
  );
  if (workSymbols.length >= 1) {
    if (symbolKeys.includes('exam') || symbolKeys.includes('test')) {
      advice.push("시험 불안: 가장 약한 부분 1개를 15분 집중 복습하고 자신감 회복 문구를 3번 반복하세요.");
    }
    if (symbolKeys.some(k => k.includes('boss'))) {
      advice.push("상사 관계 스트레스: 피드백을 건설적으로 받아들이되, 자신의 가치를 재확인하는 시간을 가지세요.");
    }
    if (symbolKeys.includes('presentation') || symbolKeys.includes('speech')) {
      advice.push("발표 불안: 핵심 메시지 3줄로 요약하고 거울 앞에서 1분 연습해보세요.");
    }
  }

  // 건강/신체 관련 상황
  const healthSymbols = symbolKeys.filter(k =>
    ['teeth', 'hair', 'blood', 'pain', 'illness', 'hospital', 'doctor'].some(health => k.includes(health))
  );
  if (healthSymbols.length >= 1) {
    if (symbolKeys.includes('teeth')) {
      advice.push("치아 상징은 자신감과 연결됩니다. 외모 관리나 자기표현 능력 향상에 오늘 10분 투자하세요.");
    }
    if (symbolKeys.includes('blood') || symbolKeys.some(k => k.includes('pain'))) {
      advice.push("신체적 고통 상징: 과로나 스트레스 요인을 점검하고 즉시 휴식을 취하세요.");
    }
    if (symbolKeys.includes('hospital') || symbolKeys.includes('doctor')) {
      advice.push("의료 관련 불안: 궁금한 점을 미리 정리하고 신뢰할 만한 의견을 구하세요.");
    }
  }

  // 변화/전환 상황
  const transformSymbols = symbolKeys.filter(k =>
    ['death', 'birth', 'wedding', 'moving', 'graduation', 'job_change'].some(trans => k.includes(trans))
  );
  if (transformSymbols.length >= 1) {
    if (symbolKeys.includes('death') || symbolKeys.includes('funeral')) {
      advice.push("죽음 상징은 새로운 시작을 의미합니다. 과거에 매달리지 말고 변화를 받아들일 준비를 하세요.");
    }
    if (symbolKeys.includes('wedding') || symbolKeys.includes('marriage')) {
      advice.push("결혼/약속 상징: 관계에서의 책임감과 헌신에 대해 진지하게 성찰해보세요.");
    }
    if (symbolKeys.includes('moving') || symbolKeys.includes('new_house')) {
      advice.push("이주/이동 상징: 환경 변화에 대한 준비와 적응 전략을 구체적으로 세워보세요.");
    }
  }

  // 두려움/불안 상황
  if (cues.emotions.some(e => e.key === 'emo_fear') || cues.emotions.some(e => e.key === 'emo_anxiety')) {
    if (symbolKeys.includes('falling') || symbolKeys.includes('drowning')) {
      advice.push("추락/익사 꿈은 통제력 상실 불안을 나타냅니다. 작은 성취 1개로 통제감을 즉시 회복하세요.");
    }
    if (symbolKeys.includes('chase') || symbolKeys.includes('escape')) {
      advice.push("쫓김/도망 꿈: 회피하고 있는 문제를 직면할 용기를 내세요. 가장 작은 첫 걸음부터 시작하세요.");
    }
    if (symbolKeys.includes('monster') || symbolKeys.includes('ghost')) {
      advice.push("괴물/유령은 억압된 두려움의 상징입니다. 무서워하는 것의 실체를 정확히 파악하고 대처법을 찾으세요.");
    }
  }

  return advice;
}

// 감정-색상 조합별 특별 조언
function generateCombinedAdvice(emotions: Cue[], colors: Cue[], symbolKeys: string[]): string[] {
  const advice: string[] = [];
  const emotionKeys = emotions.map(e => e.key);
  const colorKeys = colors.map(c => c.key);

  // 불안 + 색상 조합
  if (emotionKeys.includes('emo_anxiety')) {
    if (colorKeys.includes('color_red')) {
      advice.push("불안×빨간색: 감정이 격해져 있습니다. 즉시 심호흡 10회로 진정시키고 충동적 결정을 피하세요.");
    }
    if (colorKeys.includes('color_black')) {
      advice.push("불안×검은색: 깊은 우울감이 감지됩니다. 빛과 움직임이 있는 환경으로 즉시 이동하세요.");
    }
    if (colorKeys.includes('color_yellow')) {
      advice.push("불안×노란색: 주의집중 문제가 있습니다. 한 번에 한 가지만 집중하는 연습을 시작하세요.");
    }
  }

  // 슬픔 + 색상 조합
  if (emotionKeys.includes('emo_sadness')) {
    if (colorKeys.includes('color_blue')) {
      advice.push("슬픔×파란색: 깊은 정서적 정화가 필요합니다. 눈물을 허용하되 회복 활동도 병행하세요.");
    }
    if (colorKeys.includes('color_gray')) {
      advice.push("슬픔×회색: 무기력감이 커져 있습니다. 작은 성취감을 줄 수 있는 활동 1가지를 지금 실행하세요.");
    }
    if (colorKeys.includes('color_green')) {
      advice.push("슬픔×초록색: 치유와 회복의 신호입니다. 자연 속에서 10분 머물며 재생 에너지를 얻으세요.");
    }
  }

  // 기쁨 + 색상 조합
  if (emotionKeys.includes('emo_joy')) {
    if (colorKeys.includes('color_yellow')) {
      advice.push("기쁨×노란색: 최고의 에너지 상태입니다. 이 순간을 기록하고 다른 사람과 기쁨을 나누세요.");
    }
    if (colorKeys.includes('color_pink')) {
      advice.push("기쁨×분홍색: 사랑과 연결의 에너지가 강합니다. 소중한 사람에게 감정을 표현하세요.");
    }
  }

  // 분노 + 색상 조합
  if (emotionKeys.includes('emo_anger')) {
    if (colorKeys.includes('color_red')) {
      advice.push("분노×빨간색: 강한 화가 감지됩니다. 물리적 운동으로 에너지를 건설적으로 방출하세요.");
    }
    if (colorKeys.includes('color_black')) {
      advice.push("분노×검은색: 억압된 화가 쌓여 있습니다. 안전한 공간에서 감정을 표출하고 근본 원인을 찾으세요.");
    }
  }

  // 특별한 색상 조합
  if (colorKeys.includes('color_purple')) {
    advice.push("보라색 에너지: 직관과 영성이 강화된 상태입니다. 창조적 활동이나 명상으로 통찰을 깊게 하세요.");
  }

  // 상황별 추가 조언
  if (symbolKeys.includes('water') && emotionKeys.includes('emo_sadness')) {
    advice.push("물×슬픔: 정화와 흐름의 시간입니다. 목욕이나 샤워로 몸과 마음을 씻어내세요.");
  }

  if (symbolKeys.includes('fire') && emotionKeys.includes('emo_anger')) {
    advice.push("불×분노: 강한 변화 에너지입니다. 파괴적 충동을 창조적 행동으로 전환하세요.");
  }

  return advice;
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
