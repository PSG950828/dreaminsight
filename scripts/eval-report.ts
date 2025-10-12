/**
 * Generates an HTML regression report from cases.json
 * Usage: TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/eval-report.ts
 */
import * as fs from 'fs';
import { analyzeDream } from '../src/lib/analyze';

type Case = { id: string; text: string; expectSymbols?: string[]; forbidSymbols?: string[]; notes?: string };

function getSymbolKeys(res: any): string[] {
  try { return (res.symbols || []).map((s: any) => s.key || s.label || '').filter(Boolean); }
  catch { return []; }
}

function escape(s: string) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function main() {
  const dataDir = 'data/tests';
  const outDir = 'reports';
  const htmlPath = `${outDir}/regression.html`;
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  let cases: Case[] = [];
  for (const f of files) {
    try { const raw = fs.readFileSync(`${dataDir}/${f}`, 'utf-8'); const arr = JSON.parse(raw) as Case[]; if (Array.isArray(arr)) cases = cases.concat(arr); } catch {}
  }

  let pass = 0, fail = 0, unknown = 0;
  const rows: string[] = [];
  rows.push(`<tr><th>ID</th><th>Status</th><th>Unknown</th><th>Recall</th><th>Violations</th><th>Notes</th></tr>`);
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
    if (ok) pass++; else fail++;
    if (hasUnknown) unknown++;
    rows.push(`<tr class="${ok?'ok':'fail'}">`+
      `<td>${escape(c.id)}</td>`+
      `<td>${ok? 'PASS':'FAIL'}</td>`+
      `<td>${hasUnknown? 'Y':'-'}</td>`+
      `<td>${(Math.round(recall*100)/100).toFixed(2)}</td>`+
      `<td>${escape(viol.join(', ')) || '-'}</td>`+
      `<td title="${escape(c.text)}">${escape(c.notes||'')}</td>`+
      `</tr>`);
  }
  const total = pass + fail;
  const unknownRate = total ? Math.round((unknown/total)*1000)/10 : 0;
  const html = `<!doctype html>
<meta charset="utf-8"/>
<title>DreamInsight — Regression Report</title>
<style>
  body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:20px;}
  table{border-collapse:collapse; width:100%;}
  th,td{border:1px solid #ddd; padding:6px 8px; font-size:13px;}
  th{background:#f4f4f5; text-align:left;}
  tr.ok{background:#f0fff4}
  tr.fail{background:#fff5f5}
  .sum{margin:12px 0; font-size:14px;}
</style>
<h1>Regression Report</h1>
<div class="sum">total=${total} · pass=${pass} · fail=${fail} · unknownRate=${unknownRate}%</div>
<table>
${rows.join('\n')}
</table>`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`Wrote ${htmlPath}`);
}

main();
