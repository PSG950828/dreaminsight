"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, History, Sparkles, Trash2, Wand2 } from "lucide-react";

/**
 * DreamInsight — 모바일 웹앱 MVP (단일 파일)
 * 클라이언트 컴포넌트. 로컬 룰 기반 분석 + localStorage 저장.
 */

type SymbolMeaning = {
  label: string;
  tags: string[];
  meaning: string;
  advice: string;
};

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
    label: "추락", tags: ["통제력", "스트레스"],
    meaning: "추락은 통제 상실, 성과 압박, 예측 불가 상황을 반영합니다.",
    advice: "할 일 목록을 3개로 줄이고 반드시 '다음 행동'을 명사+동사로 정의하세요.",
  },
  flying: {
    label: "비행", tags: ["자유", "성장"],
    meaning: "비행은 자유 욕구, 확장, 관점 전환을 상징합니다.",
    advice: "오늘 익숙한 길 대신 다른 길로 이동하거나 새로운 학습 15분을 추가하세요.",
  },
  chase: {
    label: "추격", tags: ["회피", "두려움"],
    meaning: "쫓기는 꿈은 미해결 과제/감정의 회피를 시사합니다.",
    advice: "미뤄둔 일 1개를 25분(포모도로)로 착수하고, 완료 후 감정 기록을 남기세요.",
  },
  exam: {
    label: "시험", tags: ["완벽주의", "자기평가"],
    meaning: "시험 꿈은 평가불안, 기준 과도화, 준비 부족 감각을 반영합니다.",
    advice: "오늘 목표를 '최상'이 아니라 '충분히 좋음' 기준으로 재정의하세요.",
  },
  water: {
    label: "물/바다", tags: ["감정", "무의식"],
    meaning: "물의 맑기/난류는 감정 상태의 투명도·변동성을 드러냅니다.",
    advice: "수분 섭취·호흡 4-7-8·감정 라벨링 3단계를 실천하세요.",
  },
  house: {
    label: "집/방", tags: ["자아", "경계"],
    meaning: "집 구조는 자아 구조·사생활 경계의 은유입니다.",
    advice: "책상/방 한 구역을 10분 정리해 경계감 회복을 돕습니다.",
  },
  baby: {
    label: "아기", tags: ["새로운 시작", "책임"],
    meaning: "아기는 새 프로젝트, 연약함, 돌봄 욕구를 상징합니다.",
    advice: "아이디어 1개를 3단계(초안→시작→유지)로 쪼개 적어보세요.",
  },
  death: {
    label: "죽음", tags: ["변화", "종결"],
    meaning: "죽음은 종말이라기보다 '전환'의 신호일 때가 많습니다.",
    advice: "끝낼 일 1개를 과감히 종료하고 에너지를 재배분하세요.",
  },
};

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

/* ---------- 한글 동의어 확장 ---------- */
const KOR_ALIASES: Record<string, string[]> = {
  teeth: ["치아", "이빨", "이"],
  falling: ["떨어지다", "추락", "낙하"],
  flying: ["날다", "비행", "날아오르다"],
  chase: ["쫓기다", "추격", "도망"],
  exam: ["시험", "평가"],
  water: ["물", "바다", "바닷물", "파도"],
  house: ["집", "방", "주택", "거실", "가정"],
  baby: ["아기", "아이", "신생아"],
  death: ["죽음", "사망", "장례"],
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function extractMatches(tokens: string[]) {
  const foundSymbols: SymbolMeaning[] = [];
  const foundSymbolKeys: string[] = [];

  Object.keys(SYMBOLS).forEach((k) => {
    const aliases = [k, ...(KOR_ALIASES[k] || [])];
    const hit = aliases.some((a) => tokens.includes(a.toLowerCase()));
    if (hit) {
      foundSymbols.push(SYMBOLS[k]);
      foundSymbolKeys.push(k);
    }
  });

  const EMOTION_KO: Record<string, string> = {
    두려움: "두려움", 불안: "불안", 기쁨: "기쁨", 슬픔: "슬픔",
    분노: "분노", 스트레스: "스트레스", 수치: "수치", 죄책: "죄책", 평온: "평온",
  };
  const COLOR_KO: Record<string, string> = {
    빨강: "에너지·경고·충동",
    파랑: "차분·우울·지적 집중",
    초록: "회복·성장",
    검정: "무의식·두려움",
    하양: "정화·새로운 시작",
    금색: "가치·성과",
  };
  const ACTION_KO: Record<string, string> = {
    달리다: "회피/도피 경향",
    숨다: "자기보호/경계",
    말하다: "표현/의사소통 욕구",
    싸우다: "대면/해결 의지",
    오르다: "성장/야망",
  };

  const emotions = [
    ...Object.entries(EMOTION_LEXICON).filter(([k]) => tokens.includes(k)).map(([, v]) => v),
    ...Object.entries(EMOTION_KO).filter(([k]) => tokens.includes(k)).map(([, v]) => v),
  ];

  const colors = [
    ...Object.entries(COLOR_CUES).filter(([k]) => tokens.includes(k)).map(([k, v]) => ({ key: k, cue: v })),
    ...Object.entries(COLOR_KO).filter(([k]) => tokens.includes(k)).map(([k, v]) => ({ key: k, cue: v })),
  ];

  const actions = [
    ...Object.entries(ACTION_PATTERNS).filter(([k]) => tokens.includes(k)).map(([, v]) => v),
    ...Object.entries(ACTION_KO).filter(([k]) => tokens.includes(k)).map(([, v]) => v),
  ];

  return { foundSymbols, foundSymbolKeys, emotions, colors, actions };
}

function scoreGI(observation = 8, connection = 8, pattern = 7, synthesis = 8, assumption = 2, bias = 2) {
  const numerator = observation * connection * pattern * synthesis;
  const denominator = assumption + bias || 1;
  return Math.round((numerator / denominator) * 10) / 10;
}

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
};

function analyzeDream(raw: string): Analysis {
  const tokens = tokenize(raw);
  const { foundSymbols, emotions, colors, actions } = extractMatches(tokens);

  const patterns: string[] = [];
  const tags = new Set<string>();
  foundSymbols.forEach((s) => s.tags.forEach((t) => tags.add(t)));

  if (tags.has("불안") || emotions.includes("불안")) patterns.push("불안/통제감 저하 신호");
  if (tags.has("성장") || actions.includes("성장/야망")) patterns.push("성장/확장 욕구");
  if (tags.has("회피") || actions.includes("회피/도피 경향")) patterns.push("미해결 과제 회피");
  if (colors.some((c) => c.key === "black" || c.key === "검정")) patterns.push("무의식/두려움 활성화");
  if (colors.some((c) => c.key === "blue" || c.key === "파랑")) patterns.push("진정/사고 정렬 필요");

  const adviceBase = new Set<string>();
  foundSymbols.forEach((s) => adviceBase.add(s.advice));
  if (emotions.includes("불안")) adviceBase.add("호흡 4-7-8을 3회 반복하고, 불안 근원을 문장으로 라벨링하세요.");
  if (patterns.includes("미해결 과제 회피")) adviceBase.add("미뤄둔 과제 1개를 25분 타이머로 착수하세요 (포모도로).");

  const journalingPrompts = [
    "이 꿈에서 가장 강했던 감정은 무엇이었고, 그 감정의 첫 기억은 언제인가요?",
    "꿈 속 '나'가 하지 못한 행동은 무엇이며, 현실에서 10분 안에 실험해볼 수 있나요?",
    "반복되는 상징(장소/사람/사물)이 있다면, 그것이 내 삶의 어떤 영역을 은유하나요?",
  ];

  const giScore = scoreGI(9, 8, 7, 8, 2, 2);

  const summary = foundSymbols.length
    ? `주요 상징 ${foundSymbols.map((s) => s.label).join(", ")}이(가) 포착되었습니다. ${patterns.join(", ") || "핵심 패턴을 더 파악하려면 3일 연속 기록을 권장"}.`
    : "명확한 상징 키워드는 적지만, 감정/색/행동 단서로 해석을 제시합니다.";

  const goldenLine =
    patterns.includes("성장/확장 욕구")
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
  };
}

type Journal = {
  id: string;
  text: string;
  createdAt: number;
  analysis: Analysis;
};

const STORAGE_KEY = "dreaminsight.journals.v1";
function loadJournals(): Journal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Journal[]) : [];
  } catch {
    return [];
  }
}
function saveJournals(list: Journal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

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
function toMarkdown(j: Journal) {
  const a = j.analysis;
  const sym = a.symbols.map((s) => `- ${s.label}: ${s.meaning}`).join("\n");
  const adv = a.advice.map((x) => `- ${x}`).join("\n");
  const pat = a.patterns.map((x) => `- ${x}`).join("\n");
  const emo = a.emotions.join(", ") || "(감정 키워드 없음)";
  const col = a.colors.map((c) => `${c.key}(${c.cue})`).join(", ") || "(색 단서 없음)";
  const act = a.actions.join(", ") || "(행동 단서 없음)";
  return `# DreamInsight — 꿈 해석 리포트\n\n` +
    `**작성일:** ${new Date(j.createdAt).toLocaleString()}\n\n` +
    `## 꿈 내용\n${j.text}\n\n` +
    `## 요약\n${a.summary}\n\n` +
    `## 상징 해석\n${sym || "(상징 없음)"}\n\n` +
    `## 감정/색/행동 단서\n- 감정: ${emo}\n- 색: ${col}\n- 행동: ${act}\n\n` +
    `## 패턴\n${pat || "(패턴 미도출)"}\n\n` +
    `## 실천 조언\n${adv || "(조언 없음)"}\n\n` +
    `## 저널 프롬프트\n- ${a.journalingPrompts.join("\n- ")}\n\n` +
    `---\nGI Score(내부): ${a.giScore}`;
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

export default function DreamInsightApp() {
  const [text, setText] = useState("");
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [draftAnalysis, setDraftAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    setJournals(loadJournals());
  }, []);
  useEffect(() => {
    if (autoAnalyze && text.trim().length > 6) setDraftAnalysis(analyzeDream(text));
    else setDraftAnalysis(null);
  }, [text, autoAnalyze]);

  function handleAnalyze() {
    const analysis = analyzeDream(text);
    const journal: Journal = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
      analysis,
    };
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

        <Card className="rounded-2xl shadow-sm border-zinc-200/60 dark:border-zinc-800/60 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">오늘의 꿈 기록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예) 검은 밤 건물에서 떨어졌고 치아가 부서졌어요. 멀리 파란 바다가 보였고 누군가에게 쫓겼어요..."
              className="min-h-[120px] text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="auto" checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
                <Label htmlFor="auto" className="text-sm">자동 미리보기</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setText(samples[Math.floor(Math.random()*samples.length)])}>
                  <Wand2 className="w-4 h-4 mr-1" />샘플
                </Button>
                <Button size="sm" onClick={handleAnalyze} disabled={text.trim().length < 6}>
                  해석 생성
                </Button>
              </div>
            </div>

            {draftAnalysis && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-xl border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">해석 미리보기</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="opacity-80">{draftAnalysis.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {draftAnalysis.symbols.map((s, i) => <Pill key={i}>{s.label}</Pill>)}
                      {draftAnalysis.emotions.map((e, i) => <Pill key={"e"+i}>{e}</Pill>)}
                      {draftAnalysis.colors.map((c, i) => <Pill key={"c"+i}>{c.key}</Pill>)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </CardContent>
        </Card>

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
                        {j.analysis.emotions.map((e, i) => <Pill key={"em"+i}>{e}</Pill>)}
                        {j.analysis.colors.map((c, i) => <Pill key={"co"+i}>{c.key}:{c.cue}</Pill>)}
                        {j.analysis.actions.map((a, i) => <Pill key={"ac"+i}>{a}</Pill>)}
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
                <CardTitle className="text-lg">사용 가이드 & 확장 로드맵</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7">
                <ol className="list-decimal list-inside space-y-2">
                  <li>꿈을 한 문단 이상으로 자연어로 입력하세요. (핵심: 상징/색/감정/행동)</li>
                  <li>자동 미리보기로 즉시 단서를 확인하고, <b>해석 생성</b>을 눌러 기록을 저장하세요.</li>
                  <li>저장된 리포트를 Markdown으로 내보내어 보관하거나 공유할 수 있습니다.</li>
                </ol>
                <div className="pt-2">
                  <div className="font-semibold">백엔드 연동 (선택)</div>
                  <p className="opacity-80">/api/analyze 엔드포인트로 텍스트를 전송해 LLM 해석을 통합할 수 있습니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-[11px] opacity-60">
          © {new Date().getFullYear()} DreamInsight — made for rapid prototyping
        </div>
      </div>
    </div>
  );
}
