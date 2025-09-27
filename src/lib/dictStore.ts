// src/lib/dictStore.ts
// 사용자 추가 사전을 localStorage에 저장/불러오기 + 내보내기/가져오기

export type UserSymbol = {
  key: string;                 // 내부 키 (영문/스네이크 추천)
  label: string;               // 표기명(한글)
  tags: string[];              // 태그
  meaning: string;             // 해설
  advice: string;              // 조언
  insight?: string;            // 선택
};

export type UserAliasMap = Record<string, string[]>; // key -> ["동의어1","동의어2",...]

const SYM_KEY = "dreaminsight.user.symbols.v1";
const ALS_KEY = "dreaminsight.user.aliases.v1";

export function loadUserSymbols(): UserSymbol[] {
  try {
    const raw = localStorage.getItem(SYM_KEY);
    return raw ? (JSON.parse(raw) as UserSymbol[]) : [];
  } catch {
    return [];
  }
}

export function saveUserSymbols(list: UserSymbol[]) {
  localStorage.setItem(SYM_KEY, JSON.stringify(list));
}

export function loadUserAliases(): UserAliasMap {
  try {
    const raw = localStorage.getItem(ALS_KEY);
    return raw ? (JSON.parse(raw) as UserAliasMap) : {};
  } catch {
    return {};
  }
}

export function saveUserAliases(map: UserAliasMap) {
  localStorage.setItem(ALS_KEY, JSON.stringify(map));
}

export function upsertUserSymbol(s: UserSymbol) {
  const list = loadUserSymbols();
  const i = list.findIndex((x) => x.key === s.key);
  if (i >= 0) list[i] = s; else list.unshift(s);
  saveUserSymbols(list);
}

export function removeUserSymbol(key: string) {
  const next = loadUserSymbols().filter((x) => x.key !== key);
  saveUserSymbols(next);
}

export function upsertUserAliases(key: string, aliases: string[]) {
  const map = loadUserAliases();
  map[key] = Array.from(new Set((aliases || []).map((a) => a.trim()).filter(Boolean)));
  saveUserAliases(map);
}

export function removeUserAliases(key: string) {
  const map = loadUserAliases();
  delete map[key];
  saveUserAliases(map);
}

// 백업/이전용
export function exportUserDict(): string {
  const data = {
    symbols: loadUserSymbols(),
    aliases: loadUserAliases(),
    version: 1,
  };
  return JSON.stringify(data, null, 2);
}

export function importUserDict(json: string) {
  const data = JSON.parse(json);
  if (!data || typeof data !== "object") throw new Error("잘못된 JSON");
  if (Array.isArray(data.symbols)) saveUserSymbols(data.symbols);
  if (data.aliases && typeof data.aliases === "object") saveUserAliases(data.aliases as UserAliasMap);
}