/**
 * Alias collision checker
 * Reports:
 *  - Exact duplicate aliases across different keys
 *  - Very short aliases (<=1 char)
 *  - Suspicious overlaps (alias is substring of another alias with different key)
 * Usage: TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/check-alias-collisions.ts
 */
import { getMergedAliases, getMergedSymbols, normalizeText } from '../src/lib/dictionary';

function main() {
  const aliases = getMergedAliases();
  const symbols = getMergedSymbols();
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
  // Substring overlaps (conservative: length >= 2)
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
  console.log('# Alias Collisions Report');
  console.log(`symbols=${Object.keys(symbols).length} aliases=${map.size}`);
  console.log('\n## Short Aliases (<=1 char)');
  for (const it of short) console.log(`- ${it.key}: ${it.alias}`);
  console.log('\n## Duplicates');
  for (const it of dup) console.log(`- '${it.alias}' -> ${it.keys.join(', ')}`);
  console.log('\n## Overlaps (substring)');
  for (const it of overlaps.slice(0,200)) console.log(`- '${it.a}' <-> '${it.b}' :: ${it.ka.join(',')} vs ${it.kb.join(',')}`);

  // Suggestions (heuristic)
  console.log('\n## Suggestions');
  // 1) Remove one-letter aliases
  for (const it of short) {
    console.log(`SUGGEST: Remove too-short alias '${it.alias}' from ${it.key}`);
  }
  // 2) Duplicates: keep first key (deterministic order) and remove from others
  for (const it of dup) {
    const keep = it.keys[0];
    for (const k of it.keys.slice(1)) {
      console.log(`SUGGEST: Remove duplicate alias '${it.alias}' from ${k} (keep in ${keep})`);
    }
  }
  // 3) Overlaps: prefer keeping longer alias; suggest removing shorter from keys that don't own the longer alias
  for (const it of overlaps.slice(0,200)) {
    const shorter = it.a.length <= it.b.length ? it.a : it.b;
    const ka = new Set(it.ka), kb = new Set(it.kb);
    for (const k of ka) if (!kb.has(k)) console.log(`SUGGEST: Consider removing shorter alias '${shorter}' from ${k}`);
    for (const k of kb) if (!ka.has(k)) console.log(`SUGGEST: Consider removing shorter alias '${shorter}' from ${k}`);
  }
}

main();
