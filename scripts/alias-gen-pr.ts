/**
 * Generate alias removal suggestions and a PR-ready markdown
 * Output:
 *  - reports/alias_removals.json: { removals: { [key]: string[] } }
 *  - reports/alias_suggestions.md: human-readable summary & commands
 */
import * as fs from 'fs';
import { getMergedAliases, normalizeText } from '../src/lib/dictionary';

type Suggestions = { removals: Record<string, string[]> };

function main() {
  const aliases = getMergedAliases();
  const map = new Map<string, Set<string>>(); // norm alias -> keys
  const short: Array<{ key: string; alias: string }> = [];
  for (const [key, list] of Object.entries(aliases)) {
    for (const a of (list || [])) {
      const norm = normalizeText(a);
      if (norm.length <= 1) short.push({ key, alias: a });
      if (!map.has(norm)) map.set(norm, new Set());
      map.get(norm)!.add(key);
    }
  }
  const dup: Array<{ alias: string; keys: string[] }> = [];
  for (const [a, keys] of map.entries()) {
    const arr = Array.from(keys);
    if (arr.length > 1) dup.push({ alias: a, keys: arr });
  }
  const overlaps: Array<{ a: string; b: string; ka: string[]; kb: string[] }> = [];
  const all = Array.from(map.keys()).filter(s => s.length >= 2);
  for (let i=0;i<all.length;i++) for (let j=i+1;j<all.length;j++) {
    const a = all[i], b = all[j];
    if (a.includes(b) || b.includes(a)) {
      const ka = Array.from(map.get(a) || []);
      const kb = Array.from(map.get(b) || []);
      if (ka.some(k=> !kb.includes(k)) || kb.some(k=> !ka.includes(k))) {
        overlaps.push({ a, b, ka, kb });
      }
    }
  }

  const suggest: Suggestions = { removals: {} };
  // 1) one-letter removals
  for (const it of short) {
    if (!suggest.removals[it.key]) suggest.removals[it.key] = [];
    suggest.removals[it.key].push(it.alias);
  }
  // 2) duplicates: keep first key; remove from others
  for (const it of dup) {
    const keep = it.keys[0];
    for (const k of it.keys.slice(1)) {
      if (!suggest.removals[k]) suggest.removals[k] = [];
      // push original (de-normalized) alias if present, else norm
      const orig = (aliases[k] || []).find(a => normalizeText(a) === it.alias) || it.alias;
      suggest.removals[k].push(orig);
    }
  }
  // 3) overlaps: remove shorter alias from keys not sharing the longer one
  for (const it of overlaps) {
    const shorter = it.a.length <= it.b.length ? it.a : it.b;
    const ka = new Set(it.ka), kb = new Set(it.kb);
    for (const k of ka) if (!kb.has(k)) {
      if (!suggest.removals[k]) suggest.removals[k] = [];
      const orig = (aliases[k] || []).find(a => normalizeText(a) === shorter) || shorter;
      suggest.removals[k].push(orig);
    }
    for (const k of kb) if (!ka.has(k)) {
      if (!suggest.removals[k]) suggest.removals[k] = [];
      const orig = (aliases[k] || []).find(a => normalizeText(a) === shorter) || shorter;
      suggest.removals[k].push(orig);
    }
  }

  // Normalize removal lists
  for (const k of Object.keys(suggest.removals)) {
    const set = new Set(suggest.removals[k]);
    suggest.removals[k] = Array.from(set);
  }

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/alias_removals.json', JSON.stringify(suggest, null, 2), 'utf-8');
  const md: string[] = [];
  md.push('# Alias Removal Suggestions');
  md.push('');
  md.push('이 제안은 충돌/중복/부분중첩 alias를 보수적으로 제거하기 위한 것입니다. 적용 전 수동 검토를 권장합니다.');
  md.push('');
  for (const [key, list] of Object.entries(suggest.removals)) {
    if (!list.length) continue;
    md.push(`- ${key}: ${list.map(s=>`'${s}'`).join(', ')}`);
  }
  md.push('');
  md.push('## 적용 방법(수동)');
  md.push('- `reports/alias_removals.json`을 열어 각 key에서 제거할 alias를 확인합니다.');
  md.push('- 사전 정의 파일(`src/lib/dict/aliases.ts` 및 확장 정의)에서 해당 항목을 삭제합니다.');
  md.push('- `npm run check:aliases`로 재검증 후 PR을 생성합니다.');
  fs.writeFileSync('reports/alias_suggestions.md', md.join('\n'), 'utf-8');
  console.log('Wrote reports/alias_removals.json and reports/alias_suggestions.md');
}

main();

