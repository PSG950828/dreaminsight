// Smoke test for analyzer/augment
// Usage: TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/smoke-analyze.ts

import { analyzeDream } from "../src/lib/analyze";

const samples = [
  "검은 밤 높은 건물에서 떨어졌고 이가 부서졌어요. 파란 바다가 멀리 보였어요 😂",
  "보라 불빛이 번쩍, 러닝하며 ㅎㅎ 웃었어",
  "시험장에 갔는데 준비가 안 되어 말이 나오지 않았어요",
  "지하철이 너무 붐비고 늦을까 불안했어요. 노란불이 깜빡",
  "공항에서 여권을 잃어버려서 터널을 지나 헤맸어요",
];

for (const s of samples) {
  const r = analyzeDream(s);
  const syms = (r.symbols || []).map((x) => x.label).join(", ");
  const colors = (r.cues?.colors || []).map((x) => x.label).join(", ");
  const emos = (r.cues?.emotions || []).map((x) => x.label).join(", ");
  console.log("=== INPUT ===\n" + s);
  console.log("- symbols:", syms || "(none)");
  console.log("- colors:", colors || "(none)");
  console.log("- emotions:", emos || "(none)");
  console.log("- advice:", (r.advice || []).slice(0, 3).join(" | "));
  console.log("");
}

