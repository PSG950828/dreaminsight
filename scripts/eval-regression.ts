/**
 * Regression evaluator for analyzer
 * Usage: TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/eval-regression.ts
 */
import * as fs from 'fs';
import { analyzeDream } from '../src/lib/analyze';

type Case = { id: string; text: string; expectSymbols?: string[]; forbidSymbols?: string[]; notes?: string };

function getSymbolKeys(res: any): string[] {
  try { return (res.symbols || []).map((s: any) => s.key || s.label || '').filter(Boolean); }
  catch { return []; }
}

function main() {
  const dir = 'data/tests';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let cases: Case[] = [];
  for (const f of files) {
    const raw = fs.readFileSync(`${dir}/${f}`, 'utf-8');
    try { const arr = JSON.parse(raw) as Case[]; if (Array.isArray(arr)) cases = cases.concat(arr); }
    catch {}
  }
  let unknown = 0, total = 0, pass = 0, fail = 0;
  const rows: string[] = [];
  rows.push(['id','unknown','recall','violations','notes'].join(','));

  const fails: any[] = [];
  for (const c of cases) {
    const res = analyzeDream(c.text);
    const keys = getSymbolKeys(res);
    const hasUnknown = keys.includes('unknown_generic');
    const expect = new Set((c.expectSymbols || []).map(k=>k));
    const forbid = new Set((c.forbidSymbols || []).map(k=>k));
    let hit = 0;
    for (const k of expect) if (keys.includes(k)) hit++;
    const recall = (expect.size > 0) ? (hit / expect.size) : 1;
    const viol: string[] = [];
    for (const k of forbid) if (keys.includes(k)) viol.push(k);
    const ok = (recall >= 1) && (viol.length === 0);
    if (ok) pass++; else { fail++; fails.push({ id: c.id, recall, violations: viol, notes: c.notes || '', text: c.text }); }
    if (hasUnknown) unknown++;
    total++;
    rows.push([c.id, String(hasUnknown?1:0), (Math.round(recall*100)/100).toFixed(2), viol.join('|'), (c.notes||'').replace(/[,\n]/g,' ')].join(','));
  }

  const unknownRate = total ? Math.round((unknown/total)*1000)/10 : 0;
  console.log(rows.join('\n'));
  console.log('\nSummary:');
  console.log(` total=${total} pass=${pass} fail=${fail} unknownRate=${unknownRate}%`);

  // Write summary JSON for CI enforcement
  try {
    const dir = 'reports';
    fs.mkdirSync(dir, { recursive: true });
    const summary = { total, pass, fail, unknown, unknownRate };
    fs.writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2), 'utf-8');
    fs.writeFileSync(`${dir}/fails.json`, JSON.stringify(fails, null, 2), 'utf-8');
  } catch {}
}

main();
