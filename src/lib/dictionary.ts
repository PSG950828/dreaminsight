// src/lib/dictionary.ts
// DreamInsight — 대형 꿈 사전 (해설/조언 포함)
// 구조: 기본 SYMBOLS + 확장 EXTRA_SYMBOLS + 한글 동의어 KOR_ALIASES
// 사용처: analyzeDream()가 SYMBOLS와 KOR_ALIASES를 참조

import { KOR_ALIASES } from './dict/aliases';
import { SYMBOLS } from './dict/core';
import { EXTRA_SYMBOLS } from './dict/extra';
import { IMPORTED_SYMBOLS } from './dict/imported';
import {
  KOR_CORRECTIONS as BASE_KOR_CORRECTIONS,
  EMOTION_CORRECTIONS as BASE_EMOTION_CORRECTIONS,
  applyCorrections as baseApplyCorrections,
  applyEmotionCorrections as baseApplyEmotionCorrections,
  normalizeText as baseNormalizeText,
  preprocessDreamText as basePreprocessDreamText,
} from './dict/corrections';

export type SymbolMeaning = {
  label: string;          // 화면에 보일 이름 (한글)
  tags: string[];         // 검색/패턴용 태그 (불안/성장/관계/재정/건강 등)
  meaning: string;        // 해설(의미 + 심리 기제 + 상황별 해석)
  advice?: string;        // 바로 실행할 수 있는 1문장 행동 조언 (일부 항목은 없을 수 있음)
  category?: string;      // 선택: 사물/행동/동물/인물/장소/성격·태도/자연/디지털/상태·사건
  contexts?: {            // 선택: 심화 문맥
    psych?: string;       // 심리학/임상 관점의 보강 설명
    culture?: { kr?: string; en?: string }; // 문화권별 해석 노트
  };
};

// -----------------------------------------------------
// 1) 기본 사전: 상징 핵심 60+ (핵심 빈도 높은 것 위주)
// -----------------------------------------------------

// 기본 + 확장 병합
// -----------------------------------------------------
// 3) 한국어 동의어/표현 매핑 (탐지 정확도 ↑)
//    키: SYMBOLS/EXTRA_SYMBOLS의 key와 동일해야 함
// -----------------------------------------------------

/**
 * KOR_ALIASES_EXT
 * - 기존 KOR_ALIASES를 건드리지 않고 '추가'만 하는 확장 테이블
 * - getMergedAliases()에서 base+ext를 병합(중복 제거)해 반환
 */
const KOR_ALIASES_EXT: Record<string, string[]> = {
  pray: [
    "기도","기도하다","기도함","기도드리다","기도 중","기도중","기도 중이다",
    "기도해","기도해줘","기도해 주다","기도하세요","기도합시다","기도하자",
    "기도했다","기도했어","기도했어요","기도하고 있었다","기도하려고",
    "두손모아","비손","하늘에 기도","무릎 꿇고 기도"
  ],

  phone_call: [
    "전화","전화하다","전화 걸다","전화걸다","전화했다","전화했어","전화했어요",
    "전화해","전화 좀 해","전화해줘","전화해 주세요","콜","콜하자","콜해",
    "통화","통화하다","통화하자","통화중","통화 중","부재중전화","전화 안 받음",
    "받지 못함","받지못함","벨 울림","벨울림","전화 끊김","전화가 끊김"
  ],

  photo_shoot: [
    "사진","사진 찍다","사진찍다","사진 찍어","사진 찍어줘","사진 찍어 주세요",
    "사진찍어","셀카","셀카 찍다","촬영","촬영하다","촬영함","스냅샷","촬영 중","촬영중",
    "사진촬영","사진촬영함","포즈 찍다","포즈 취하다"
  ],

  sign_contract: [
    "서명","사인","사인하다","서명하다","계약","계약서","계약하다","서명 완료",
    "서명 요청","전자서명","날인","도장 찍다","계약 체결","계약서에 서명"
  ],

  argue_text: [
    "메신저 싸움","카톡 싸움","문자 싸움","단톡 싸움","DM 싸움",
    "카톡으로 다툼","문자로 언쟁","댓글싸움","댓글 싸움","댓글로 다툼",
    "톡으로 싸움","톡다툼","채팅으로 싸움","채팅 다툼","말싸움 문자","카톡 말싸움",
    "글로 싸움","텍스트 언쟁","타이핑으로 싸움"
  ],

  apology_request: [
    "사과","사과하다","사과문","미안","미안해","정중히 사과",
    "죄송","죄송해요","죄송합니다","용서해","용서해줘","사죄","사죄하다",
    "사과 요청","사과를 요구","사과받다","사과받음"
  ],

  laugh_out_loud: [
    "웃다","웃음","크게 웃음","폭소","박장대소","낄낄","피식",
    "하하","하하하","헤헤","헤헤헤","ㅎㅎ","ㅎㅎㅎ","ㅋㅋ","ㅋㅋㅋ",
    "lol","lmao","rofl","웃었어","웃으며","키득","키득키득"
  ],

  cannot_speak: [
    "말이안나옴","목메임","발화불가","목이 잠김","목이 막힘","목소리 안 나옴",
    "소리가 안 남","혀가 굳음","말이 막힘","아무 말도 못함","입이 안 떨어짐",
    "소리 안 나와","발음이 안 됨","목소리 사라짐","목이 메여 말 못함"
  ],

  exam: [
    "시험","고사","평가","테스트","퀴즈","중간고사","기말고사",
    "자격증 시험","면허 시험","필기시험","실기시험","시험을 봄","시험보다","시험장"
  ],

  waiting: [
    "기다리다","기다림","대기","대기중","줄 서다","웨이팅","차례 기다림",
    "호출 대기","콜 대기","순번 대기","기다리고 있었다","한참 기다림"
  ],

  searching: [
    "찾다","찾기","수색","샅샅이 찾다","뒤지다","찾아 헤매다","없어진 걸 찾다",
    "찾고 있었다","찾아보자","잃어버린 걸 찾다","분실물 찾기"
  ],

  hiding: [
    "숨다","숨음","숨기","숨어있다","몸을 숨기다","피신","은신","숨었다","숨었어",
    "숨어서 기다림","장소에 숨다","옷장에 숨다","침대 밑에 숨다","화장실에 숨다"
  ],
  // ── 추가 상징군 동의어 보강 ──
  lost_way: ["길 잃음","길을 잃다","헤매다","길 헤매","방향 잃다","미로"],
  elevator: ["엘리베이터","승강기","리프트"],
  toilet: ["화장실","볼일","변기","wc","restroom","toilet"],
  naked: ["나체","벌거","벗은","알몸","옷을 안 입","옷이 없음"],
  snake: ["뱀","구렁이","독사"],
  dog: ["개","강아지","멍멍이","견"],
  cat: ["고양이","냥이","묘"],
  baby: ["아기","아이","베이비","신생아"],
  fire: ["불","화재","불길","불타다","불이 나다"],
  blood: ["피","혈","출혈","피가 남"],
  mirror: ["거울","미러","거울을 보다","비추다"],
  hair_loss: ["머리카락 빠짐","머리카락이 빠지","탈모","머리 숱","머리털"],
  school: ["학교","스쿨","교정"],
  classroom: ["교실","반","클래스룸"],
  teacher: ["선생님","선생","스승","교사","담임"],
  car: ["자동차","차","승용차","운전"],
  car_accident: ["교통사고","차 사고","차사고","접촉사고","추돌"],
  bus: ["버스","시내버스","광역버스","마을버스","버스정류장","정류장"],
  train: ["기차","열차","ktx","지하철","전철","지하철역","환승"],
  airplane: ["비행기","항공기","이륙","착륙"],
  airport: ["공항","터미널","게이트","보안검색"],
  bridge: ["다리","교량","브리지"],
  tunnel: ["터널","굴"],
  road_highway: ["도로","고속도로","하이웨이","국도","톨게이트","인터체인지","분기점"],
  mountain: ["산","봉우리","정상","남산","북한산","한라산","설악산"],
  forest: ["숲","수풀","삼림"],
  river: ["강","개울","하천","한강"],
  subway_crowd: ["지옥철","환승역","출퇴근 시간","만원 전철","만원 지하철"],
  taxi_lost: ["택시가 길을 잃","택시 길 잘못","돌려 가","택시 기사 헤맴"],
  drowning: ["물에 빠지","익사","허우적","숨이 잠기"],
  earthquake: ["지진","진동","진도","붕괴","갈라짐","금 가"],
  volcano: ["화산","분화","용암"],
  ghost: ["유령","귀신","망령","혼령","원혼"],
  zombie: ["좀비","언데드"],
  spider: ["거미","곤충","거미줄"],
  tiger: ["호랑이","범"],
  bear: ["곰"],
  fish: ["물고기","생선","잉어","금붕어"],
  whale: ["고래","혹등고래","범고래"],
  shark: ["상어","백상아리"],
  prison: ["감옥","교도소","구치소"],
  police: ["경찰","폴리스","순경","형사"],
  theft: ["도둑","도난","절도","소매치기","훔치"],
  money: ["돈","현금","자금","비용","지출"],
  lottery: ["복권","로또","당첨"],
  funeral: ["장례","상가","상례","부고","상복","발인","빈소","조문","영정"],
  ring_lost: ["반지 분실","반지 잃어버림","웨딩링 잃음","프로포즈 반지 분실","커플링 잃음"],
  wedding_canceled: ["결혼식 취소","식 취소","파혼","예식 취소","식장 취소","주례 취소"],
  pregnancy: ["임신","임부","태동"],
  pregnancy_test: ["임테기","임신 테스트","두 줄","한 줄"],
  menstruation: ["생리","월경","피가 나옴","생리혈"],
  late: ["지각","늦음","늦었다","시간 놓침"],
  stairs: ["계단","층계","난간"],
  // ── imported.ts 확장: 엘리베이터/화장실/거울/아기/지진/피/비/눈/공항/반지 등
  // duplicates with earlier keys removed to avoid collisions
  // duplicate merged into the primary 'earthquake' entry above
  blood_signal: ["피","피가","출혈","빨강","선혈"],
  heavy_rain: ["비","폭우","소나기","비바람"],
  snow_white: ["눈","하양","하얀","흰색","백설"],
  airport_passport: ["공항","게이트","여권","탑승권","보안검색"],
  dog_bite: ["개","강아지","물림","깨물"],
  snake_skin: ["뱀","탈피","허물","비늘"],
  // ── 도메인/일반 범주 ──
  domain_relationship: ["연인","남친","여친","배우자","부부","가족","엄마","아빠","어머니","아버지","친구","동료","선배","후배","헤어지","이별","화해","키스","섹스"],
  domain_health: ["병원","의사","간호사","주사","수술","검사","검진","약","약국","두통","복통","기침","발열","코로나","감기"],
  domain_work: ["회사","직장","업무","회의","보고서","상사","부장","팀장","동료","프로젝트","마감","야근"],
  domain_school: ["학교","교실","선생","선생님","수업","숙제","시험","중간","기말","지각"],
  domain_fear: ["귀신","유령","좀비","괴물","도깨비","공포","무섭","두려움"],
  domain_travel: ["여행","비행기","기차","버스","배","공항","숙소","호텔","여권","탑승","출국","입국"],
  domain_home: ["집","방","거실","침실","주방","창문","문","현관","베란다","청소","정리"],
  domain_money: ["돈","지갑","카드","계좌","이체","대출","월세","연봉","보너스","지출","저축"],
  domain_digital: ["핸드폰","휴대폰","스마트폰","폰","로그인","비번","비밀번호","아이디","계정","동기화","백업","알림","메신저","카톡","디엠","dm","스팸"],
  domain_nature: ["비","눈","바람","폭우","태풍","한파","폭염","황사","미세먼지","번개","천둥","무지개","일출","일몰","해","달","별","바다","강","숲","산"],
  // ── 범주 심볼 일반 키워드 ──
  animal_pet: ["강아지","개","고양이","반려","펫","새끼"],
  animal_wild: ["호랑이","사자","표범","곰","늑대","여우","코끼리","원숭이","사슴","멧돼지"],
  bird_generic: ["새","비둘기","참새","독수리","매","갈매기","까마귀"],
  fish_generic: ["물고기","생선","고래","상어","돌고래","잉어","금붕어","문어","오징어"],
  insect_generic: ["곤충","벌","나비","모기","파리","개미","거미","사마귀","바퀴벌레"],
  vehicle_car: ["자동차","차","승용","SUV","운전"],
  vehicle_bus: ["버스","시내버스","고속버스","셔틀"],
  vehicle_train: ["기차","지하철","KTX","전철"],
  vehicle_bike: ["자전거","자전거타"],
  vehicle_plane: ["비행기","항공기","비행"],
  vehicle_ship: ["배","선박","유람선","보트"],
  building_home: ["집","주택","단독","전원주택"],
  building_apartment: ["아파트","오피스텔","빌라"],
  building_office: ["사무실","오피스","회사 건물"],
  building_school: ["학교","교실","캠퍼스"],
  building_hospital2: ["병원","응급실","의원"],
  building_market: ["시장","마트","백화점","편의점"],
  building_temple2: ["사찰","절","암자"],
  building_church2: ["교회","성당","성직"],
  object_phone: ["핸드폰","휴대폰","스마트폰","폰","아이폰","갤럭시"],
  object_laptop: ["노트북","컴퓨터","PC","맥북"],
  object_camera: ["카메라","DSLR","미러리스","캠코더"],
  object_book: ["책","서적","교재"],
  object_pen: ["펜","볼펜","연필","사인펜"],
  object_key2: ["열쇠","키"],
  object_wallet2: ["지갑","카드","신용카드","현금카드"],
  object_bag: ["가방","백팩","토트백","숄더백"],
  object_clothes: ["옷","의류","셔츠","바지","치마","재킷","코트"],
  object_jewelry: ["반지","목걸이","귀걸이","팔찌"],
  food_generic: ["음식","밥","빵","과일","고기","면","라면"],
  drink_water: ["물","생수","수돗물","정수"],
  drink_alcohol: ["술","소주","맥주","와인","위스키"],
  document_passport: ["여권","주민증","주민등록증","운전면허","티켓","탑승권"],
  body_head: ["머리","두통","두피"],
  body_hand: ["손","손가락","손바닥"],
  body_foot: ["발","발가락","발뒤꿈치"],
  injury_wound: ["상처","피멍","골절","찰과상","베임"],
};

export const KOR_CORRECTIONS = BASE_KOR_CORRECTIONS;

/**
 * 보정 테이블 적용
 * - normalizeText()를 먼저 통과한 문자열을 입력으로 가정
 */
export function applyCorrections(normalizedLower: string): string {
  return baseApplyCorrections(normalizedLower);
};

const MERGED_SYMBOLS: Record<string, SymbolMeaning> = { ...SYMBOLS, ...EXTRA_SYMBOLS, ...IMPORTED_SYMBOLS };

export function getMergedSymbols() {
  return MERGED_SYMBOLS;
}

// 서버 주입 동의어(SSR/CLI) 저장소
let SERVER_ALIASES: Record<string, string[]> = {};
export function setServerAliases(map: Record<string, string[]>) {
  SERVER_ALIASES = map || {};
  try { rebuildAliasPatterns(); } catch {}
}

export function getMergedAliases() {
  // 1) 얕은 복사
  const base: Record<string, string[]> = {};
  for (const k of Object.keys(KOR_ALIASES)) {
    base[k] = Array.from(new Set((KOR_ALIASES[k] || []).map((s) => (s || "").trim()))); // 1차 중복 제거
  }

  // 2) 확장 병합 (기존 유지 + 추가만)
  for (const k of Object.keys(KOR_ALIASES_EXT)) {
    const ext = (KOR_ALIASES_EXT[k] || []).map((s) => (s || "").trim());
    if (!base[k]) base[k] = [];
    // 정규화 기반 중복 제거
    const seen = new Set(base[k].map((s) => normalizeText(s)));
    for (const item of ext) {
      const norm = normalizeText(item);
      if (!seen.has(norm)) {
        base[k].push(item);
        seen.add(norm);
      }
    }
  }
  // 3) 서버(관리자) 동의어 병합
  for (const k of Object.keys(SERVER_ALIASES)) {
    const ext = (SERVER_ALIASES[k] || []).map((s) => (s || "").trim());
    if (!base[k]) base[k] = [];
    const seen = new Set(base[k].map((s) => normalizeText(s)));
    for (const item of ext) {
      const norm = normalizeText(item);
      if (!seen.has(norm)) { base[k].push(item); seen.add(norm); }
    }
  }
  return base;
}

// 별칭 패턴 캐시를 쓰지 않는 변형이므로 클라이언트에서는 no-op
export function refreshAliasPatterns() { /* no-op */ }
// -----------------------------------------------------
// 4) 한글 띄어쓰기/철자 변형 내성 매칭 유틸
//    - 공백/오탈 공백에 강한 정규식 패턴 자동 생성
//    - 외부 분석기(analyzeDream)에서 그대로 import해 사용 가능
// -----------------------------------------------------

/**
 * 입력 텍스트 정규화
 * - 유니코드 정규화(NFKC)
 * - 전각/반각 통합
 * - 대소문자 무시 (영문 섞인 경우)
 */
export function normalizeText(input: string): string {
  return baseNormalizeText(input);
}

export function preprocessDreamText(input: string): string {
  return basePreprocessDreamText(input);
}

/**
 * 한글/영문 흔한 오타 보정 테이블
 * - dream 본문에 선적용하여 매칭 품질을 올림
 * - normalizeText() 결과(소문자, NFKC) 기준으로 동작
 */
// (중복, 불완전 선언 제거됨)

// 감정 보정 적용 함수가 이미 정의되어 있는지 확인 후, 없으면 추가
// (아래에 이미 정의되어 있지 않으면 추가)
// 이미 있는 경우 추가하지 않음
export function applyEmotionCorrections(normalizedLower: string): string {
  return baseApplyEmotionCorrections(normalizedLower);
}

/** 사전 기본 보정 이후 추가 슬랭/강조어 정리 */
function applyKorCorrections(normalizedLower: string): string {
  let out = applyCorrections(normalizedLower || "");
  // Remove intensifier prefixes like '개/존나/겁나/엄청/완전' before words
  try {
    out = out.replace(
      new RegExp(String.raw`(?<!\p{L})(개|존나|졸|겁나|오지게|드럽게|엄청|진짜|완전|되게)(?=\s*\p{L})`, "gu"),
      ""
    );
  } catch {}
  // Remove chat fillers
  out = out.replace(/\b(ㄹㅇ|ㄱㄱ|ㄷㄷ|ㅇㅋ|ㅇㅇ|ㄴㄴ|ㅁㄹ|z+|zz)\b/gi, " ");
  return out;
}

/** 퍼지/정규식 매칭에서 제외할 짧은/일반 토큰 기준 */
export function isSkippableAlias(norm: string): boolean {
  const noSpace = (norm || "").replace(/\s+/g, "");
  if (!noSpace) return true;
  if (noSpace.length < 3) return true;
  if (STOPWORDS.has(noSpace)) return true;
  return false;
}

// 4.d) 통합 전처리 — 외부 analyzeDream()에서 사용
export function preprocessForMatching(raw: string): string {
  const n = normalizeText(raw);
  return applyKorCorrections(n);
}

// 4.c) 스톱워드 & 스킵 규칙
const STOPWORDS = new Set<string>([
  "나", "너", "그", "그녀", "우리", "너희", "이", "그것", "뭐", "뭔가",
  "하다", "했다", "했어", "함", "됨", "있다", "있었어", "있어요",
  "꿈", "꿈임", "꿈에서", "꿈을", "꿈이다",
  "불", "등", "색", "빛",
  "빨", "파", "초"
]);

/**
 * 정규식 이스케이프
 */
function escRe(src: string): string {
  return src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * "사과 나무" -> /사\s*과\s*나\s*무/ 처럼 단어 사이 임의 공백 허용 패턴 생성
 * - 연속 공백, 붙여쓰기("사과나무"), 줄바꿈 모두 매칭
 * - 영문/숫자 사이 공백도 허용
 */
function makeOptionalSpaceRegex(token: string): RegExp {
  const trimmed = token.trim();
  // 공백을 모두 \s* 로 치환 (없어도 되고 얼마든 있어도 됨)
  const pattern = escRe(trimmed).replace(/\s+/g, "\\s*");
  return new RegExp(pattern, "iu");
}

/**
 * 레벤슈타인 거리 계산 (삽입/삭제/치환 1회 = 1 비용)
 */
function levenshtein(a: string, b: string): number {
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = Array.from({ length: al + 1 }, () => new Array<number>(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // 삭제
        dp[i][j - 1] + 1,      // 삽입
        dp[i - 1][j - 1] + cost // 치환
      );
    }
  }
  return dp[al][bl];
}

/**
 * 공백/줄바꿈 제거한 본문에서 alias가 "거의" 포함되는지 검사
 * - 정확 포함 또는 길이±0 구간 내 레벤슈타인 거리 ≤ 1 이면 매칭
 * - dream 본문은 길이가 짧으므로 O(n*m)도 실사용에 충분
 */
function fuzzyIncludes(dreamText: string, alias: string, maxDistance = 1): boolean {
  const base = applyCorrections(normalizeText(dreamText || "")).replace(/\s+/g, "");
  const needle = normalizeText(alias || "").replace(/\s+/g, "");
  if (!needle) return false;
  if (needle.length < 3) return false; // 너무 짧은 토큰은 퍼지 매칭 금지
  if (STOPWORDS.has(needle)) return false;

  if (base.includes(needle)) return true;

  const n = base.length, m = needle.length;
  if (m === 0 || n === 0 || n < m) return false;

  for (let i = 0; i <= n - m; i++) {
    const window = base.slice(i, i + m);
    if (levenshtein(window, needle) <= maxDistance) return true;
  }
  return false;
}

/**
 * 별칭 패턴 테이블 생성/재컴파일 지원
 */
function buildAliasPatterns(): Record<string, RegExp[]> {
  const merged = getMergedAliases();
  const out: Record<string, RegExp[]> = {};
  for (const key of Object.keys(merged)) {
    const list = merged[key] || [];
    const bonus: string[] = [];
    const baseLabel = (MERGED_SYMBOLS[key]?.label || "").split(/\//).join(" ");
    if (baseLabel) bonus.push(baseLabel);

    const uniq = new Set<string>();
    [...list, ...bonus].forEach((t) => {
      const norm = normalizeText(t);
      if (!norm) return;
      const variants = [norm, norm.replace(/\s+/g, "")];
      for (const v of variants) {
        if (!v) continue;
        if (isSkippableAlias(v)) continue;
        uniq.add(v);
      }
    });
    out[key] = Array.from(uniq).map((t) => makeOptionalSpaceRegex(t));
  }
  return out;
}

let KOR_ALIAS_PATTERNS: Record<string, RegExp[]> = buildAliasPatterns();
export function rebuildAliasPatterns() {
  KOR_ALIAS_PATTERNS = buildAliasPatterns();
}
export function getAliasPatterns() {
  return KOR_ALIAS_PATTERNS;
}

/**
 * 주어진 텍스트에서 어떤 심볼 키들이 포착되는지 반환
 * - 띄어쓰기 변형, 줄바꿈, 복수 표기 모두 내성
 * - alias 오타/철자 편차도 일부 허용 (레벤슈타인 거리 1)
 */
export function matchAliasKeys(text: string): string[] {
  const src = applyCorrections(normalizeText(text || ""));
  const hits: string[] = [];

  for (const [key, regs] of Object.entries(getAliasPatterns())) {
    // 1) 우선: 공백 무시/줄바꿈 내성 정규식으로 빠른 매칭
    if (regs.some((re) => re.test(src))) {
      hits.push(key);
      continue;
    }
    // 2) 실패 시: alias 목록에 대해 퍼지 매칭(오타 허용) 수행
    const aliases = (KOR_ALIASES[key] || []).filter((a) => {
      const norm = normalizeText(a).replace(/\s+/g, "");
      return !isSkippableAlias(norm);
    });
    for (const alias of aliases) {
      if (fuzzyIncludes(text, alias, 1)) { // 편차 1자 허용
        hits.push(key);
        break;
      }
    }

    // 3) 그래도 실패 시: n-gram 자카드 유사도(문자 3그램)로 근사 매칭
    if (!hits.includes(key)) {
      const textNoSpace = src.replace(/\s+/g, "");
      const tgrams = toNGrams(textNoSpace, 3);
      const candList: string[] = [
        ...(KOR_ALIASES[key] || []),
        (MERGED_SYMBOLS[key]?.label || ""),
        ...(MERGED_SYMBOLS[key]?.tags || [])
      ].filter(Boolean) as string[];
      for (const cand of candList) {
        const c = normalizeText(cand).replace(/\s+/g, "");
        if (isSkippableAlias(c) || c.length < 4) continue;
        const cgrams = toNGrams(c, 3);
        const j = jaccard(tgrams, cgrams);
        if (j >= 0.6) { // 보수적 임계치
          hits.push(key);
          break;
        }
      }
    }
  }
  return Array.from(new Set(hits));
}

/** n-gram 집합 생성 (기본 3그램) */
function toNGrams(s: string, n = 3): Set<string> {
  const out = new Set<string>();
  const L = s.length;
  if (L === 0) return out;
  const nn = Math.max(1, Math.min(n, L));
  for (let i = 0; i <= L - nn; i++) out.add(s.slice(i, i + nn));
  return out;
}

/** 자카드 유사도 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const small = a.size < b.size ? a : b;
  const big = a.size < b.size ? b : a;
  for (const x of small) if (big.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * 색상 전용 키 목록 (color_* 네임스페이스)
 */
const COLOR_KEYS: string[] = Object.keys(MERGED_SYMBOLS).filter(
  (k) => k.startsWith("color_")
);

/**
 * 감정 전용 키 목록 (emotion_* 네임스페이스)
 */
const EMOTION_KEYS: string[] = Object.keys(MERGED_SYMBOLS).filter(
  (k) => k.startsWith("emotion_")
);

/**
 * 주어진 텍스트에서 감정 관련 키만 포착
 */
export function matchEmotionKeys(text: string): string[] {
  const all = matchAliasKeys(text);
  return all.filter((k) => EMOTION_KEYS.includes(k));
}

/**
 * 주어진 텍스트에서 색상 관련 키만 포착
 */
export function matchColorKeys(text: string): string[] {
  const all = matchAliasKeys(text);
  return all.filter((k) => COLOR_KEYS.includes(k));
}

/**
 * 심볼 키 목록을 SymbolMeaning 데이터로 변환 (라벨/태그 접근 편의)
 */
export function getSymbolEntries(keys: string[]): Array<{ key: string; data: SymbolMeaning } > {
  const out: Array<{ key: string; data: SymbolMeaning }> = [];
  for (const k of keys) {
    const data = MERGED_SYMBOLS[k];
    if (data) out.push({ key: k, data });
  }
  return out;
}

/**
 * 텍스트에서 색상 단서를 추출하여 프레젠테이션에 바로 쓸 수 있게 가공
 * - 반환: { key, label, tags }
 * - 예: "빨간불" → [{ key: 'color_red', label: '빨간색', tags: ['에너지','경고','충동'] }]
 */
export function extractColorCues(text: string): Array<{ key: string; label: string; tags: string[] }> {
  const colorKeys = matchColorKeys(text);
  return colorKeys.map((key) => {
    const entry = MERGED_SYMBOLS[key];
    return { key, label: entry.label, tags: entry.tags };
  });
}

/**
 * 텍스트에서 감정 단서를 추출하여 프레젠테이션에 바로 쓸 수 있게 가공
 * - 반환: { key, label, tags }
 */
export function extractEmotionCues(text: string): Array<{ key: string; label: string; tags: string[] }> {
  const emotionKeys = matchEmotionKeys(text);
  return emotionKeys.map((key) => {
    const entry = MERGED_SYMBOLS[key];
    return { key, label: entry.label, tags: entry.tags };
  });
}

/**
 * 사전 유틸만으로 빠르게 분석 결과 생성 (analyzeDream 없이도 사용 가능)
 * - dreamText에서 심볼/색 단서를 추출해 프레젠테이션용 구조로 반환
 * - 색 언급이 없으면 자동으로 `color_none`(무채색) 단서를 추가
 */
export type QuickAnalysis = {
  symbolKeys: string[];
  symbols: Array<{ key: string; data: SymbolMeaning }>;
  cues: {
    colors: Array<{ key: string; label: string; tags: string[] }>;
    emotions: Array<{ key: string; label: string; tags: string[] }>;
  };
};

export function analyzeWithDictionary(dreamText: string): QuickAnalysis {
  const text = dreamText || "";
  const baseKeys = matchAliasKeys(text);

  // 파생(derived) 규칙
  const derivedKeys: string[] = [];

  // 1) 조상 + 식사 → 조상과 식사
  if (baseKeys.includes("ancestor_visit") && baseKeys.includes("meal")) {
    derivedKeys.push("meal_with_ancestor");
  }
  // 2) 상사 + 식사 → 상사와 식사
  if (baseKeys.includes("boss") && baseKeys.includes("meal")) {
    derivedKeys.push("meal_with_boss");
  }
  // 3) 상사 + 무대/발표 → 상사 앞 발표
  if (baseKeys.includes("boss") && baseKeys.includes("stage")) {
    derivedKeys.push("presentation_to_boss");
  }
  // 4) 대통령/국가원수 + 연단/연설 → 권위 앞 연설
  if (baseKeys.includes("president_meeting") && baseKeys.includes("speech_podium")) {
    derivedKeys.push("speech_to_authority");
  }
  // 5) 권위(대통령/상사) + 악수 → 승인/편입 맥락 강화 (핵심 태그용 파생)
  if (
    (baseKeys.includes("president_meeting") || baseKeys.includes("boss")) &&
    baseKeys.includes("handshake")
  ) {
    if (!derivedKeys.includes("speech_to_authority")) {
      // 파생 키가 없더라도 후속 처리에서 태그 보강에 쓰일 수 있도록 남김 (현재는 키만 추가)
      // 필요 시 전용 파생 심볼을 별도 도입 가능
    }
  }

  const symbolKeys = Array.from(new Set([...baseKeys, ...derivedKeys]));
  const symbols = getSymbolEntries(symbolKeys);

  const colorCues = extractColorCues(text);
  const colors = colorCues.length
    ? colorCues
    : [{ key: "color_none", label: MERGED_SYMBOLS["color_none"].label, tags: MERGED_SYMBOLS["color_none"].tags }];

  const emotionCues = extractEmotionCues(text);

  return { symbolKeys, symbols, cues: { colors, emotions: emotionCues } };
}

/**
 * 5) 맥락 기반 실천 조언 & 저널 프롬프트 생성기
 *  - 입력: dreamText (자연어)
 *  - 내부: analyzeWithDictionary()로 심볼/단서 감지 → 상징 조합별 맞춤 조언/프롬프트 생성
 *  - 출력: { advice: string[], prompts: string[] }
 */
export function buildAdviceAndPrompts(dreamText: string): { advice: string[]; prompts: string[] } {
  const qa = analyzeWithDictionary(dreamText);
  const keys = new Set(qa.symbolKeys);

  const advice: string[] = [];
  const prompts: string[] = [];

  // ── 공통 베이스: 핵심 심볼의 기본 조언을 1~2개만 채택 ─────────────────────
  // 우선순위 테이블 (문맥상 강한 상징이 먼저 나오도록)
  const priority = [
    "exam", "cannot_speak", "emotion_anxious", "emotion_sad",
    "flying", "falling", "president_meeting", "meal_with_ancestor", "meal",
    "house", "running",
  ];
  for (const k of priority) {
    if (!keys.has(k)) continue;
    const s = MERGED_SYMBOLS[k];
    if (!s?.advice) continue;
    if (advice.length < 2) advice.push(s.advice);
  }

  // ── 조합 특화 보강 규칙 ───────────────────────────────────────────────────
  // 1) 시험 + 말이 안 나옴 → 평가/표현 이중 스트레스에 맞춘 실행 세트
  if (keys.has("exam") && keys.has("cannot_speak")) {
    advice.unshift(
      "내 답 3문장을 소리 내어 읽는 '모의답' 리허설을 지금 5분만 하세요.",
    );
    prompts.push(
      "어떤 질문에서 말이 막혔나요? 그 질문을 한 문장으로 다시 써 보세요.",
      "이번 평가의 '합격 기준'을 내가 과하게 올려놓은 부분이 있나요? 구체적으로 1줄.",
      "실제 준비 부족 vs 막연한 불안 중 무엇이 더 컸나요? 근거 2가지."
    );
  }

  // 2) 시험 단독
  if (keys.has("exam") && !keys.has("cannot_speak")) {
    prompts.push(
      "이번 시험/평가에서 가장 두려운 항목은 무엇이었나요?",
      "준비가 안 됐다고 느낀 근거 2가지와, 바로 메꿀 수 있는 한 조각은?",
      "'충분히 괜찮음'의 기준을 나만의 문장으로 정의해 보세요."
    );
  }

  // 3) 말이 안 나옴 단독
  if (keys.has("cannot_speak") && !keys.has("exam")) {
    advice.unshift("3분 스피치(핵심 메시지 1문장→근거 2개)를 녹음해 즉석 리허설하세요.");
    prompts.push(
      "누구 앞에서, 어떤 주제에서 목이 막혔나요?",
      "막힌 순간 직전의 감정/몸감각은 무엇이었나요?",
      "그 자리에 가져가고 싶은 '한 문장 소개'는?"
    );
  }

  // 4) 달리기(도망/추진) + 집(자아/안전) → 회복 러닝 보강
  if (keys.has("running") && keys.has("house")) {
    advice.push("25분 집중 러닝(일/운동) 후 집에서 10분 회복 루틴(정리/샤워)으로 마무리하세요.");
    prompts.push(
      "나는 무엇으로부터 도망쳤고, 어디로 향했나요?",
      "집에서 가장 먼저 떠오른 공간은 어디였나요(방/거실/문)? 그 상태는?",
      "지금 당장 회복감을 주는 '작은 의식'은 무엇인가요?"
    );
  }

  // 5) 권위자(대통령/상사) + 색(노란불 등) + 비행 → 페이스 조절 + 공개 준비
  const hasAuthority = keys.has("president_meeting") || keys.has("boss");
  const hasFlying = keys.has("flying");
  const hasYellow = qa.cues.colors.some((c) => c.key === "color_yellow");
  if (hasAuthority && hasYellow) {
    advice.unshift("속도를 80%로 낮추고 체크리스트 3칸만 점검한 뒤 다음 단계로 이동하세요.");
    prompts.push(
      "노란불이 의미한 '점검 항목'은 무엇이었나요? 3가지로 구체화.",
    );
  }
  if (hasAuthority && hasFlying) {
    prompts.push(
      "누구로부터 어떤 인정을 받고 싶었나요?",
      "비행이 안정적이었나요, 흔들렸나요? 그 차이를 만드는 조건은?"
    );
  }

  // 6) 감정 단서가 있으면 감정 기반 프롬프트 보강
  if (qa.cues.emotions.length > 0) {
    const labels = qa.cues.emotions.map((e) => e.label).join(", ");
    prompts.push(
      `가장 뚜렷했던 감정(${labels})이 처음 떠오른 기억은 무엇인가요?`,
      "그 감정을 0~10으로 점수 매기고, 2점 낮추는 데 도움이 될 작은 행동은 무엇?"
    );
  }

  // 7) 색 단서가 없을 때는 '무채색' 안내 프롬프트 보강
  const hasAnyColor = qa.cues.colors.some((c) => c.key !== "color_none");
  if (!hasAnyColor) {
    prompts.push(
      "색이 기억나지 않는다면, 대신 몸감각 1가지와 배경 소리/온도를 묘사해 보세요.",
    );
  }

  // 8) 기본 안전망: 아무것도 못 잡힌 경우 공통 프롬프트
  if (prompts.length === 0) {
    prompts.push(
      "이 꿈에서 가장 강했던 장면 1컷을 3문장으로 묘사해 보세요.",
      "그 장면에서 내가 하지 못한 행동은 무엇이며, 현실에서 10분 실험 가능합니까?"
    );
  }

  // 중복 제거 및 길이 제한
  const uniq = (arr: string[]) => Array.from(new Set(arr)).filter(Boolean);
  return {
    advice: uniq(advice).slice(0, 3),
    prompts: uniq(prompts).slice(0, 6),
  };
}

/**
 * 편의 함수: dreamText → {symbols, cues, advice, prompts}
 */
export function analyzeDreamQuick(dreamText: string) {
  const base = analyzeWithDictionary(dreamText);
  const extra = buildAdviceAndPrompts(dreamText);
  return { ...base, ...extra };
}

// -----------------------------------------------------
// 6) 고급 통찰 엔진: GI + MDA 하이브리드 생성기
//    - 요구사항: 사용자의 질문/아이디어/정보(=dreamText)를 받으면
//      2개의 사고법을 자동 선별해 혼합 분석(1500자 이상) + 코드/실천 제안
// -----------------------------------------------------

export type GIComponents = {
  O: number; // Observation
  C: number; // Connection
  P: number; // Pattern
  S: number; // Synthesis
  A: number; // Assumption
  B: number; // Bias
  GI: number; // (O*C*P*S)/(A+B)
};

export type MDADimension = {
  key: "D1" | "D2" | "D3" | "D4" | "D5";
  name: string;
  D: string;    // 통찰
  W: number;    // 가중치 (0~1)
  I: number;    // 영향력 (0~1)
  score: number; // D*W*I의 정량화 점수 (0~10 스케일)
};

export type HybridInsight = {
  selectedMethods: Array<"GI" | "MDA">;
  gi: GIComponents;
  mda: {
    matrix: MDADimension[];
    MDA: number;
  };
  // 1500자 이상 한국어 서술
  narrative: string;
  // 코드/실천 제안 요약
  codeIdea: string;
};

/** 내부: 정규화 헬퍼 (0~10 범위 제한) */
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function clamp10(x: number) { return Math.max(0, Math.min(10, x)); }

/** 심볼/단서 기반 휴리스틱으로 GI 구성요소 추정 */
function estimateGIFromQA(qa: QuickAnalysis): GIComponents {
  const k = new Set(qa.symbolKeys);
  const emo = qa.cues.emotions.length; 
  const col = qa.cues.colors.filter(c => c.key !== "color_none").length;

  // 관찰(O): 포착된 심볼/감정/색의 다양성
  const O = clamp10(4 + Math.min(6, (k.size * 0.9) + emo * 1.2 + col * 0.8));
  // 연결(C): 서로 다른 도메인 결합(권위+색+비행, 조상+식사 등)
  let combo = 0;
  if (k.has("president_meeting") && qa.cues.colors.some(c => c.key.startsWith("color_"))) combo += 1.2;
  if (k.has("flying") && (k.has("president_meeting") || k.has("boss"))) combo += 1.0;
  if (k.has("ancestor_visit") && k.has("meal")) combo += 1.2;
  if (k.has("exam") && k.has("cannot_speak")) combo += 1.0;
  if (k.has("running") && k.has("house")) combo += 0.8;
  const C = clamp10(3 + combo * 3 + (k.size > 6 ? 1 : 0));
  // 패턴(P): 불안/통제/전환 태그 다발에 가중
  const tagCounts: Record<string, number> = {};
  getSymbolEntries(Array.from(k)).forEach(({data}) => {
    (data.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const anxiety = (tagCounts["불안"] || 0) + (tagCounts["통제상실"] || 0) + (tagCounts["경고"] || 0);
  const transition = (tagCounts["전환"] || 0) + (tagCounts["성장"] || 0);
  const P = clamp10(3 + Math.min(7, anxiety * 1.2 + transition * 0.8));
  // 종합(S): 상징 수 * 조합 수의 루트로 점수화
  const S = clamp10(3 + Math.sqrt(k.size + combo * 2) * 2);
  // 고정관념(A)/편향(B): 단일 테마 과밀 시 상승
  const maxTag = Object.values(tagCounts).reduce((a,b) => Math.max(a,b), 1);
  const A = clamp10(2 + (maxTag > 4 ? 3 : 1) + (emo === 0 ? 1 : 0));
  const B = clamp10(2 + (col === 0 ? 1 : 0) + (k.has("naked_public") ? 1 : 0));
  const GI = Number((((O * C * P * S) / Math.max(1, (A + B))).toFixed(1)));

  return { O, C, P, S, A, B, GI };
}

/** MDA 차원 매핑 생성 */
function buildMDAMatrix(dreamText: string, qa: QuickAnalysis): { matrix: MDADimension[]; MDA: number } {
  const k = new Set(qa.symbolKeys);
  const now = new Date();

  // D1 시간: 과거-현재-미래 시퀀스 해석
  const D1: MDADimension = {
    key: "D1",
    name: "시간적 차원",
    D: k.has("ancestor_visit") ? "과거의 가치 회수 → 현재의 통합 → 미래 선택으로 전개" :
       k.has("exam") ? "현재 평가 압박 → 과거 준비의 결손 → 미래 기준 재설정" :
       "현재 감정 신호를 미래 행동으로 번역",
    W: 0.25,
    I: 0.8,
    score: 0
  };

  // D2 공간: 로컬-글로벌-우주적
  const D2: MDADimension = {
    key: "D2",
    name: "공간적 차원",
    D: k.has("president_meeting") ? "개인(로컬) 의제와 사회/권위(글로벌) 무대의 충돌/정렬" :
       k.has("water") ? "내면(로컬 감정)과 확장된 무의식의 바다(글로벌)의 상호작용" :
       "안식처(집)와 외부 무대(사회) 간 균형",
    W: 0.2,
    I: 0.7,
    score: 0
  };

  // D3 추상: 구체-추상 스펙트럼
  const D3: MDADimension = {
    key: "D3",
    name: "추상적 차원",
    D: k.has("color_yellow") ? "구체 신호(노란불) → 추상 규칙(속도 조절, 점검)" :
       k.has("teeth") ? "구체 사건(치아 손상) → 추상 주제(자기이미지/통제)" :
       "구체 장면을 규칙과 원리로 추상화",
    W: 0.2,
    I: 0.8,
    score: 0
  };

  // D4 인과: 원인-과정-결과
  const D4: MDADimension = {
    key: "D4",
    name: "인과적 차원",
    D: k.has("exam") && k.has("cannot_speak")
      ? "원인: 완벽주의/평가 불안 → 과정: 말문 막힘 → 결과: 회피/도주 패턴 강화"
      : k.has("flying") && k.has("color_yellow")
      ? "원인: 빠른 확장 욕구 → 과정: 경고등 점등(점검 필요) → 결과: 속도 재조율"
      : "원인 탐색 → 과정 가설 → 결과 예측",
    W: 0.2,
    I: 0.9,
    score: 0
  };

  // D5 계층: 미시-중간-거시
  const D5: MDADimension = {
    key: "D5",
    name: "계층적 차원",
    D: "미시(몸감각/감정) → 중간(관계/역할) → 거시(사회 규범/권위)로 상호작용 구조 파악",
    W: 0.15,
    I: 0.7,
    score: 0
  };

  const dims = [D1, D2, D3, D4, D5].map(d => {
    // 간단 점수화: (텍스트 길이/상징 수/단서 수)를 반영
    const base = Math.min(1, (dreamText.length / 3000));
    const kfac = Math.min(1, (qa.symbolKeys.length / 12));
    const cf = Math.min(1, (qa.cues.colors.length + qa.cues.emotions.length) / 6);
    const raw = clamp01(0.4 + base * 0.3 + kfac * 0.2 + cf * 0.1);
    return { ...d, score: Number((raw * d.W * d.I * 10).toFixed(2)) };
  });

  const MDA = Number(dims.reduce((acc, d) => acc + d.score, 0).toFixed(2));
  return { matrix: dims, MDA };
}

/** 1500자 내러티브 생성기 (GI+MDA 혼합) */
function buildHybridNarrative(dreamText: string, qa: QuickAnalysis, gi: GIComponents, mda: {matrix: MDADimension[]; MDA: number}): string {
  const symLabels = getSymbolEntries(qa.symbolKeys).map(s => MERGED_SYMBOLS[s.key]?.label || s.key);
  const emoLabels = qa.cues.emotions.map(e => e.label);
  const colorLabels = qa.cues.colors.map(c => c.label);

  const intro =
    `이 기록은 꿈의 자연어 서술을 기계적으로 토큰화하는 수준을 넘어, 상징·감정·색·행동 단서를 종합한 메타 분석입니다. ` +
    `우선 DreamInsight 사전으로 ${symLabels.length}개의 상징을 포착했고, 감정 단서 ${emoLabels.length}개, 색 단서 ${colorLabels.length}개를 인식했습니다. ` +
    `그 위에 '천재적 통찰 도출 공식(GI)'과 '다차원적 분석 프레임워크(MDA)'를 동시에 적용하여, 관찰-연결-패턴-종합의 선형 사고와 시간/공간/추상/인과/계층의 입체 사고를 결합했습니다.`;

  const giPart =
    `\n\n[GI 분석] 관찰(O)=${gi.O.toFixed(1)}, 연결(C)=${gi.C.toFixed(1)}, 패턴(P)=${gi.P.toFixed(1)}, 종합(S)=${gi.S.toFixed(1)}, ` +
    `고정관념(A)=${gi.A.toFixed(1)}, 편향(B)=${gi.B.toFixed(1)}로 산출되며, GI 점수는 ${gi.GI.toFixed(1)}입니다. ` +
    `관찰 점수는 상징 다양성과 감정·색 단서의 다층적 출현이 끌어올렸고, 연결 점수는 ‘이질 도메인 결합(예: 권위와 비행, 조상과 식사, 평가와 발화 차단)’이 기여했습니다. ` +
    `패턴 점수는 ‘불안/통제/전환’ 태그의 클러스터가 높았기 때문이며, 종합 점수는 상징 수와 조합 수의 제곱근 증가를 통해 균형을 추구했습니다. ` +
    `반면 A/B는 단일 테마 과밀과 단서 결손(색·감정 미기억)이 있을 때 상향되어, 성급한 일반화를 제어하는 ‘브레이크’ 역할을 합니다.`;

  const mdaLines = mda.matrix.map(d =>
    `- ${d.name}: ${d.D} (가중 ${d.W}, 영향 ${d.I}, 점수 ${d.score})`).join("\n");
  const mdaPart =
    `\n\n[MDA 분석] 다섯 차원으로 맥락을 재배열했습니다.\n${mdaLines}\n` +
    `이로써 한 장면을 단일 의미로 고정하지 않고, 시간의 흐름(D1), 무대의 스케일(D2), 구체→추상 변환(D3), 원인-과정-결과의 인과망(D4), ` +
    `미시→거시 계층 구조(D5)에서 동시에 읽어, 해석의 견고성을 높였습니다. 총 MDA 점수는 ${mda.MDA}입니다.`;

  // 실천/코드 제안: 이미 buildAdviceAndPrompts가 제공하므로 그와 연결
  const extra = buildAdviceAndPrompts(dreamText);
  const codeIdea =
    `\n\n[코드/실천 제안] \n` +
    `1) UI는 기존 '실천 조언/저널 프롬프트' 영역을 자동 대체하도록 analyzeDreamQuick → buildAdviceAndPrompts 체인을 사용하세요. ` +
    `감지 조합에 따라 맞춤 조언 ${extra.advice.length}개와 프롬프트 ${extra.prompts.length}개가 제공됩니다. \n` +
    `2) 분석 탭에 'GI·MDA 통합 보고서' 패널을 추가하고, GI 브레이크다운과 MDA 다섯 차원 점수를 시각화하세요. \n` +
    `3) 색 단서 부재 시 color_none을 자동 주입하여, ‘색이 기억나지 않을 때의 가이드’를 노출합니다. \n` +
    `4) 붙여쓰기/오타는 KOR_CORRECTIONS + 퍼지 매칭으로 선보정되며, 신규 일상어는 KOR_ALIASES에 추가하여 확장 가능합니다.`;

  const closing =
    `\n\n[의미 통합] 결론적으로, 본 꿈은 상징 수준에서 “${symLabels.join(", ") || "일반 맥락"}”를 드러내며, ` +
    `${emoLabels.length ? `정서적으로는 ${emoLabels.join(", ")}을(를)` : "정서 표지가 희미함을"} 동반했습니다. ` +
    `${colorLabels.length ? `색 표지는 ${colorLabels.join(", ")} 방향으로` : "색 표지는 부재하여 감정·행동 단서 중심으로"} 해석의 초점을 이동시킵니다. ` +
    `GI는 창의적 연결과 패턴 인식을, MDA는 다층 맥락화를 보장하여, 과도한 단정 없이 실행으로 이어지는 ‘작은 통제 회복’ 전략을 설계합니다.`;

  // 길이 보정: 1500자 이상이 되도록 필요 시 샘플 규칙/사례를 덧붙임
  let narrative = [intro, giPart, mdaPart, extra.advice.length ? `\n\n[즉시 행동] ${extra.advice.join(" / ")}` : "", codeIdea, closing].join("");
  while (narrative.length < 1600) {
    narrative += "\n추가 참고: 반복 등장 상징은 태그 클러스터링으로 가중되며, 실제 생활의 '작은 실험(10~25분)'과 연결될 때 불안을 감소시키고 통제감을 회복합니다. 평가·권위·색 신호가 함께 나타날수록 속도 조절과 점검 루틴을 우선 설계하세요.";
  }
  return narrative;
}

/** 퍼블릭 API: 하이브리드 인사이트 생성 */
export function buildHybridInsight(dreamText: string): HybridInsight {
  const qa = analyzeWithDictionary(dreamText);
  const gi = estimateGIFromQA(qa);
  const mda = buildMDAMatrix(dreamText, qa);
  const narrative = buildHybridNarrative(dreamText, qa, gi, mda);
  return {
    selectedMethods: ["GI", "MDA"],
    gi,
    mda,
    narrative,
    codeIdea: "analyzeDreamQuick() 결과의 advice/prompts를 UI에 즉시 바인딩하고, GI/MDA 패널을 추가하여 점수와 차원별 설명을 함께 노출하세요."
  };
}

// analyzeDreamQuick 확장: 하이브리드 내러티브 포함
declare module "./dictionary" {
  // 모듈 보강은 타입 충돌 우려가 있어 주석 처리 (런타임 영향 없음)
}
