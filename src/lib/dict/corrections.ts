// DreamInsight 오타/정규화 보정
export const KOR_CORRECTIONS: Array<[RegExp, string]> = [
  [new RegExp(String.raw`(?<!\p{L})햇어요(?!\p{L})`, "gu"), "했어요"],
  [new RegExp(String.raw`(?<!\p{L})햇어(?!\p{L})`, "gu"), "했어"],
  [new RegExp(String.raw`(?<!\p{L})햇다(?!\p{L})`, "gu"), "했다"],
  [new RegExp(String.raw`(?<!\p{L})햇는데(?!\p{L})`, "gu"), "했는데"],
  [new RegExp(String.raw`(?<!\p{L})햇네(?!\p{L})`, "gu"), "했네"],
  [new RegExp(String.raw`(?<!\p{L})봣어요(?!\p{L})`, "gu"), "봤어요"],
  [new RegExp(String.raw`(?<!\p{L})봣어(?!\p{L})`, "gu"), "봤어"],
  [new RegExp(String.raw`(?<!\p{L})봣다(?!\p{L})`, "gu"), "봤다"],
  // ... (이하 생략, 전체 corrections는 기존 dictionary.ts에서 복사 필요)
];

export const EMOTION_CORRECTIONS: Array<[RegExp, string]> = [
  // ... 기존 dictionary.ts에서 EMOTION_CORRECTIONS 전체 복사 ...
];

export function applyCorrections(normalizedLower: string): string {
  let out = normalizedLower;
  for (const [re, rep] of KOR_CORRECTIONS) {
    out = out.replace(re, rep);
  }
  return out;
}

export function normalizeText(input: string): string {
  return (input || "").normalize("NFKC").toLowerCase();
}

export function preprocessDreamText(input: string): string {
  const norm = normalizeText(input);
  return applyCorrections(norm);
}
