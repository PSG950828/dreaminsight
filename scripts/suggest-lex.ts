/**
 * Lexicon Suggestion Helper
 * - Generates simple Korean variants for seed tokens (colors/emotions)
 * - Usage:
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/suggest-lex.ts --type color --seed 보라,자주
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/suggest-lex.ts --type emotion --seed 불안,두려움
 */

function variantsColor(base: string): string[] {
  const stems = [base];
  const out = new Set<string>();
  for (const s of stems) {
    out.add(s);
    out.add(`${s}빛`);
    out.add(`${s} 불`);
    out.add(`${s}불`);
    out.add(`${s} 불빛`);
    out.add(`${s}불빛`);
    out.add(`${s}색`);
    out.add(`${s} 색`);
    out.add(`${s}색깔`);
  }
  // spacing-insensitive unique set
  return Array.from(out);
}

function variantsEmotion(base: string): string[] {
  const out = new Set<string>();
  out.add(base);
  const stem = base.replace(/감$/, '');
  out.add(`${stem}감`);
  out.add(`${stem}스럽`);
  out.add(`${stem}스러움`);
  out.add(`${stem}이 듦`);
  out.add(`${stem}이 들`);
  out.add(`${stem}하다`);
  out.add(`${stem}했`);
  out.add(`${stem}해`);
  return Array.from(out);
}

function main() {
  const args = process.argv.slice(2);
  const type = (args.includes('--type') ? args[args.indexOf('--type')+1] : 'color').toLowerCase();
  const seedRaw = (args.includes('--seed') ? args[args.indexOf('--seed')+1] : '').trim();
  if (!seedRaw) {
    console.error('Usage: ts-node scripts/suggest-lex.ts --type color|emotion --seed 토큰1,토큰2');
    process.exit(2);
  }
  const seeds = seedRaw.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
  const map: Record<string, string[]> = {};
  for (const s of seeds) {
    map[s] = type === 'emotion' ? variantsEmotion(s) : variantsColor(s);
  }
  console.log(JSON.stringify({ type, seeds, suggestions: map }, null, 2));
}

main();

