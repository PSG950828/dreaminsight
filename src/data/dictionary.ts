// src/data/dictionary.ts
export type SymbolMeaning = {
  label: string;
  tags: string[];
  meaning: string;
  advice: string;
};

// 기본 사전
export const SYMBOLS: Record<string, SymbolMeaning> = {
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

// 확장 팩(샘플) — 필요 시 계속 추가
export const EXTRA_SYMBOLS: Record<string, SymbolMeaning> = {
  cockroach: {
    label: "바퀴벌레",
    tags: ["혐오", "회피"],
    meaning: "무시한 사소 문제·깨끗하지 못한 감각.",
    advice: "작은 곰팡이/먼지 하나를 지금 제거.",
  },
  mosquito: {
    label: "모기",
    tags: ["소진", "방해"],
    meaning: "사소하지만 지속적인 에너지 누수.",
    advice: "알림/채팅 1개 묶음 ‘끄기’.",
  },
  butterfly: {
    label: "나비",
    tags: ["변화", "가벼움"],
    meaning: "변태·재탄생·관계 가벼움.",
    advice: "새 취향 1개 시험 체험.",
  },
  // ... (생략 없이 계속 추가 가능)
  blackout: {
    label: "정전",
    tags: ["리셋", "무력"],
    meaning: "강제 리셋/무력.",
    advice: "전원-오프 30분 디톡스.",
  },
};

// 병합용: page.tsx에서 Object.assign으로 병합해 사용
export const KOR_ALIASES: Record<string, string[]> = {
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

export const EMOTION_LEXICON: Record<string, string> = {
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

export const COLOR_CUES: Record<string, string> = {
  red: "에너지·경고·충동",
  blue: "차분·우울·지적 집중",
  green: "회복·성장",
  black: "무의식·두려움",
  white: "정화·새로운 시작",
  gold: "가치·성과",
};

export const ACTION_PATTERNS: Record<string, string> = {
  running: "회피/도피 경향",
  speaking: "표현/의사소통 욕구",
  hiding: "자기보호/경계",
  fighting: "대면/해결 의지",
  climbing: "성장/야망",
};