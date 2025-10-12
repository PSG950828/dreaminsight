// DreamInsight 사전 핵심 상징/타입/의미
export type SymbolMeaning = {
  key: string;
  label: string;
  tags: string[];
  meaning: string;
  advice?: string;
  contexts?: {
    psych?: string;
    culture?: { kr?: string; en?: string };
  };
};

// 주요 상징 데이터
export const SYMBOLS: Record<string, SymbolMeaning> = {
  mother: {
    key: "mother",
    label: "어머니/엄마",
    tags: ["가족", "보호", "근원"],
    meaning: "보호, 근원, 양육의 상징. 꿈에서 어머니는 내면의 안전욕구와 연결됨.",
    advice: "최근에 보호받고 싶은 상황이 있었는지 점검하세요."
  },
  father: {
    key: "father",
    label: "아버지/아빠",
    tags: ["가족", "권위", "책임"],
    meaning: "권위, 책임, 규범의 상징. 꿈에서 아버지는 외부 기준과 연결됨.",
    advice: "최근 책임감이나 규범에 대한 압박을 느꼈는지 돌아보세요."
  },
  // ... (다른 주요 상징도 추가)
};
