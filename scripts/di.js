#!/usr/bin/env node
/*
 * DreamInsight CLI
 * Usage:
 *   - Pretty text:  di "꿈 내용을 한 문장 이상 입력"
 *   - JSON output:  di --json "꿈 내용을 입력"
 *   - Or via npm:   npm run di -- --json "..."
 */

// Register ts-node so we can import TypeScript sources without building
try {
  // Be lenient: transpileOnly and CJS to match our import style
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true },
  });
} catch (e) {
  console.error('[di] ts-node is required. Try: npm i -D ts-node');
  process.exit(1);
}

const { analyzeDream } = require('../src/lib/analyze.ts');

function printHelp() {
  console.log(`DreamInsight CLI\n\n` +
    `Usage:\n` +
    `  di "꿈 내용을 입력"\n` +
    `  di --json "꿈 내용을 입력"\n` +
    `\nOptions:\n` +
    `  --json     Print machine-readable JSON\n` +
    `  -h, --help Show help\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const json = args.includes('--json');
  const text = args.filter(a => a !== '--json').join(' ').trim();

  if (!text) {
    console.error('[di] No input provided. Example: di "검은 밤 건물에서 떨어졌고 치아가 부서졌어요"');
    process.exit(2);
  }

  const result = analyzeDream(text);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Pretty print summary
  const lines = [];
  lines.push('=== DreamInsight — 분석 결과 ===');
  lines.push(`입력: ${text}`);
  lines.push('');
  // symbols
  if (result.symbols?.length) {
    lines.push('- 상징:');
    for (const s of result.symbols) {
      lines.push(`  • ${s.label} (${s.tags.join(', ')})`);
    }
  } else {
    lines.push('- 상징: (없음)');
  }
  // cues
  const emos = result.cues?.emotions || [];
  const cols = result.cues?.colors || [];
  lines.push(`- 감정: ${emos.map(e => e.label).join(', ') || '(없음)'}`);
  lines.push(`- 색: ${cols.map(c => c.label).join(', ') || '(없음)'}`);

  // advice
  if (result.advice?.length) {
    lines.push('');
    lines.push('- 실천 조언:');
    for (const a of result.advice) lines.push(`  • ${a}`);
  }

  // prompts
  if (result.prompts?.length) {
    lines.push('');
    lines.push('- 저널 프롬프트:');
    for (const p of result.prompts) lines.push(`  • ${p}`);
  }

  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error('[di] Error:', e?.message || e);
  process.exit(1);
});

