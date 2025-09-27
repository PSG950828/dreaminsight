"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, History, Info, Sparkles, Trash2, Upload, Plus, Save, Edit3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { getMergedSymbols, getMergedAliases, SymbolMeaning } from "@/lib/dictionary";
import {
  upsertUserSymbol, upsertUserAliases, loadUserSymbols, loadUserAliases,
  removeUserSymbol, removeUserAliases, exportUserDict, importUserDict
} from "@/lib/dictStore";
import { augmentResult } from "@/lib/augment";

// ---------- 타입 ----------
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
  ruleHits?: string[];
  hints?: string[];
};
type Journal = { id: string; text: string; createdAt: number; analysis: Analysis };

// ---------- 고정 사전(감정/색/행동) ----------
const EMOTION_LEXICON: Record<string, string> = {
  fear: "두려움", anxious: "불안", anxiety: "불안", happy: "기쁨", joy: "기쁨",
  sad: "슬픔", angry: "분노", stress: "스트레스", shame: "수치", guilty: "죄책", calm: "평온",
  lonely: "외로움", jealous: "질투", hope: "희망", proud: "자부심", confused: "혼란",
};
const COLOR_CUES: Record<string, string> = {
  red: "에너지·경고·충동", blue: "차분·우울·지적 집중", green: "회복·성장",
  black: "무의식·두려움", white: "정화·새로운 시작", gold: "가치·성과",
  purple: "직관·영적·창의", orange: "에너지·사교·열정", gray: "중립·불확실·우울",
};
const ACTION_PATTERNS: Record<string, string> = {
  running: "회피/도피 경향", speaking: "표현/의사소통 욕구", hiding: "자기보호/경계",
  fighting: "대면/해결 의지", climbing: "성장/야망",
  swimming: "감정 탐색/몰입", driving: "통제/방향성", searching: "탐색/해결욕구",
};

// --- Augment color key adapter: augment.cues.colors[].key (e.g., "color_purple") -> display key & cue ---
function mapAugColorKeyToDisplay(k: string): { key: string; cue: string } | null {
  // map augment keys to our COLOR_CUES keys (en) or KO labels
  const map: Record<string, string> = {
    color_red: "red",
    color_blue: "blue",
    color_green: "green",
    color_black: "black",
    color_white: "white",
    color_gold: "gold",
    color_purple: "purple",
    color_orange: "orange",
    color_gray: "gray",
    color_brown: "brown"
  };
  const en = map[k];
  if (en && COLOR_CUES[en]) return { key: en, cue: COLOR_CUES[en] };
  // fallback: if not recognized, display raw key
  return null;
}

function mergeUniqueColors(base: { key: string; cue: string }[], aug: any[]): { key: string; cue: string }[] {
  const out = new Map<string, { key: string; cue: string }>();
  for (const c of base) out.set(c.key, c);
  for (const c of (aug || [])) {
    const m = mapAugColorKeyToDisplay(c.key);
    if (m) out.set(m.key, m);
  }
  return Array.from(out.values());
}

function mergeUniqueActions(base: string[], aug: any[]): string[] {
  const out = new Set<string>(base);
  for (const a of (aug || [])) {
    // augment uses simple action keys like "laugh","run","chase","hide","fly","fall"
    // map to our ACTION_PATTERNS semantics where possible
    const map: Record<string, string> = {
      run: "회피/도피 경향",
      laugh: "표현/의사소통 욕구",
      chase: "미해결 과제 회피",
      hide: "자기보호/경계",
      fly: "성장/야망",
      fall: "불안/통제감 저하 신호"
    };
    out.add(map[a] || a);
  }
  return Array.from(out);
}

// ---------- 상징 조합 규칙(해석 품질 강화) ----------
type ComboRule = { all: string[]; pattern: string; suggestion?: string };

// 라벨(혹은 라벨에 포함될 한글 키워드) 기준으로 매칭합니다.
// 필요 시 자유롭게 추가/수정하세요.
const COMBO_RULES: ComboRule[] = [
  { all: ["치아", "시험"], pattern: "준비 부족/자기평가 불안 신호", suggestion: "오늘 25분 점검(포모도로)으로 준비 상태를 수치화하세요." },
  { all: ["치아", "부끄러움"], pattern: "체면/이미지 불안", suggestion: "대면해야 할 대화 1건을 미리 스크립트로 준비." },
  { all: ["물", "파랑"], pattern: "감정 정화/휴식 필요", suggestion: "물/파랑 자극(산책, 샤워, 파란 노트)으로 10분 감정 정리." },
  { all: ["바다", "파도"], pattern: "감정 기복/큰 흐름에 대한 압도감", suggestion: "감정 파동 기록(상승/하강 지점) 3회." },
  { all: ["불", "검정"], pattern: "압박감·위기 인식 → 안전/경계 재설정 필요", suggestion: "위험/압박 리스트를 쓰고, 통제 가능한 1가지를 즉시 조치." },
  { all: ["연기", "불"], pattern: "간접적 위험 신호(가시성 저하)", suggestion: "불확실한 이슈 1건에 대해 사실/추정 분리 메모." },
  { all: ["추격", "도망"], pattern: "회피-추격 루프: 미해결 과제 신호", suggestion: "가장 작은 단위로 쪼개 10분 실행 테스트." },
  { all: ["낯선 남자", "추격"], pattern: "의식하지 못한 충동/불안의 의인화", suggestion: "막연한 불안의 '정체'를 한 문장으로 명명." },
  { all: ["추락", "높은 건물"], pattern: "통제감 저하/실패 불안", suggestion: "오늘 해야 할 일 3개만 적고, 1개만 완료하기." },
  { all: ["엘리베이터", "추락"], pattern: "급격한 변동에 대한 통제 상실", suggestion: "리스크 완충 장치(대안/버퍼) 1개 마련." },
  { all: ["계단", "힘듦"], pattern: "점진적 성장의 피로 누적", suggestion: "작은 보상(5분 휴식/커피) 후 다음 한 칸만." },
  { all: ["비행", "금색"], pattern: "확장/성취 상징 활성", suggestion: "확장 목표 1개에 대해 미니 실험(메일 1통/문의 1회) 실행." },
  { all: ["비행기", "공항"], pattern: "이동/전환/새 단계 진입 욕구", suggestion: "전환 준비 체크리스트 3항목 작성." },
  { all: ["자동차", "브레이크"], pattern: "제동 불능/조절 실패 불안", suggestion: "속도 낮추기: 오늘 일정 20% 감축." },
  { all: ["운전", "어두움"], pattern: "방향성 불명확/정보 부족", suggestion: "정보 보강: 결정을 위한 핵심 데이터 3개 수집." },
  { all: ["핸드폰", "전화"], pattern: "연결/소통 욕구 또는 미회신 압박", suggestion: "미회신 1건 즉시 처리." },
  { all: ["화장실", "막힘"], pattern: "정서/과제 배출의 지연", suggestion: "미완료 항목 1건 '아니오/보류'로 명확화." },
  { all: ["거울", "얼굴"], pattern: "자아상/정체성 점검", suggestion: "자기서술 3문장(나는 … 사람이다) 작성." },
  { all: ["머리카락", "탈락"], pattern: "에너지 고갈/자존감 저하", suggestion: "에너지 충전 루틴 10분(수면·영양·움직임 중 1개)." },
  { all: ["집", "부모"], pattern: "근원적 안전/규범 이슈 재활성", suggestion: "규범 vs 욕구 충돌 1건 기록." },
  { all: ["아기", "아이"], pattern: "새로운 시작/미성숙한 가능성 보호 욕구", suggestion: "작은 프로젝트 씨앗 1개 이름 붙이기." },
  { all: ["개", "물림"], pattern: "경계/충성/공격성 테마의 충돌", suggestion: "경계선 선언 문장 1개 작성." },
  { all: ["뱀", "피부"], pattern: "변신/탈피 욕구, 불안 동반", suggestion: "버릴 것 1개 정하고 실제로 버리기." },
  { all: ["지진", "붕괴"], pattern: "기초 구조의 흔들림 감지", suggestion: "핵심 기반(건강/재정/관계) 점검표 3항목." },
  { all: ["피", "빨강"], pattern: "에너지/생명력/경고의 혼합 신호", suggestion: "무리한 일정/관계 1건 피하기." },
  { all: ["비", "폭우"], pattern: "감정 과잉/정화 필요", suggestion: "물리적 정리 10분 + 짧은 샤워." },
  { all: ["눈", "하양"], pattern: "정화/정지/차분", suggestion: "속도 줄이기: 알림 1시간 끄기." },
  { all: ["학교", "지각"], pattern: "기대/평가에 대한 압박", suggestion: "기대치 재설정: '최소 완성' 정의." },
  { all: ["공항", "여권"], pattern: "자격/허가에 대한 불안", suggestion: "필수 요건 체크리스트 3개 확인." }
];

// 현재 해석 상징 목록에 특정 라벨(키워드)이 모두 포함되는지 확인
function hasAllSymbolsByLabel(symbols: SymbolMeaning[], keys: string[]) {
  return keys.every(k => symbols.some(s => s.label.includes(k)));
}

// ---------- 유틸 ----------
function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9가-힣\s\?\!]/g, " ")
    .split(/\s+/).filter(Boolean);
}
function koHit(text: string, kw: string) {
  const norm = text.toLowerCase();
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 한 글자(또는 매우 짧은) 키워드는 단독일 때만 매칭 (공백/문장 경계 기준)
  if (kw.length <= 1) {
    const re = new RegExp(`(?:^|\\s)${esc}(?:\\s|$)`, "i");
    return re.test(norm);
  }

  // 일반 키워드: 단어 경계 비슷하게, 뒤에 조사가 최대 2글자 붙는 경우 허용
  const re = new RegExp(`(?:^|\\s)${esc}(?:[가-힣]{0,2})?(?:\\s|$)`, "i");
  return re.test(norm);
}
function safeUUID() {
  try { return crypto.randomUUID(); } catch { return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
}
function scoreGI(o=9,c=8,p=7,s=8,a=2,b=2) {
  const raw = (o*c*p*s)/((a+b)||1), scaled = raw/10;
  return Math.round(scaled*10)/10;
}

// ---------- 해석 엔진 (병합된 사전 사용) ----------
function analyzeDream(raw: string): Analysis {
  const tokens = tokenize(raw);
  const SYMBOLS = getMergedSymbols();
  const KOR_ALIASES = getMergedAliases();

  const text = raw.toLowerCase();
  const foundSymbols: SymbolMeaning[] = [];
  Object.keys(SYMBOLS).forEach((k) => {
    const aliases = [k, ...(KOR_ALIASES[k] || [])];
    const hit = aliases.some((a) => {
      const key = a.toLowerCase();
      const isShort = key.length <= 1; // "이" 같은 한 글자 방지
      const plainIncludes = !isShort && text.includes(key);
      return tokens.includes(key) || plainIncludes || koHit(text, key);
    });
    if (hit) foundSymbols.push(SYMBOLS[k]);
  });

  // Deduplicate foundSymbols by label
  const dedup = new Map<string, SymbolMeaning>();
  for (const s of foundSymbols) dedup.set(s.label, s);
  const uniqueSymbols = Array.from(dedup.values());

  const EMO_KO = ["두려움","불안","기쁨","슬픔","분노","스트레스","수치","죄책","평온","외로움","질투","희망","자부심","혼란"];
  const emotions = [
    ...Object.entries(EMOTION_LEXICON).filter(([k]) => tokens.includes(k)).map(([,v])=>v),
    ...EMO_KO.filter((k)=>text.includes(k)),
  ];
  const COLOR_KO: Record<string,string> = {
    빨강: COLOR_CUES.red, 파랑: COLOR_CUES.blue, 초록: COLOR_CUES.green,
    검정: COLOR_CUES.black, 하양: COLOR_CUES.white, 금색: COLOR_CUES.gold,
    보라: COLOR_CUES.purple, 주황: COLOR_CUES.orange, 회색: COLOR_CUES.gray,
  };
  const colors = [
    ...Object.entries(COLOR_CUES).filter(([k])=>tokens.includes(k)).map(([k,v])=>({key:k, cue:v})),
    ...Object.entries(COLOR_KO).filter(([k])=>text.includes(k)).map(([k,v])=>({key:k, cue:v})),
  ];
  const ACTION_KO: Record<string,string> = {
    달리:ACTION_PATTERNS.running, 숨:ACTION_PATTERNS.hiding, 말하:ACTION_PATTERNS.speaking,
    싸우:ACTION_PATTERNS.fighting, 오르:ACTION_PATTERNS.climbing,
    수영:ACTION_PATTERNS.swimming, 운전:ACTION_PATTERNS.driving, 찾:ACTION_PATTERNS.searching,
  };
  const actions = [
    ...Object.entries(ACTION_PATTERNS).filter(([k])=>tokens.includes(k)).map(([,v])=>v),
    ...Object.entries(ACTION_KO).filter(([k])=>text.includes(k)).map(([,v])=>v),
  ];

  const patterns: string[] = [];
  const tags = new Set<string>();
  uniqueSymbols.forEach((s)=>s.tags.forEach((t)=>tags.add(t)));
  if (tags.has("불안") || emotions.includes("불안")) patterns.push("불안/통제감 저하 신호");
  if (tags.has("성장") || actions.includes("성장/야망")) patterns.push("성장/확장 욕구");
  if (tags.has("회피") || actions.includes("회피/도피 경향")) patterns.push("미해결 과제 회피");
  if (colors.some((c)=>c.key==="black"||c.key==="검정")) patterns.push("무의식/두려움 활성화");
  if (colors.some((c)=>c.key==="blue"||c.key==="파랑")) patterns.push("진정/사고 정렬 필요");
  // 추가 패턴
  if (tags.has("감정") || emotions.includes("외로움")) patterns.push("정서적 연결/소속 욕구");
  if (actions.includes("탐색/해결욕구")) patterns.push("문제 해결 및 방향 찾기 욕구");
  if (colors.some((c)=>c.key==="purple"||c.key==="보라")) patterns.push("직관/창의성 신호");

  // --- 조합 규칙 적용 (COMBO_RULES) ---
  const adviceBase = new Set<string>();
  uniqueSymbols.forEach((s)=> { if (s.advice) adviceBase.add(s.advice); });
  const ruleHits: string[] = [];
  for (const rule of COMBO_RULES) {
    if (hasAllSymbolsByLabel(uniqueSymbols, rule.all)) {
      if (!patterns.includes(rule.pattern)) patterns.push(rule.pattern);
      if (rule.suggestion) adviceBase.add(rule.suggestion);
      ruleHits.push(rule.all.join(" + "));
    }
  }

  // --- 반복 상징 감지 (최근 30일, 3회 이상) ---
  try {
    const prev = loadJournals?.() ?? [];
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = prev.filter((j: Journal) => j.createdAt >= since);

    // 라벨별 빈도 집계
    const freq = new Map<string, number>();
    for (const j of recent) {
      for (const s of j.analysis?.symbols ?? []) {
        freq.set(s.label, (freq.get(s.label) || 0) + 1);
      }
    }

    for (const s of uniqueSymbols) {
      const n = freq.get(s.label) || 0;
      if (n >= 3) {
        const msg = `반복 상징: ${s.label} (최근 30일 ${n}회)`;
        if (!patterns.includes(msg)) patterns.push(msg);
        adviceBase.add(`반복 상징 '${s.label}' 관련 상황을 오늘 10분간 기록하고, 회피 중인 행동을 1단계 축소하여 실행.`);
      }
    }
  } catch { /* localStorage 접근 불가 환경 대비 */ }

  // 기본 조언 보강
  if (emotions.includes("불안")) adviceBase.add("호흡 4-7-8을 3회 반복하고, 불안 근원을 문장으로 라벨링.");
  if (patterns.includes("미해결 과제 회피")) adviceBase.add("미룬 과제 1개를 25분 타이머로 착수 (포모도로).");

  // --- 3단계 행동 가이드(보강) ---
  if (adviceBase.size === 0) {
    adviceBase.add("감정을 한 단어로 라벨링(불안/기쁨/혼란 등).");
    adviceBase.add("호흡 4-7-8을 3회 반복하며 몸 감각 점검.");
    adviceBase.add("가장 작은 단위 행동 1가지를 10~25분 타이머로 실행.");
  }

  const journalingPrompts = [
    "이 꿈에서 가장 강했던 감정과 그 첫 기억은?",
    "꿈 속 ‘나’가 하지 못한 행동은 무엇이며, 현실에서 10분 실험 가능?",
    "반복 상징이 내 삶의 어떤 영역을 은유하나?",
  ];
  const giScore = scoreGI();

  const summary = uniqueSymbols.length
    ? `주요 상징 ${uniqueSymbols.map((s)=>s.label).join(", ")} 포착. ${patterns.join(", ") || "패턴 파악은 추가 기록 권장"}.`
    : "명확한 상징은 적지만, 감정/색/행동 단서로 해석을 제시합니다.";

  const isQuestion = /\?|왜|무슨 의미|어떻게|괜찮|뭘 해야|뭐 해야/.test(raw);
  let answer: string|undefined;
  if (isQuestion) {
    const topSym = uniqueSymbols.length ? `주요 상징: ${uniqueSymbols.map(s=>s.label).join(", ")}. ` : "";
    const topPat = patterns.length ? `핵심 패턴: ${patterns.join(", ")}. ` : "";
    const next = adviceBase.size ? `바로 할 일: ${Array.from(adviceBase)[0]}` : "바로 할 일: 감정 라벨링 3문장.";
    answer = `${topSym}${topPat}${next}`;
  }

  const hints: string[] = [];
  if (uniqueSymbols.length===0 && emotions.length===0 && colors.length===0 && actions.length===0) {
    hints.push("상징 1개(예: 치아/시험/물)와 색 1개(예: 파랑/검정)를 적어주세요.");
    hints.push("느꼈던 감정 1~2개(불안/기쁨 등)를 포함하면 정밀도가 올라갑니다.");
    hints.push("무슨 행동을 했는지(도망/싸움/말함 등)도 도움이 됩니다.");
  }

  const goldenLine =
    patterns.includes("성장/확장 욕구") ? "지금의 불편함은 확장을 위한 에너지 신호입니다. 작은 도전 1개를 오늘 실행." :
    patterns.includes("불안/통제감 저하 신호") ? "불안을 줄이는 가장 빠른 길은 '작은 통제 회복'. 10분 정리·호흡·라벨링 중 하나 즉시." :
    "꿈은 감정의 메타데이터. 감정-색-행동 중 하나를 현실에서 의식적으로 전환해 보세요.";

  return {
    summary,
    symbols: uniqueSymbols,
    emotions, colors, actions,
    patterns,
    advice: Array.from(adviceBase).concat([goldenLine]),
    journalingPrompts,
    giScore,
    answer,
    ruleHits,
    hints,
  };
}

// ---------- 저장소 ----------
const STORAGE_KEY = "dreaminsight.journals.v1";
function loadJournals(): Journal[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Journal[] : []; }
  catch { return []; }
}
function saveJournals(list: Journal[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch { alert("저장 공간이 가득 찼습니다. 일부 기록 삭제 후 재시도."); }
}

// ---------- 전체 저널 백업/복원 유틸 ----------
function exportAllJournals(journals: Journal[]) {
  const blob = new Blob([JSON.stringify(journals, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `dreaminsight-journals-backup-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}
async function importAllJournals(onLoad: (j: Journal[])=>void) {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("형식이 맞지 않습니다(배열 아님).");
      saveJournals(data);
      onLoad(data);
      alert("저널 가져오기 완료!");
    } catch (e:any) {
      alert("가져오기 실패: " + (e?.message || e));
    }
  };
  input.click();
}

// ---------- 공용 UI ----------
function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Pill({ children }: { children:React.ReactNode }) {
  return <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">{children}</Badge>;
}
function Banner({ children }: { children:React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
      <Info className="w-4 h-4 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
function toMarkdown(j: Journal) {
  const a = j.analysis;
  const sym = a.symbols.map((s)=>`- ${s.label}: ${s.meaning}`).join("\n");
  const adv = a.advice.map((x)=>`- ${x}`).join("\n");
  const pat = a.patterns.map((x)=>`- ${x}`).join("\n");
  const emo = a.emotions.join(", ") || "(감정 키워드 없음)";
  const col = a.colors.map((c)=>`${c.key}(${c.cue})`).join(", ") || "(색 단서 없음)";
  const act = a.actions.join(", ") || "(행동 단서 없음)";
  return (
`# DreamInsight — 꿈 해석 리포트

**작성일:** ${new Date(j.createdAt).toLocaleString()}

## 꿈 내용
${j.text}

## 요약
${a.summary}

## 즉답
${a.answer || "(질문 없음)"}

## 상징 해석
${sym || "(상징 없음)"}

## 감정/색/행동 단서
- 감정: ${emo}
- 색: ${col}
- 행동: ${act}

## 패턴
${pat || "(패턴 미도출)"}

## 실천 조언
${adv || "(조언 없음)"}

## 저널 프롬프트
- ${a.journalingPrompts.join("\n- ")}

---
GI Score(내부): ${a.giScore}`
  );
}
function downloadMarkdown(j: Journal) {
  const md = toMarkdown(j);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dream-report-${new Date(j.createdAt).toISOString().slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- 사전 관리 컴포넌트 ----------
function DictionaryManager() {
  const [userSyms, setUserSyms] = useState(loadUserSymbols());
  const [userAls, setUserAls] = useState(loadUserAliases());

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState("");
  const [meaning, setMeaning] = useState("");
  const [advice, setAdvice] = useState("");
  const [insight, setInsight] = useState("");
  const [aliases, setAliases] = useState("");

  function refresh() {
    setUserSyms(loadUserSymbols());
    setUserAls(loadUserAliases());
  }

  function handleSave() {
    if (!key || !label || !meaning || !advice) {
      alert("key/label/meaning/advice는 필수입니다.");
      return;
    }
    const t = tags.split(",").map(s=>s.trim()).filter(Boolean);
    upsertUserSymbol({ key, label, tags:t, meaning, advice, insight: insight || undefined });
    if (aliases.trim()) {
      const arr = aliases.split(",").map(s=>s.trim()).filter(Boolean);
      upsertUserAliases(key, arr);
    }
    refresh();
    alert("저장되었습니다. (사전 병합 완료)");
  }

  function handleDelete(k: string) {
    removeUserSymbol(k);
    removeUserAliases(k);
    refresh();
  }

  function handleExport() {
    const json = exportUserDict();
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `dreaminsight-user-dict-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const text = await file.text();
      try { importUserDict(text); refresh(); alert("가져오기 완료(사전 병합됨)."); }
      catch (e:any) { alert("가져오기 실패: " + (e?.message || e)); }
    };
    input.click();
  }

  return (
    <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
      <CardHeader>
        <CardTitle className="text-lg">사전 관리(사용자 추가)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Banner>폼에 입력 후 <b>저장</b>만 누르면, 코어/확장 사전에 자동 병합됩니다. 코드 수정/배포 불필요.</Banner>

        <div className="grid gap-2">
          <Label>키(key, 영문 추천)</Label>
          <input className="border rounded px-3 py-2 text-sm bg-transparent" value={key} onChange={e=>setKey(e.target.value)} placeholder="ex) president_meeting" />
          <Label>라벨(label, 한글 표기)</Label>
          <input className="border rounded px-3 py-2 text-sm bg-transparent" value={label} onChange={e=>setLabel(e.target.value)} placeholder="ex) 대통령 만남" />
          <Label>태그(쉼표 구분)</Label>
          <input className="border rounded px-3 py-2 text-sm bg-transparent" value={tags} onChange={e=>setTags(e.target.value)} placeholder="ex) 권위, 인정, 사회적지위" />
          <Label>해설(meaning)</Label>
          <Textarea className="min-h-[80px]" value={meaning} onChange={e=>setMeaning(e.target.value)} placeholder="심리/상황별 해설" />
          <Label>조언(advice)</Label>
          <Textarea className="min-h-[60px]" value={advice} onChange={e=>setAdvice(e.target.value)} placeholder="바로 실행 가능한 1문장 행동" />
          <Label>통찰(insight, 선택)</Label>
          <Textarea className="min-h-[60px]" value={insight} onChange={e=>setInsight(e.target.value)} placeholder="자기탐색 질문/통찰" />
          <Label>동의어(aliases, 쉼표 구분)</Label>
          <input className="border rounded px-3 py-2 text-sm bg-transparent" value={aliases} onChange={e=>setAliases(e.target.value)} placeholder="ex) 대통령, 국가원수, 청와대" />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" />저장</Button>
            <Button variant="secondary" onClick={handleExport}><Download className="w-4 h-4 mr-1" />내보내기</Button>
            <Button variant="secondary" onClick={handleImport}><Upload className="w-4 h-4 mr-1" />가져오기</Button>
          </div>
        </div>

        <Section title="내가 추가한 상징">
          {userSyms.length === 0 ? (
            <p className="opacity-70">아직 사용자 추가 상징이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {userSyms.map((s)=>(
                <div key={s.key} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.label} <span className="opacity-60 text-xs">({s.key})</span></div>
                    <Button variant="ghost" size="icon" onClick={()=>handleDelete(s.key)} title="삭제"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="text-[12px] mt-1"><span className="opacity-70">태그:</span> {s.tags.join(", ")}</div>
                  <div className="text-[13px] leading-6 mt-2 opacity-90">{s.meaning}</div>
                  <div className="text-[13px] mt-1"><span className="opacity-70">조언:</span> {s.advice}</div>
                  {userAls[s.key]?.length ? (
                    <div className="text-[12px] mt-1"><span className="opacity-70">동의어:</span> {userAls[s.key].join(", ")}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}

// ---------- 메인 ----------
export default function Page() {
  const [text, setText] = useState("");
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [draftAnalysis, setDraftAnalysis] = useState<Analysis | null>(null);
  const [range, setRange] = useState(30); // 리포트 기간(일) 선택: 7/30/90/전체=9999
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [debug, setDebug] = useState(false);

  const [premiumOpen, setPremiumOpen] = useState(false);

  // 25분 타이머 (초 단위)
  const [focusActive, setFocusActive] = useState(false);
  const [focusLeft, setFocusLeft] = useState(25 * 60);

  // 디버그 로그(augment 히트 표시)
  const [debugLog, setDebugLog] = useState<string>("");

  useEffect(()=>{
    setJournals(loadJournals());
    try {
      const s = localStorage.getItem("dream.autoAnalyze");
      if (s != null) setAutoAnalyze(s === "1");
    } catch {}
  }, []);
  // 입력 임시저장 로드
  useEffect(()=>{
    try {
      const d = localStorage.getItem("dream.draft");
      if (d && !text) setText(d);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 입력 임시저장 저장(디바운스)
  useEffect(()=>{
    const h = setTimeout(()=>{
      try { localStorage.setItem("dream.draft", text); } catch {}
    }, 500);
    return ()=> clearTimeout(h);
  }, [text]);
  useEffect(()=>{
    try { localStorage.setItem("dream.autoAnalyze", autoAnalyze ? "1" : "0"); } catch {}
  }, [autoAnalyze]);
  useEffect(()=>{
    if (!autoAnalyze) return setDraftAnalysis(null);
    const v = text.trim(); if (v.length < 6) return setDraftAnalysis(null);
    const t = setTimeout(() => {
      const base = analyzeDream(v);
      // augmentResult는 input.preprocessed/raw를 참조하므로 어댑터를 붙여서 전달
      const augmented = augmentResult({
        ...(base as any),
        input: { raw: v, preprocessed: v.toLowerCase() }
      } as any) as any;

      // 기본 분석 필드 유지 + 보강 결과 병합(심볼/조언/색/행동 위주)
      const merged = {
        ...base,
        symbols: Array.from(new Map([
          ...base.symbols.map(s => [s.label, s]),
          ...(augmented.symbols || []).map((s: any) => [s.label, s])
        ]).values()),
        advice: Array.from(new Set([...(base.advice || []), ...((augmented.advice as string[]) || [])])),
        colors: mergeUniqueColors(base.colors || [], augmented?.cues?.colors || []),
        actions: mergeUniqueActions(base.actions || [], augmented?.cues?.actions || []),
      } as Analysis;

      // 디버그 로그 구성
      const hitColors = (augmented?.cues?.colors || []).map((c:any)=>c.key).join(", ");
      const hitActions = (augmented?.cues?.actions || []).join(", ");
      const hitSymbols = (augmented?.symbols || []).map((s:any)=>s.label || s.key).join(", ");
      const dbg = [
        hitColors ? `color: ${hitColors}` : "",
        hitActions ? `action: ${hitActions}` : "",
        hitSymbols ? `symbol: ${hitSymbols}` : ""
      ].filter(Boolean).join(" | ");
      setDebugLog(dbg);

      setDraftAnalysis(merged);
    }, 250);
    return ()=> clearTimeout(t);
  }, [text, autoAnalyze]);
  useEffect(()=>{
    if (!focusActive) return;
    if (focusLeft <= 0) { setFocusActive(false); return; }
    const id = setInterval(()=> setFocusLeft(v => v - 1), 1000);
    return ()=> clearInterval(id);
  }, [focusActive, focusLeft]);

  const invalidMsg = useMemo(()=>{
    const v = text.trim();
    if (v.length === 0) return "꿈 내용을 입력하세요. 상징/감정/색/행동 중 2가지를 포함하면 좋습니다.";
    if (v.length < 6) return "6자 이상 입력하면 미리보기가 시작됩니다.";
    return "";
  }, [text]);

  function handleAnalyze() {
    const v = text.trim(); if (v.length < 6) return;
    const base = analyzeDream(v);
    const augmented = augmentResult({
      ...(base as any),
      input: { raw: v, preprocessed: v.toLowerCase() }
    } as any) as any;
    const analysis = {
      ...base,
      symbols: Array.from(new Map([
        ...base.symbols.map(s => [s.label, s]),
        ...(augmented.symbols || []).map((s: any) => [s.label, s])
      ]).values()),
      advice: Array.from(new Set([...(base.advice || []), ...((augmented.advice as string[]) || [])])),
      colors: mergeUniqueColors(base.colors || [], augmented?.cues?.colors || []),
      actions: mergeUniqueActions(base.actions || [], augmented?.cues?.actions || []),
    } as Analysis;
    const journal: Journal = { id: safeUUID(), text: v, createdAt: Date.now(), analysis };
    const next = [journal, ...journals];
    setJournals(next); saveJournals(next);
    try {
      fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: v, analysis })
      }).catch(()=>{});
    } catch {}
    setText(""); setDraftAnalysis(null);
  }
  function handleDelete(id: string) {
    const next = journals.filter((j)=> j.id !== id);
    setJournals(next); saveJournals(next);
    try { fetch(`/api/journal/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(()=>{}); } catch {}
  }
  function handleEditStart(j: Journal) {
    setEditId(j.id);
    setEditText(j.text);
  }
  function handleEditCancel() {
    setEditId(null);
    setEditText("");
  }
  function handleEditSave() {
    if (!editId) return;
    const target = journals.find(x => x.id === editId);
    if (!target) return;
    const raw = editText.trim();
    const base = analyzeDream(raw);
    const augmented = augmentResult({
      ...(base as any),
      input: { raw, preprocessed: raw.toLowerCase() }
    } as any) as any;
    const analysis = {
      ...base,
      symbols: Array.from(new Map([
        ...base.symbols.map(s => [s.label, s]),
        ...(augmented.symbols || []).map((s: any) => [s.label, s])
      ]).values()),
      advice: Array.from(new Set([...(base.advice || []), ...((augmented.advice as string[]) || [])])),
      colors: mergeUniqueColors(base.colors || [], augmented?.cues?.colors || []),
      actions: mergeUniqueActions(base.actions || [], augmented?.cues?.actions || []),
    } as Analysis;
    const updated: Journal = { ...target, text: raw, analysis };
    const next = journals.map(x => x.id === editId ? updated : x);
    setJournals(next);
    saveJournals(next);
    setEditId(null);
    setEditText("");
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
            <Button variant="ghost" size="sm" onClick={()=>exportAllJournals(journals)}>백업</Button>
            <Button variant="ghost" size="sm" onClick={()=>importAllJournals(setJournals)}>복원</Button>
            <Button variant="ghost" size="sm" onClick={()=>setDebug(v=>!v)} title="디버그 토글">
              {debug ? "디버그: ON" : "디버그: OFF"}
            </Button>
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
              onChange={(e)=>setText(e.target.value)}
              placeholder="예) 검은 밤 건물에서 떨어졌고 치아가 부서졌어요. 멀리 파란 바다가 보였고 누군가에게 쫓겼어요... 질문도 함께 적어보세요(예: 이 꿈 무슨 의미야?)"
              className="min-h-[120px] text-sm"
            />
            <div className="flex items-center gap-3 text-[12px] opacity-80">
              <div>입력 체크리스트:</div>
              <div className={draftAnalysis?.symbols?.length ? "text-emerald-600" : ""}>상징{draftAnalysis?.symbols?.length ? `(${draftAnalysis.symbols.length})` : ""}</div>
              <div className={draftAnalysis?.emotions?.length ? "text-emerald-600" : ""}>감정{draftAnalysis?.emotions?.length ? `(${draftAnalysis.emotions.length})` : ""}</div>
              <div className={draftAnalysis?.colors?.length ? "text-emerald-600" : ""}>색{draftAnalysis?.colors?.length ? `(${draftAnalysis.colors.length})` : ""}</div>
              <div className={draftAnalysis?.actions?.length ? "text-emerald-600" : ""}>행동{draftAnalysis?.actions?.length ? `(${draftAnalysis.actions.length})` : ""}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="auto" checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
                <Label htmlFor="auto" className="text-sm">자동 미리보기</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={()=>setText(samples[Math.floor(Math.random()*samples.length)])}>
                  <Plus className="w-4 h-4 mr-1" />샘플
                </Button>
                <Button size="sm" onClick={handleAnalyze} disabled={text.trim().length < 6}>해석 생성</Button>
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
                      <Banner><span className="font-medium">즉답:</span> {draftAnalysis.answer}</Banner>
                    )}
                    {draftAnalysis.hints?.length ? (
                      <Banner>
                        <span className="font-medium">더 구체적으로 쓰면 좋아지는 포인트:</span>
                        <ul className="list-disc list-inside mt-1">
                          {draftAnalysis.hints.map((h,i)=>(<li key={i}>{h}</li>))}
                        </ul>
                      </Banner>
                    ) : null}
                    <p className="opacity-80">{draftAnalysis.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {draftAnalysis.symbols.map((s,i)=>(<Pill key={i}>{s.label}</Pill>))}
                      {draftAnalysis.emotions.map((e,i)=>(<Pill key={`e${i}`}>{e}</Pill>))}
                      {draftAnalysis.colors.map((c,i)=>(<Pill key={`c${i}`}>{c.key}</Pill>))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {draftAnalysis.actions.map((a,i)=>(<Pill key={`a${i}`}>{a}</Pill>))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant={focusActive ? "secondary" : "default"} onClick={()=>{
                        if (focusActive) { setFocusActive(false); setFocusLeft(25*60); }
                        else { setFocusLeft(25*60); setFocusActive(true); }
                      }}>
                        {focusActive ? "타이머 중지" : "25분 집중 시작"}
                      </Button>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button size="sm" variant="default" onClick={()=>setPremiumOpen(true)}>
                        심층 리포트 보기
                      </Button>
                    </div>
                    <Dialog open={premiumOpen} onOpenChange={setPremiumOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>프리미엄 리포트(미리보기)</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm">
                          <p className="opacity-80">요약 압축, 핵심 패턴, 실행 조언을 PDF로 저장할 수 있습니다.</p>
                          {draftAnalysis && (
                            <div className="space-y-2">
                              <div><b>요약:</b> {draftAnalysis.summary}</div>
                              <div><b>패턴:</b> {draftAnalysis.patterns.slice(0,3).join(", ") || "(패턴 미도출)"}</div>
                              <div><b>조언:</b>
                                <ul className="list-disc list-inside">
                                  {draftAnalysis.advice.slice(0,3).map((a,i)=><li key={i}>{a}</li>)}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button onClick={()=>setPremiumOpen(false)} variant="secondary">닫기</Button>
                          <Button onClick={()=>alert("PDF 내보내기는 추후 연결 예정")}>PDF로 내보내기</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {debug && (
                      <div className="text-[11px] opacity-80 border-t pt-2 mt-2">
                        <div>디버그: 심볼 {draftAnalysis.symbols.length} / 감정 {draftAnalysis.emotions.length} / 색 {draftAnalysis.colors.length} / 행동 {draftAnalysis.actions.length}</div>
                        {debug && debugLog && <div className="mt-1">매칭: {debugLog}</div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* 탭: 기록 / 가이드 / 사전 관리 */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="history">기록</TabsTrigger>
            <TabsTrigger value="guide">가이드</TabsTrigger>
            <TabsTrigger value="dict">사전 관리</TabsTrigger>
            <TabsTrigger value="report">리포트</TabsTrigger> 
          </TabsList>

          <TabsContent value="history" className="mt-3 space-y-3">
            <div className="flex items-center justify-between mb-2">
              {journals.length === 0 ? (
                <p className="text-sm opacity-70">아직 저장된 기록이 없습니다. 꿈을 입력하고 해석을 생성해 보세요.</p>
              ) : (
                <div className="text-sm opacity-70">총 {journals.length}개 기록</div>
              )}
              {journals.length > 0 && (
                <Button size="sm" variant="destructive" onClick={()=>{
                  if (confirm("정말 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                    saveJournals([]); setJournals([]);
                  }
                }}>전체 삭제</Button>
              )}
            </div>
            {journals.map((j)=>(
              <motion.div key={j.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{new Date(j.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={()=>downloadMarkdown(j)} title="Markdown 내보내기">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={()=>{
                            const md = toMarkdown(j);
                            navigator.clipboard.writeText(md);
                            alert("Markdown이 복사되었습니다.");
                          }}
                          title="Markdown 복사"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={()=>handleEditStart(j)} title="편집">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={()=>handleDelete(j.id)} title="삭제">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {editId === j.id ? (
                      <Section title="편집">
                        <Textarea
                          value={editText}
                          onChange={(e)=>setEditText(e.target.value)}
                          className="min-h-[100px] text-sm"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={handleEditSave}>저장</Button>
                          <Button size="sm" variant="secondary" onClick={handleEditCancel}>취소</Button>
                        </div>
                      </Section>
                    ) : (
                      <Section title="꿈 내용"><p className="leading-6 whitespace-pre-wrap">{j.text}</p></Section>
                    )}
                    {j.analysis.answer && (
                      <Section title="즉답(질문에 대한 답)"><Banner>{j.analysis.answer}</Banner></Section>
                    )}
                    <Section title="요약"><p className="opacity-80">{j.analysis.summary}</p></Section>
                    <Section title="상징 해석">
                      <div className="space-y-2">
                        {j.analysis.symbols.length===0 && <p className="opacity-70">(상징 없음)</p>}
                        {j.analysis.symbols.map((s,i)=>(
                          <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                            <div className="font-medium mb-1">{s.label}</div>
                            <div className="text-[13px] leading-6 opacity-90">{s.meaning}</div>
                            <div className="text-[12px] mt-2"><span className="opacity-70">태그:</span> {s.tags.join(", ")}</div>
                            {(s as any).contexts?.psych && (
                              <div className="text-[12px] mt-1"><span className="opacity-70">심리학:</span> {(s as any).contexts.psych}</div>
                            )}
                            {((s as any).contexts?.culture?.kr || (s as any).contexts?.culture?.en) && (
                              <div className="text-[12px] mt-1">
                                <span className="opacity-70">문화:</span>
                                {(s as any).contexts?.culture?.kr ? ` KR: ${(s as any).contexts.culture.kr}` : ""}
                                {(s as any).contexts?.culture?.en ? ` EN: ${(s as any).contexts.culture.en}` : ""}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                    <Section title="감정/색/행동 단서">
                      <div className="flex flex-wrap gap-2">
                        {j.analysis.emotions.map((e,i)=><Pill key={`em${i}`}>{e}</Pill>)}
                        {j.analysis.colors.map((c,i)=><Pill key={`co${i}`}>{c.key}:{c.cue}</Pill>)}
                        {j.analysis.actions.map((a,i)=><Pill key={`ac${i}`}>{a}</Pill>)}
                        {(j.analysis.emotions.length + j.analysis.colors.length + j.analysis.actions.length === 0) && (
                          <p className="text-xs opacity-70">(단서 없음)</p>
                        )}
                      </div>
                    </Section>
                    <Section title="패턴">
                      {j.analysis.patterns.length===0 ? (
                        <p className="opacity-70">(패턴 미도출)</p>
                      ) : (
                        <>
                          <ul className="list-disc list-inside space-y-1">
                            {j.analysis.patterns.map((p,i)=><li key={i}>{p}</li>)}
                          </ul>
                          {j.analysis.ruleHits?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {j.analysis.ruleHits.map((r,i)=><Badge key={i} variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">규칙: {r}</Badge>)}
                            </div>
                          ) : null}
                        </>
                      )}
                    </Section>
                    <Section title="실천 조언">
                      {j.analysis.advice.length===0 ? (
                        <p className="opacity-70">(조언 없음)</p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1">
                          {j.analysis.advice.map((a,i)=><li key={i}>{a}</li>)}
                        </ul>
                      )}
                    </Section>
                    <Section title="저널 프롬프트">
                      <ul className="list-disc list-inside space-y-1">
                        {j.analysis.journalingPrompts.map((q,i)=><li key={i}>{q}</li>)}
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
              <CardHeader><CardTitle className="text-lg">사용 가이드</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm leading-7">
                <ol className="list-decimal list-inside space-y-1">
                  <li>상징/감정/색/행동 중 2가지를 포함해 한 문단 이상 입력합니다.</li>
                  <li>질문이 있으면 문장 끝에 물음표를 붙이세요. 미리보기에 즉답이 표시됩니다.</li>
                  <li>저장 후 Markdown으로 내보내 개인 보관함에 보관하세요.</li>
                  <li>새 상징은 <b>사전 관리</b> 탭에서 추가/수정/삭제하세요.</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dict" className="mt-3">
            <DictionaryManager />
          </TabsContent>
          <TabsContent value="report" className="mt-3">
            {journals.length === 0 ? (
              <p className="text-sm opacity-70">아직 저장된 기록이 없어 리포트를 만들 수 없습니다.</p>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={()=>{
                    const r = makeReport(journals, range===9999 ? 36500 : range);
                    downloadReportCSV(r);
                  }}>CSV 내보내기</Button>
                  {[7,30,90,9999].map(d=>(
                    <Button
                      key={d}
                      size="sm"
                      variant={range===d ? "default" : "secondary"}
                      onClick={()=>setRange(d)}
                    >
                      {d===9999 ? "전체" : `최근 ${d}일`}
                    </Button>
                  ))}
                </div>
                <ReportCard report={makeReport(journals, range===9999 ? 36500 : range)} />
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-[11px] opacity-60">© {new Date().getFullYear()} DreamInsight</div>
        {focusActive && (
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-zinc-900 text-white text-xs shadow-lg">
            집중 타이머: {String(Math.floor(focusLeft/60)).padStart(2,"0")}:{String(focusLeft%60).padStart(2,"0")}
            <Button className="ml-2 h-6 px-2 text-xs" variant="secondary" onClick={()=>{ setFocusActive(false); setFocusLeft(25*60); }}>끝내기</Button>
          </div>
        )}
      </div>
    </div>
  );
}
// ---------- 리포트 유틸 ----------
type ReportBucket = {
  label: string;
  count: number;
};
type DreamReport = {
  rangeLabel: string;
  topSymbols: ReportBucket[];
  topEmotions: ReportBucket[];
  topColors: ReportBucket[];
  topActions: ReportBucket[];
  total: number;
};

function countBy<T extends string>(arr: T[], labelMap?: Record<string,string>): ReportBucket[] {
  const map = new Map<string, number>();
  arr.forEach((k) => {
    if (!k) return;
    const label = labelMap?.[k] || k;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a,b)=> b.count - a.count);
}

function makeReport(journals: Journal[], days = 30): DreamReport {
  const since = Date.now() - days*24*60*60*1000;
  const slice = journals.filter(j => j.createdAt >= since);
  const total = slice.length;

  // symbols(라벨), emotions(한글), colors(key->라벨), actions(라벨)
  const symLabels = slice.flatMap(j => j.analysis.symbols.map(s => s.label));
  const emoLabels = slice.flatMap(j => j.analysis.emotions);
  const colorLabels = slice.flatMap(j => j.analysis.colors.map(c => c.key)); // key를 보기 좋게 매핑
  const colorLabelMap: Record<string,string> = {
    red:"빨강(red)", blue:"파랑(blue)", green:"초록(green)", black:"검정(black)", white:"하양(white)", gold:"금색(gold)",
    purple:"보라(purple)", orange:"주황(orange)", gray:"회색(gray)",
    빨강:"빨강", 파랑:"파랑", 초록:"초록", 검정:"검정", 하양:"하양", 금색:"금색",
    보라:"보라", 주황:"주황", 회색:"회색",
  };
  const actLabels = slice.flatMap(j => j.analysis.actions);

  return {
    rangeLabel: `최근 ${days}일`,
    topSymbols: countBy(symLabels).slice(0,5),
    topEmotions: countBy(emoLabels).slice(0,5),
    topColors: countBy(colorLabels, colorLabelMap).slice(0,5),
    topActions: countBy(actLabels).slice(0,5),
    total,
  };
}

// ---------- 막대(텍스트) 컴포넌트 ----------
function BarList({ items, max }: { items: ReportBucket[]; max?: number }) {
  const top = items.slice(0, max ?? items.length);
  const peak = Math.max(1, ...top.map(i => i.count));
  return (
    <div className="space-y-2">
      {top.map((it, idx) => {
        const w = Math.round((it.count/peak)*100);
        return (
          <div key={idx} className="text-xs">
            <div className="flex justify-between mb-1">
              <span className="truncate mr-2">{it.label}</span>
              <span className="opacity-60">{it.count}회</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-2 bg-zinc-500/70 dark:bg-zinc-300/70" style={{ width: `${w}%` }} />
            </div>
          </div>
        );
      })}
      {top.length === 0 && <div className="text-xs opacity-60">데이터 없음</div>}
    </div>
  );
}

function ReportCard({ report }: { report: DreamReport }) {
  return (
    <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">패턴 리포트 <span className="text-sm opacity-60">({report.rangeLabel}, 총 {report.total}개 기록)</span></CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
        <Section title="상징 TOP 5">
          <BarList items={report.topSymbols} />
        </Section>
        <Section title="감정 TOP 5">
          <BarList items={report.topEmotions} />
        </Section>
        <Section title="색 TOP 5">
          <BarList items={report.topColors} />
        </Section>
        <Section title="행동 TOP 5">
          <BarList items={report.topActions} />
        </Section>
      </CardContent>
    </Card>
  );
}
// ---------- CSV 내보내기 유틸 ----------
function downloadReportCSV(report: DreamReport) {
  const rows: string[] = [];
  rows.push(`Range,${report.rangeLabel},Total,${report.total}`);
  rows.push("Section,Label,Count");
  const push = (section: string, arr: ReportBucket[]) => {
    arr.forEach(it => rows.push(`${section},\"${it.label}\",${it.count}`));
  };
  push("TopSymbols", report.topSymbols);
  push("TopEmotions", report.topEmotions);
  push("TopColors", report.topColors);
  push("TopActions", report.topActions);
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `dream-report-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}
