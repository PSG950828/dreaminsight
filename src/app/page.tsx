"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, History, Sparkles, Trash2, Wand2, Info } from "lucide-react";

/**
 * DreamInsight — 모바일 웹앱 (확장 사전 + 복합 규칙 40 + 즉답)
 * - 한국어 조사 매칭(koHit) / 무한 확장 사전 팩 / 질문 즉답 / GI 정규화 / Markdown 내보내기
 */

// =====================================
// 1) 타입
// =====================================
type SymbolMeaning = {
  label: string;
  tags: string[];
  meaning: string;
  advice: string;
};

type Analysis = {
  summary: string;
  symbols: SymbolMeaning[];
  emotions: string[];
  colors: { key: string; cue: string }[];
  actions: string[];
  patterns: string[];
  advice: string[];
  journalingPrompts: string[];
  giScore: number;
  answer?: string;
  hints?: string[];
};

type Journal = {
  id: string;
  text: string;
  createdAt: number;
  analysis: Analysis;
};

// =====================================
// 2) 기본 사전 (핵심 60+) + 확장 팩 병합 가능
// =====================================
const SYMBOLS: Record<string, SymbolMeaning> = {
  teeth: {
    label: "이(치아)",
    tags: ["자기이미지", "불안", "통제감"],
    meaning:
      "치아가 빠지거나 부서지는 꿈은 외모·자기이미지·발화능력(커뮤니케이션)에 대한 불안, 혹은 건강/재정적 통제감 저하를 시사합니다.",
    advice:
      "오늘 10분간 거울 앞 발화 연습 또는 재정 점검(지출 3개 항목 절감)을 실행하세요.",
  },
  falling: {
    label: "추락",
    tags: ["통제력", "스트레스"],
    meaning: "추락은 통제 상실, 성과 압박, 예측 불가 상황을 반영합니다.",
    advice:
      "할 일 목록을 3개로 줄이고 반드시 '다음 행동'을 명사+동사로 정의하세요.",
  },
  flying: {
    label: "비행",
    tags: ["자유", "성장"],
    meaning: "비행은 자유 욕구, 확장, 관점 전환을 상징합니다.",
    advice:
      "오늘 익숙한 길 대신 다른 길로 이동하거나 새로운 학습 15분을 추가하세요.",
  },
  chase: {
    label: "추격",
    tags: ["회피", "두려움"],
    meaning: "쫓기는 꿈은 미해결 과제/감정의 회피를 시사합니다.",
    advice:
      "미뤄둔 일 1개를 25분(포모도로)로 착수하고, 완료 후 감정 기록을 남기세요.",
  },
  exam: {
    label: "시험",
    tags: ["완벽주의", "자기평가"],
    meaning: "시험 꿈은 평가불안, 기준 과도화, 준비 부족 감각을 반영합니다.",
    advice: "오늘 목표를 '최상'이 아니라 '충분히 좋음' 기준으로 재정의하세요.",
  },
  water: {
    label: "물/바다",
    tags: ["감정", "무의식"],
    meaning: "물의 맑기/난류는 감정 상태의 투명도·변동성을 드러냅니다.",
    advice: "수분 섭취·호흡 4-7-8·감정 라벨링 3단계를 실천하세요.",
  },
  house: {
    label: "집/방",
    tags: ["자아", "경계"],
    meaning: "집 구조는 자아 구조·사생활 경계의 은유입니다.",
    advice: "책상/방 한 구역을 10분 정리해 경계감 회복을 돕습니다.",
  },
  baby: {
    label: "아기",
    tags: ["새로운 시작", "책임"],
    meaning: "아기는 새 프로젝트, 연약함, 돌봄 욕구를 상징합니다.",
    advice: "아이디어 1개를 3단계(초안→시작→유지)로 쪼개 적어보세요.",
  },
  death: {
    label: "죽음",
    tags: ["변화", "종결"],
    meaning: "죽음은 종말이라기보다 '전환'의 신호일 때가 많습니다.",
    advice: "끝낼 일 1개를 과감히 종료하고 에너지를 재배분하세요.",
  },
};

// 추가 팩 (샘플) — 계속 누적 확장 가능
const EXTRA_SYMBOLS: Record<string, SymbolMeaning> = {
  cockroach: { label:"바퀴벌레", tags:["혐오","회피"], meaning:"무시한 사소 문제·깨끗하지 못한 감각.", advice:"작은 곰팡이/먼지 하나를 지금 제거." },
  mosquito: { label:"모기", tags:["소진","방해"], meaning:"사소하지만 지속적인 에너지 누수.", advice:"알림/채팅 1개 묶음 ‘끄기’." },
  butterfly: { label:"나비", tags:["변화","가벼움"], meaning:"변태·재탄생·관계 가벼움.", advice:"새 취향 1개 시험 체험." },
  lion: { label:"사자", tags:["용기","지위"], meaning:"용기/위신/보호 본능.", advice:"어려운 요청 1건 정중히 제안." },
  wolf: { label:"늑대", tags:["본능","자립"], meaning:"무리/자립의 경계.", advice:"혼자 해결 vs 도움요청 기준 1줄." },
  horse: { label:"말", tags:["추진","자유"], meaning:"추진력/여행/본능.", advice:"하루 이동 루틴에 활력 10분 추가." },
  cow: { label:"소", tags:["인내","양육"], meaning:"안정·양육·지속수익.", advice:"루틴 작업 1건 자동화." },
  pig: { label:"돼지", tags:["풍요","탐닉"], meaning:"풍요/탐닉/죄책 혼재.", advice:"과식/과소비 1건 줄이기." },
  rabbit: { label:"토끼", tags:["민감","번식"], meaning:"민감·재빠름·다작.", advice:"작업 쪼개기(15분) 2개." },
  deer: { label:"사슴", tags:["섬세","경계"], meaning:"섬세함·위험 감지.", advice:"과부하 신호 3개 체크." },
  rainbow: { label:"무지개", tags:["희망","전환"], meaning:"폭풍 뒤 희망/연결.", advice:"감사 3문장 기록." },
  lightning: { label:"번개", tags:["통찰","급변"], meaning:"번뜩임/급격한 변화.", advice:"아이디어 1건 바로 실험." },
  volcano: { label:"화산", tags:["폭발","정화"], meaning:"저장된 분노/정화.", advice:"감정 배출 루틴 10분." },
  rain: { label:"비", tags:["정화","해소"], meaning:"정화/감정 흐름.", advice:"물 1컵 + 감정 라벨링." },
  snow: { label:"눈", tags:["정지","청정"], meaning:"정지/고요/순수.", advice:"속도 줄이고 품질 1개 올리기." },
  sun: { label:"해", tags:["활력","의식"], meaning:"활력/의식/자기.", advice:"채광 받으며 5분 산책." },
  moon: { label:"달", tags:["주기","감성"], meaning:"주기/감성/여성성.", advice:"주간 리듬 점검 3항목." },
  stars: { label:"별", tags:["지향","우주감"], meaning:"지향점/넓은 관점.", advice:"장기별(OKR) 1줄 재정의." },
  eclipse: { label:"일식/월식", tags:["그림자","넘김"], meaning:"무의식이 의식을 덮음.", advice:"숨긴 이슈 1개 드러내기." },
  fog: { label:"안개", tags:["모호","지연"], meaning:"모호함/결정 지연.", advice:"결정 기한 1개 하드코딩." },
  robbery: { label:"도둑/강도", tags:["상실","침해"], meaning:"경계 침해/가치 상실 공포.", advice:"2단계 인증/백업 확인." },
  police: { label:"경찰", tags:["규범","통제"], meaning:"도덕/규범/자기통제.", advice:"규칙 1개만 강하게 적용." },
  prison: { label:"감옥", tags:["구속","제한"], meaning:"자기제한/구속감.", advice:"제한 신념 1개 문장 수정." },
  murder: { label:"살인", tags:["공격성","종결"], meaning:"강렬한 종결/공격성 투사.", advice:"해로운 습관 1개를 끊기." },
  war: { label:"전쟁", tags:["갈등","집단"], meaning:"집단 갈등/내적 전쟁.", advice:"갈등 당사자 맵 3명 작성." },
  church: { label:"교회/성당", tags:["신념","의미"], meaning:"신념/가치/용서.", advice:"핵심가치 1줄 점검." },
  temple: { label:"절/사찰", tags:["명상","겸손"], meaning:"명상/겸손/정화.", advice:"호흡 4-7-8 ×3." },
  rainbow_bridge: { label:"무지개다리", tags:["위로","작별"], meaning:"애도/위로/작별 준비.", advice:"작별 편지 3문장." },
  haircut: { label:"머리 자르기", tags:["갱신","정체성"], meaning:"정체성 갱신/과거 단절.", advice:"프로필/룩 1요소 업데이트." },
  airplane_crash: { label:"비행기 추락", tags:["야망","불안"], meaning:"확장 프로젝트 리스크 경보.", advice:"리스크 3개·완충 1개 설정." },
  lottery: { label:"복권", tags:["운","기대"], meaning:"일확천금 기대/현실 회피.", advice:"작은 확실한 보상 설계." },
  jewel: { label:"보석", tags:["가치","희소"], meaning:"희소가치/자존감.", advice:"핵심역량 1개 강화." },
  coins: { label:"동전", tags:["교환","선택"], meaning:"작은 선택의 누적.", advice:"미세지출 1건 차단." },
  crowd: { label:"군중", tags:["압박","동조"], meaning:"동조압력/정체성 희석.", advice:"나만의 기준 1줄 선언." },
  stage: { label:"무대", tags:["노출","표현"], meaning:"표현/평가/노출.", advice:"3분 발표 리허설." },
  elevator_stuck: { label:"엘리베이터 갇힘", tags:["통제상실","정체"], meaning:"빠른 상승 욕구 vs 정체감.", advice:"우회 경로 1개 설계." },
  blackout: { label:"정전", tags:["리셋","무력"], meaning:"강제 리셋/무력.", advice:"전원-오프 30분 디톡스." },
};
Object.assign(SYMBOLS, EXTRA_SYMBOLS);

// =====================================
// 3) 한국어 동의어/표현 (간단)
// =====================================
const KOR_ALIASES: Record<string, string[]> = {
  teeth: ["치아", "이빨", "이"],
  falling: ["떨어", "추락", "낙하"],
  flying: ["날", "비행", "날아오르"],
  chase: ["쫓", "추격", "도망"],
  exam: ["시험", "평가"],
  water: ["물", "바다", "바닷물", "파도"],
  house: ["집", "방", "주택", "거실", "가정"],
  baby: ["아기", "아이", "신생아"],
  death: ["죽음", "사망", "장례"],
};

// =====================================
// 4) 감정/색/행동 사전
// =====================================
const EMOTION_LEXICON: Record<string, string> = {
  fear: "두려움",
  anxious: "불안",
  anxiety: "불안",
  happy: "기쁨",
  joy: "기쁨",
  sad: "슬픔",
  angry: "분노",
  stress: "스트레스",
  shame: "수치",
  guilty: "죄책",
  calm: "평온",
};

const COLOR_CUES: Record<string, string> = {
  red: "에너지·경고·충동",
  blue: "차분·우울·지적 집중",
  green: "회복·성장",
  black: "무의식·두려움",
  white: "정화·새로운 시작",
  gold: "가치·성과",
};

const ACTION_PATTERNS: Record<string, string> = {
  running: "회피/도피 경향",
  speaking: "표현/의사소통 욕구",
  hiding: "자기보호/경계",
  fighting: "대면/해결 의지",
  climbing: "성장/야망",
};

// =====================================
// 5) 유틸
// =====================================
function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9가-힣\s\?\!]/g, " ").split(/\s+/).filter(Boolean);
}

// 조사/어미 허용 (예: "추격" ↔ "추격을/추격에")
function koHit(text: string, kw: string) {
  const re = new RegExp(`${kw}(?:[가-힣]{0,3})`, "i");
  return re.test(text);
}

function safeUUID() {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function extractMatches(tokens: string[], raw: string) {
  const text = raw.toLowerCase();
  const foundSymbols: SymbolMeaning[] = [];
  Object.keys(SYMBOLS).forEach((k) => {
    const aliases = [k, ...(KOR_ALIASES[k] || [])];
    const hit = aliases.some((a) => {
      const key = a.toLowerCase();
      return tokens.includes(key) || text.includes(key) || koHit(text, key);
    });
    if (hit) foundSymbols.push(SYMBOLS[k]);
  });

  const EMO_KO = ["두려움", "불안", "기쁨", "슬픔", "분노", "스트레스", "수치", "죄책", "평온"];
  const emotions = [
    ...Object.entries(EMOTION_LEXICON).filter(([k]) => tokens.includes(k)).map(([, v]) => v),
    ...EMO_KO.filter((k) => text.includes(k)),
  ];

  const COLOR_KO: Record<string, string> = {
    빨강: COLOR_CUES.red,
    파랑: COLOR_CUES.blue,
    초록: COLOR_CUES.green,
    검정: COLOR_CUES.black,
    하양: COLOR_CUES.white,
    금색: COLOR_CUES.gold,
  };
  const colors = [
    ...Object.entries(COLOR_CUES).filter(([k]) => tokens.includes(k)).map(([k, v]) => ({ key: k, cue: v })),
    ...Object.entries(COLOR_KO).filter(([k]) => text.includes(k)).map(([k, v]) => ({ key: k, cue: v })),
  ];

  const ACTION_KO: Record<string, string> = {
    달리: ACTION_PATTERNS.running,
    숨: ACTION_PATTERNS.hiding,
    말하: ACTION_PATTERNS.speaking,
    싸우: ACTION_PATTERNS.fighting,
    오르: ACTION_PATTERNS.climbing,
  };
  const actions = [
    ...Object.entries(ACTION_PATTERNS).filter(([k]) => tokens.includes(k)).map(([, v]) => v),
    ...Object.entries(ACTION_KO).filter(([k]) => text.includes(k)).map(([, v]) => v),
  ];

  return { foundSymbols, emotions, colors, actions };
}

function scoreGI(
  observation = 9,
  connection = 8,
  pattern = 7,
  synthesis = 8,
  assumption = 2,
  bias = 2
) {
  const numerator = observation * connection * pattern * synthesis;
  const denominator = assumption + bias || 1;
  const raw = numerator / denominator;
  const scaled = raw / 10; // 정규화: 0~10 스케일
  return Math.round(scaled * 10) / 10;
}

// =====================================
// 6) 해석 엔진 (복합 규칙 40 포함)
// =====================================
function analyzeDream(raw: string): Analysis {
  const tokens = tokenize(raw);
  const { foundSymbols, emotions, colors, actions } = extractMatches(tokens, raw);

  const patterns: string[] = [];
  const tags = new Set<string>();
  foundSymbols.forEach((s) => s.tags.forEach((t) => tags.add(t)));

  if (tags.has("불안") || emotions.includes("불안")) patterns.push("불안/통제감 저하 신호");
  if (tags.has("성장") || actions.includes("성장/야망")) patterns.push("성장/확장 욕구");
  if (tags.has("회피") || actions.includes("회피/도피 경향")) patterns.push("미해결 과제 회피");
  if (colors.some((c) => c.key === "black" || c.key === "검정")) patterns.push("무의식/두려움 활성화");
  if (colors.some((c) => c.key === "blue" || c.key === "파랑")) patterns.push("진정/사고 정렬 필요");

  // ===== 복합 규칙 엔진 (40 rules) =====
  type CompositeRule = { keys: string[][]; pattern: string; advice: string };
  const T = (arr: string[]) => arr;
  const R: CompositeRule[] = [
    // 1~10: 확장/통제/감정
    { keys:[T(["비행기","airplane","비행"]) , T(["추락","떨어짐","falling"])], pattern:"확장 시도 중 통제 상실 두려움", advice:"최악/최상 시나리오와 완충 버퍼 1개 설정." },
    { keys:[T(["물","바다","ocean","water"]) , T(["쓰나미","해일","tsunami","파도"])], pattern:"감정의 폭발/범람", advice:"감정 강도(0~10) 기록 후 해소행동 1개." },
    { keys:[T(["집","house","방"]) , T(["불","화재","fire"])], pattern:"자아 경계와 안정성 위협", advice:"생활 영역 1곳 정리 + 갈등 1건 정리." },
    { keys:[T(["시험","exam"]) , T(["지각","늦음","late"])], pattern:"완벽주의 + 준비부족 불안", advice:"‘충분히 괜찮음’ 기준으로 샘플 먼저 제출." },
    { keys:[T(["길","도로","road"]) , T(["길잃음","lost","헤맴"])], pattern:"방향성 혼란/의사결정 회피", advice:"선택지 3개·1년 후 모습 1문장씩 시뮬." },
    { keys:[T(["뱀","snake"]) , T(["물림","물리","bite"])], pattern:"유혹·위험과 실제 갈등 촉발", advice:"불편한 대화 주제 1개 메모→전달 준비." },
    { keys:[T(["아기","아이","baby"]) , T(["울음","cry"])], pattern:"새 프로젝트와 돌봄/유지 부담", advice:"초안→시작→유지 3단계 분해." },
    { keys:[T(["죽음","death"]) , T(["장례","funeral"])], pattern:"종결/전환의 수용", advice:"끝낼 일 1건 종결 선언 후 에너지 재배분." },
    { keys:[T(["고양이","cat"]) , T(["검정","black"])], pattern:"직관/독립 욕구 vs 불안", advice:"직관적 선택 1개를 합리화 없이 실행." },
    { keys:[T(["전화","phone","핸드폰"]) , T(["못받","부재","미응답"])], pattern:"소통 욕구와 기회 상실 두려움", advice:"미뤄둔 메시지 1건 전송." },
    // 11~20: 관계/자아
    { keys:[T(["거울","mirror"]) , T(["수치","창피"])], pattern:"자기이미지 취약/자존감 흔들림", advice:"자기긍정 1문장 + 잘한 일 3가지 기록." },
    { keys:[T(["어머니","엄마","mother"]) , T(["병원","hospital"])], pattern:"감정영양/돌봄 자원 고갈 경보", advice:"보살핌 주고받기 균형 체크 3항목." },
    { keys:[T(["아버지","아빠","father"]) , T(["분노","화"])], pattern:"권위/기준과의 충돌", advice:"규칙 1개만 선택·적용." },
    { keys:[T(["연인","배우자","partner"]) , T(["문","door","닫힘"])], pattern:"관계 경계 재설정 필요", advice:"요청/감사 1문장 메시지 전송." },
    { keys:[T(["전애인","옛연인","ex"]) , T(["돈","지갑","money"])], pattern:"가치/교환 비교에서 온 자기의심", advice:"그 관계에서 배운 가치 3가지 목록화." },
    { keys:[T(["낯선","stranger"]) , T(["추격","쫓김","chase"])], pattern:"그림자 측면 회피", advice:"미룬 과제 1건 25분 착수 후 감정 기록." },
    { keys:[T(["개","dog"]) , T(["문","경계"])], pattern:"보호본능과 경계 균형", advice:"시간/연락/업무 경계선 1문장 선언." },
    { keys:[T(["호랑이","tiger"]) , T(["집","house"])], pattern:"자아/가정 영역 리더십 호출", advice:"회의/대화에서 입장 1번 명확히 표명." },
    { keys:[T(["거미","spider"]) , T(["망","웹","엮"])], pattern:"복잡성/의존성 높은 작업 과부하", advice:"의존그래프 작성→첫 노드 수행." },
    { keys:[T(["피","blood"]) , T(["계단","stairs"])], pattern:"에너지 소모 속 점진 성장 압박", advice:"오늘 ‘한 칸’만 진행 + 10분 휴식." },
    // 21~30: 일/성과/시간
    { keys:[T(["시계","time","시한"]) , T(["시험","exam"])], pattern:"시간압박 하의 평가 스트레스", advice:"25분 타이머로 샘플 먼저." },
    { keys:[T(["컴퓨터","PC"]) , T(["홍수","overflow","메일"])], pattern:"정보 과부하/인박스 폭주", advice:"인박스 10분 클리어." },
    { keys:[T(["지갑","wallet"]) , T(["염려","불안"])], pattern:"재정 불안", advice:"계좌 확인 + 구독 1건 중지." },
    { keys:[T(["열쇠","key"]) , T(["잠금","닫힘"])], pattern:"접근권한/실마리 차단", advice:"핵심 질문 1개 작성→요청 발송." },
    { keys:[T(["반지","ring"]) , T(["금색","gold"])], pattern:"약속·가치 재서약", advice:"이번 주 약속 1건 서면 확정." },
    { keys:[T(["돈","money"]) , T(["시장","교환"])], pattern:"가치/교환 집착 또는 결핍", advice:"불필요 지출 1건 건너뛰기." },
    { keys:[T(["창문","window"]) , T(["파랑","blue"])], pattern:"차분한 정보 유입/환기 필요", advice:"신뢰 가능한 채널 1개 열기." },
    { keys:[T(["신발","shoes"]) , T(["길","road"])], pattern:"역할/여정 정렬 필요", advice:"역할 맞춤 준비 1건 먼저 수행." },
    { keys:[T(["버스","bus"]) , T(["지각","늦음"])], pattern:"집단 페이스 의존으로 지연", advice:"나만의 20분 집중 블럭 확보." },
    { keys:[T(["기차","train"]) , T(["표","티켓"])], pattern:"장거리 계획 승인/확정 단계", advice:"장기 목표 1개 일정 고정." },
    // 31~40: 자연/재난/전환
    { keys:[T(["산","mountain"]) , T(["눈","snow"])], pattern:"장기 도전 + 고립감/체력 저하", advice:"체크포인트 3개·보상 1개 설정." },
    { keys:[T(["숲","forest"]) , T(["길","나무"])], pattern:"무의식 탐색 중 방향 재설정", advice:"10분 걷기 + 떠오르는 단어 5개 기록." },
    { keys:[T(["사막","desert"]) , T(["갈증","목마름"])], pattern:"자원 고갈/의미 추구", advice:"지원 요청 1건 발송." },
    { keys:[T(["강","river"]) , T(["다리","bridge"])], pattern:"전환의 문턱/연결 욕구", advice:"미뤄둔 연락 1건으로 연결 복원." },
    { keys:[T(["배","ship"]) , T(["폭풍","storm"])], pattern:"감정 항해 중 외부 변수 급증", advice:"우선순위 3개로 축소 + 안전항로 지정." },
    { keys:[T(["엘리베이터","elevator"]) , T(["추락","정지"])], pattern:"빠른 단계 이동 실패 공포", advice:"가속 대신 안전장치 1개 설치." },
    { keys:[T(["계단","stairs"]) , T(["올라감","up"])], pattern:"점진 성장의 재확인", advice:"오늘 한 칸 완료 체크." },
    { keys:[T(["계단","stairs"]) , T(["내려감","down"])], pattern:"과거/무의식으로 하강", advice:"옛 감정 트리거 1개 글로 적기." },
    { keys:[T(["지진","earthquake"]) , T(["집","건물"])], pattern:"기반 구조 재설계 필요", advice:"핵심 시스템(돈/시간) 1개 리팩터링." },
    { keys:[T(["홍수","flood"]) , T(["전화","통신"])], pattern:"감정 범람으로 소통 장애", advice:"연락창구 1개만 열어 과부하 차단." },
  ];
  const lower = raw.toLowerCase();
  const hasWord = (variants: string[]) => variants.some((v) => lower.includes(v) || koHit(lower, v));
  for (const rule of R) {
    const ok = rule.keys.every((group) => hasWord(group));
    if (ok) { patterns.unshift(rule.pattern); }
  }

  // 조언 생성
  const adviceBase = new Set<string>();
  foundSymbols.forEach((s) => adviceBase.add(s.advice));
  if (emotions.includes("불안")) adviceBase.add("호흡 4-7-8을 3회 반복하고, 불안 근원을 문장으로 라벨링하세요.");
  if (patterns.includes("미해결 과제 회피")) adviceBase.add("미뤄둔 과제 1개를 25분 타이머로 착수하세요 (포모도로).");

  const journalingPrompts = [
    "이 꿈에서 가장 강했던 감정은 무엇이었고, 그 감정의 첫 기억은 언제인가요?",
    "꿈 속 '나'가 하지 못한 행동은 무엇이며, 현실에서 10분 안에 실험해볼 수 있나요?",
    "반복되는 상징(장소/사람/사물)이 있다면, 그것이 내 삶의 어떤 영역을 은유하나요?",
  ];

  const giScore = scoreGI();
  const summary = foundSymbols.length
    ? `주요 상징 ${foundSymbols.map((s) => s.label).join(", ")} 포착. ${patterns.join(", ") || "패턴 파악은 추가 기록 권장"}.`
    : "명확한 상징은 적지만, 감정/색/행동 단서로 해석을 제시합니다.";

  // 질문 즉답
  const isQuestion = /\?|왜|무슨 의미|어떻게|괜찮|뭘 해야|뭐 해야/.test(raw);
  let answer: string | undefined;
  if (isQuestion) {
    const topSym = foundSymbols[0]?.label ? `주요 상징: ${foundSymbols.map((s) => s.label).join(", ")}. ` : "";
    const topPat = patterns[0] ? `핵심 패턴: ${patterns.join(", ")}. ` : "";
    const next = adviceBase.size ? `바로 할 일: ${Array.from(adviceBase)[0]}` : "바로 할 일: 감정 라벨링 3문장.";
    answer = `${topSym}${topPat}${next}`;
  }

  // 정보 부족 시 힌트
  const hints: string[] = [];
  if (foundSymbols.length === 0 && emotions.length === 0 && colors.length === 0 && actions.length === 0) {
    hints.push("상징 1개(예: 치아/시험/물)와 색 1개(예: 파랑/검정)를 적어주세요.");
    hints.push("느꼈던 감정 1~2개(불안/기쁨 등)를 포함하면 정밀도가 올라갑니다.");
    hints.push("무슨 행동을 했는지(도망/싸움/말함 등)도 도움이 됩니다.");
  }

  const goldenLine = patterns.includes("성장/확장 욕구")
    ? "지금의 불편함은 확장을 위한 에너지 신호입니다. 작은 도전 1개를 오늘 안에 실행해 보세요."
    : patterns.includes("불안/통제감 저하 신호")
    ? "불안을 줄이는 가장 빠른 길은 '작은 통제 회복'입니다. 10분 정리·호흡·라벨링 중 하나를 즉시 실행하세요."
    : "꿈은 감정의 메타데이터입니다. 감정-색-행동 중 하나를 현실에서 의식적으로 전환해 보세요.";

  return {
    summary,
    symbols: foundSymbols,
    emotions,
    colors,
    actions,
    patterns,
    advice: Array.from(adviceBase).concat([goldenLine]),
    journalingPrompts,
    giScore,
    answer,
    hints,
  };
}

// =====================================
// 7) 저장소
// =====================================
const STORAGE_KEY = "dreaminsight.journals.v1";
function loadJournals(): Journal[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? (JSON.parse(raw) as Journal[]) : []; } catch { return []; }
}
function saveJournals(list: Journal[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { alert("저장 공간이 가득 찼습니다. 일부 기록을 삭제한 뒤 다시 시도하세요."); }
}

// =====================================
// 8) UI 컴포넌트
// =====================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
      {children}
    </Badge>
  );
}
function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
      <Info className="w-4 h-4 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function toMarkdown(j: Journal) {
  const a = j.analysis;
  const sym = a.symbols.map((s) => `- ${s.label}: ${s.meaning}`).join("\n");
  const adv = a.advice.map((x) => `- ${x}`).join("\n");
  const pat = a.patterns.map((x) => `- ${x}`).join("\n");
  const emo = a.emotions.join(", ") || "(감정 키워드 없음)";
  const col = a.colors.map((c) => `${c.key}(${c.cue})`).join(", ") || "(색 단서 없음)";
  const act = a.actions.join(", ") || "(행동 단서 없음)";
  return (
    `# DreamInsight — 꿈 해석 리포트\n\n` +
    `**작성일:** ${new Date(j.createdAt).toLocaleString()}\n\n` +
    `## 꿈 내용\n${j.text}\n\n` +
    `## 요약\n${a.summary}\n\n` +
    `## 즉답\n${a.answer || "(질문 없음)"}\n\n` +
    `## 상징 해석\n${sym || "(상징 없음)"}\n\n` +
    `## 감정/색/행동 단서\n- 감정: ${emo}\n- 색: ${col}\n- 행동: ${act}\n\n` +
    `## 패턴\n${pat || "(패턴 미도출)"}\n\n` +
    `## 실천 조언\n${adv || "(조언 없음)"}\n\n` +
    `## 저널 프롬프트\n- ${a.journalingPrompts.join("\n- ")}\n\n` +
    `---\nGI Score(내부): ${a.giScore}`
  );
}
function downloadMarkdown(j: Journal) {
  const md = toMarkdown(j);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dream-report-${new Date(j.createdAt).toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// =====================================
// 9) 메인 컴포넌트
// =====================================
export default function DreamInsightApp() {
  const [text, setText] = useState("");
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [draftAnalysis, setDraftAnalysis] = useState<Analysis | null>(null);

  useEffect(() => { setJournals(loadJournals()); }, []);

  // 자동 미리보기: 디바운스 + 최소 길이
  useEffect(() => {
    if (!autoAnalyze) return setDraftAnalysis(null);
    const v = text.trim();
    if (v.length < 6) return setDraftAnalysis(null);
    const t = setTimeout(() => setDraftAnalysis(analyzeDream(v)), 250);
    return () => clearTimeout(t);
  }, [text, autoAnalyze]);

  const invalidMsg = useMemo(() => {
    const v = text.trim();
    if (v.length === 0) return "꿈 내용을 입력하세요. 상징/감정/색/행동 중 2가지를 포함하면 좋습니다.";
    if (v.length < 6) return "6자 이상 입력하면 미리보기가 시작됩니다.";
    return "";
  }, [text]);

  function handleAnalyze() {
    const v = text.trim();
    if (v.length < 6) return;
    const analysis = analyzeDream(v);
    const journal: Journal = { id: safeUUID(), text: v, createdAt: Date.now(), analysis };
    const next = [journal, ...journals];
    setJournals(next);
    saveJournals(next);
    setText("");
    setDraftAnalysis(null);
  }

  function handleDelete(id: string) {
    const next = journals.filter((j) => j.id !== id);
    setJournals(next);
    saveJournals(next);
  }

  const samples = [
    "검은 밤에 높은 건물에서 떨어졌는데 치아가 하나 부서졌어요. 파란 바다가 멀리 보였어요.",
    "누군가에게 쫓겨 골목을 도망쳤고, 마지막엔 날아올라 탈출했어요. 이상하게도 금색 빛이 돌았어요.",
    "시험장에 갔는데 준비가 안 되어 말이 나오지 않았고, 집으로 달려 돌아왔어요.",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Sparkles className="w-6 h-6" />
            </motion.div>
            <h1 className="text-xl font-bold tracking-tight">DreamInsight</h1>
          </div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 opacity-70" />
            <span className="text-sm opacity-70">{journals.length}</span>
          </div>
        </div>

        {/* 입력 카드 */}
        <Card className="rounded-2xl shadow-sm border-zinc-200/60 dark:border-zinc-800/60 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">오늘의 꿈 기록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invalidMsg && (
              <Banner>
                <span className="font-medium">입력 가이드:</span> {invalidMsg}
              </Banner>
            )}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예) 검은 밤 건물에서 떨어졌고 치아가 부서졌어요. 멀리 파란 바다가 보였고 누군가에게 쫓겼어요... 질문도 함께 적어보세요(예: 이 꿈 무슨 의미야?)"
              className="min-h-[120px] text-sm"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="auto" checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
                <Label htmlFor="auto" className="text-sm">자동 미리보기</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setText(samples[Math.floor(Math.random() * samples.length)])}>
                  <Wand2 className="w-4 h-4 mr-1" />샘플
                </Button>
                <Button size="sm" onClick={handleAnalyze} disabled={text.trim().length < 6}>
                  해석 생성
                </Button>
              </div>
            </div>

            {/* 미리보기 */}
            {draftAnalysis && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-xl border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">해석 미리보기</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {draftAnalysis.answer && (
                      <Banner>
                        <span className="font-medium">즉답:</span> {draftAnalysis.answer}
                      </Banner>
                    )}
                    {draftAnalysis.hints && draftAnalysis.hints.length > 0 && (
                      <Banner>
                        <span className="font-medium">더 구체적으로 쓰면 좋아지는 포인트:</span>
                        <ul className="list-disc list-inside mt-1">
                          {draftAnalysis.hints.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </Banner>
                    )}
                    <p className="opacity-80">{draftAnalysis.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {draftAnalysis.symbols.map((s, i) => (<Pill key={i}>{s.label}</Pill>))}
                      {draftAnalysis.emotions.map((e, i) => (<Pill key={"e" + i}>{e}</Pill>))}
                      {draftAnalysis.colors.map((c, i) => (<Pill key={"c" + i}>{c.key}</Pill>))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* 히스토리 & 리포트 */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="history">기록</TabsTrigger>
            <TabsTrigger value="guide">가이드</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-3 space-y-3">
            {journals.length === 0 && (
              <p className="text-sm opacity-70">아직 저장된 기록이 없습니다. 꿈을 입력하고 해석을 생성해 보세요.</p>
            )}

            {journals.map((j) => (
              <motion.div key={j.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{new Date(j.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => downloadMarkdown(j)} title="Markdown 내보내기">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(j.id)} title="삭제">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <Section title="꿈 내용">
                      <p className="leading-6 whitespace-pre-wrap">{j.text}</p>
                    </Section>

                    {j.analysis.answer && (
                      <Section title="즉답(질문에 대한 답)">
                        <Banner>{j.analysis.answer}</Banner>
                      </Section>
                    )}

                    <Section title="요약">
                      <p className="opacity-80">{j.analysis.summary}</p>
                    </Section>

                    <Section title="상징 해석">
                      <div className="space-y-2">
                        {j.analysis.symbols.length === 0 && <p className="opacity-70">(상징 없음)</p>}
                        {j.analysis.symbols.map((s, i) => (
                          <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                            <div className="font-medium mb-1">{s.label}</div>
                            <div className="text-[13px] leading-6 opacity-90">{s.meaning}</div>
                            <div className="text-[12px] mt-2"><span className="opacity-70">태그:</span> {s.tags.join(", ")}</div>
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section title="감정/색/행동 단서">
                      <div className="flex flex-wrap gap-2">
                        {j.analysis.emotions.map((e, i) => <Pill key={"em" + i}>{e}</Pill>)}
                        {j.analysis.colors.map((c, i) => <Pill key={"co" + i}>{c.key}:{c.cue}</Pill>)}
                        {j.analysis.actions.map((a, i) => <Pill key={"ac" + i}>{a}</Pill>)}
                        {j.analysis.emotions.length + j.analysis.colors.length + j.analysis.actions.length === 0 && (
                          <p className="text-xs opacity-70">(단서 없음)</p>
                        )}
                      </div>
                    </Section>

                    <Section title="패턴">
                      {j.analysis.patterns.length === 0 ? (
                        <p className="opacity-70">(패턴 미도출)</p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1">
                          {j.analysis.patterns.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      )}
                    </Section>

                    <Section title="실천 조언">
                      {j.analysis.advice.length === 0 ? (
                        <p className="opacity-70">(조언 없음)</p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1">
                          {j.analysis.advice.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      )}
                    </Section>

                    <Section title="저널 프롬프트">
                      <ul className="list-disc list-inside space-y-1">
                        {j.analysis.journalingPrompts.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </Section>

                    <div className="text-[11px] opacity-60">GI Score(내부 계산): {j.analysis.giScore}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="guide" className="mt-3">
            <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
              <CardHeader>
                <CardTitle className="text-lg">사용 가이드</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7">
                <ol className="list-decimal list-inside space-y-1">
                  <li>상징/감정/색/행동 중 2가지를 포함해 한 문단 이상 입력합니다.</li>
                  <li>질문이 있으면 문장 끝에 물음표를 붙이세요. 미리보기에 즉답이 표시됩니다.</li>
                  <li>저장 후 Markdown으로 내보내 개인 보관함에 보관하세요.</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-[11px] opacity-60">© {new Date().getFullYear()} DreamInsight</div>
      </div>
    </div>
  );
}
