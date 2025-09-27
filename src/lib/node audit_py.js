// audit_py.js
// Usage: node audit_py.js
// Output: three lists (runtime / scripts-ci / research) and a machine-readable JSON

const fs = require('fs');
const path = require('path');

const REPO = process.cwd();
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const PY = new Set();
const refs_runtime = new Set();
const refs_scripts = new Set();
const refs_ci = new Set();

const IGNORE_DIRS = new Set([
  'node_modules','.git','.next','dist','build','out','.vercel','.turbo',
  '.pnpm-store','coverage','public','static'
]);

// 1) 수집: 모든 .py 경로
function walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name)) walk(p);
    } else {
      if (p.endsWith('.py')) PY.add(p);
    }
  }
}
walk(REPO);

// 2) 참조 스캔 대상 파일(코드/설정/CI)
const scanTargets = [];
function walkScan(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name)) walkScan(p);
    } else {
      const ext = path.extname(p).toLowerCase();
      if (
        exts.has(ext) ||
        e.name === 'package.json' ||
        p.includes('.github/workflows') ||
        e.name.toLowerCase().startsWith('dockerfile') ||
        e.name === 'Makefile' ||
        e.name.endsWith('.yml') || e.name.endsWith('.yaml') ||
        e.name.toLowerCase().includes('vercel') ||
        e.name.toLowerCase().includes('procfile') ||
        e.name.toLowerCase().includes('justfile') ||
        e.name.toLowerCase().includes('turbo.json')
      ) scanTargets.push(p);
    }
  }
}
walkScan(REPO);

// 3) 텍스트 로드 유틸
function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

// 4) 스캐닝 로직
const childProcRe = /\b(child_process|spawn|execFile|exec|fork)\b[\s\S]*?\(([\s\S]*?)\)/g;
const pyHintRe = /\bpython[0-9.]*\b|\bpoetry\b|\bpip(3)?\b|\.py\b/gi;
const httpLocalRe = /\bhttps?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/gi;

function norm(p) { return p.replace(/\\/g, '/'); }

for (const f of scanTargets) {
  const txt = read(f);
  if (!txt) continue;
  const lower = txt.toLowerCase();

  // package.json scripts
  if (path.basename(f) === 'package.json') {
    try {
      const j = JSON.parse(txt);
      const scripts = j.scripts || {};
      for (const [k, v] of Object.entries(scripts)) {
        const m = String(v);
        if (pyHintRe.test(m)) {
          // 스크립트에서 참조되는 .py 추출
          for (const p of PY) if (m.includes(path.basename(p)) || m.includes(norm(p))) refs_scripts.add(p);
          refs_ci.add('package.json::' + k);
        }
      }
    } catch {}
  }

  // CI / Infra
  if (f.includes('.github/workflows') || f.toLowerCase().includes('dockerfile') || path.basename(f) === 'Makefile' || f.endsWith('.yml') || f.endsWith('.yaml')) {
    if (pyHintRe.test(txt)) {
      for (const p of PY) if (txt.includes(path.basename(p)) || txt.includes(norm(p))) refs_ci.add(p);
      refs_ci.add(f);
    }
  }

  // 코드에서 런타임 호출 추정
  if (exts.has(path.extname(f).toLowerCase())) {
    // child_process 실행 인자 안에 .py 또는 python 명시
    let m;
    while ((m = childProcRe.exec(txt))) {
      const args = m[2] || '';
      if (pyHintRe.test(args)) {
        for (const p of PY) {
          if (args.includes(path.basename(p)) || args.includes(norm(p))) refs_runtime.add(p);
        }
      }
    }
    // 로컬 Python HTTP 서비스 사용 힌트(보조)
    if (httpLocalRe.test(txt) && /python|fastapi|uvicorn|flask/i.test(txt)) {
      // 서비스 이름만 탐지되면 전체 PY를 다 올릴 수는 없으니 힌트만 남김
      refs_runtime.add('POSSIBLE_LOCAL_PY_SERVICE_USED@' + f);
    }
  }
}

// 5) 미참조 파일 = 연구/실험 추정
const runtimeList = Array.from(refs_runtime).filter(Boolean);
const scriptsList = Array.from(refs_scripts).filter(Boolean);
const ciList = Array.from(refs_ci).filter(Boolean);
const used = new Set([...runtimeList, ...scriptsList, ...ciList].filter(x => x.endsWith('.py')));
const research = Array.from(PY).filter(p => !used.has(p));

// 6) 출력
const out = {
  counts: { total_py: PY.size, runtime: runtimeList.length, scripts_ci: scriptsList.length, research: research.length },
  runtime: runtimeList,
  scripts_or_ci: [...new Set([...scriptsList, ...ciList])],
  research_suspects: research
};
console.log(JSON.stringify(out, null, 2));

// 파일도 남김
fs.writeFileSync('audit_py.result.json', JSON.stringify(out, null, 2), 'utf8');
console.error('\nWrote audit_py.result.json');