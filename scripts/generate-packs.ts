#!/usr/bin/env ts-node
/*
 * Generate category CSV packs (100+ each) from small seed lists + adjective expansion.
 * Output: data/packs/XX-<category>-gen.csv (sorted and deduped)
 * Usage: npm run packs:generate
 */
import fs from 'fs';
import path from 'path';

type CatConf = {
  code: number;                // order prefix
  id: string;                  // e.g., animals
  src: string;                 // data/sources/<src>.txt
  label: string;               // human label
  category: string;            // CSV category cell (e.g., 동물, 자연)
  tags: string[];              // default tags
  meaningTpl: string;          // e.g., '{label}의 핵심 상징 ...'
  adviceTpl: string;           // e.g., '... 1가지를 실행'
  target: number;              // target rows
};

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(ROOT, 'data', 'sources');
const OUT_DIR = path.resolve(ROOT, 'data', 'packs');

const CATS: CatConf[] = [
  { code: 10, id: 'animals', src: 'animals', label: '동물', category: '동물', tags: ['본능','힘','경계'], meaningTpl: '{label}은(는) 본능/힘/경계와 연결됩니다.', adviceTpl: '억눌린 힘을 안전한 행동 1가지로 표출하세요.', target: 100 },
  { code: 20, id: 'nature', src: 'nature', label: '자연', category: '자연', tags: ['자연','정화','변화'], meaningTpl: '{label}은(는) 정화/변화/리듬의 신호입니다.', adviceTpl: '자연 노출 10분 + 물 한 잔으로 리셋하세요.', target: 100 },
  { code: 30, id: 'digital', src: 'digital', label: '디지털', category: '디지털', tags: ['연결','보안','노이즈'], meaningTpl: '{label}은(는) 연결/노이즈/보안의 주제를 드러냅니다.', adviceTpl: '알림 정리 10분 + 2FA/백업 점검.', target: 100 },
  { code: 40, id: 'relationships', src: 'relationships', label: '관계', category: '관계', tags: ['관계','소통','경계'], meaningTpl: '{label}은(는) 소통/경계/기대의 주제를 비춥니다.', adviceTpl: 'I-메시지 3줄(사실-느낌-요구)을 작성하세요.', target: 100 },
  { code: 50, id: 'places', src: 'places', label: '장소', category: '장소', tags: ['공간','경계','전환'], meaningTpl: '{label}은(는) 공간/경계/전환의 은유입니다.', adviceTpl: '공간 10분 정리 + 경계 문장 1개 선언.', target: 100 },
  { code: 60, id: 'objects', src: 'objects', label: '사물', category: '사물', tags: ['자원','접근','표현'], meaningTpl: '{label}은(는) 자원/접근/표현의 상징입니다.', adviceTpl: '필수 자원 1개 점검 + 표현 1문장.', target: 100 },
  { code: 70, id: 'actions', src: 'actions', label: '행동', category: '행동', tags: ['표현','에너지','방향'], meaningTpl: '{label}은(는) 표현/에너지/방향의 신호입니다.', adviceTpl: '10~25분 실행으로 에너지를 방향화하세요.', target: 100 },
  { code: 80, id: 'rituals', src: 'rituals', label: '의식', category: '의식', tags: ['전환','의미','기억'], meaningTpl: '{label}은(는) 전환/의미/기억의 통과의례입니다.', adviceTpl: '의미 3줄 기록 + 작은 의식 실행.', target: 100 },
  { code: 90, id: 'health', src: 'health', label: '건강', category: '건강', tags: ['건강','회복','점검'], meaningTpl: '{label}은(는) 건강/회복/점검 신호입니다.', adviceTpl: '수면·빛·물·움직임 중 2가지 10분 보강.', target: 100 },
  { code: 95, id: 'vehicles', src: 'vehicles', label: '이동', category: '이동', tags: ['이동','리듬','전환'], meaningTpl: '{label}은(는) 이동/리듬/전환의 주제입니다.', adviceTpl: '경로/대체경로를 사전에 점검하세요.', target: 100 },
];

const ADJ = [
  '작은','큰','낡은','새로운','하얀','검은','붉은','푸른','초록','노란','은빛','금빛','빠른','느린','짙은','옅은','따뜻한','차가운','고요한','거친'
];

function readSeeds(name: string): string[] {
  const p = path.join(SRC_DIR, `${name}.txt`);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s가-힣]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function csvEscape(s: string): string {
  const needs = /[",\n]/.test(s);
  const val = s.replace(/"/g, '""');
  return needs ? `"${val}"` : val;
}

function makeRows(cat: CatConf): Array<{ key: string; label: string; tags: string[]; meaning: string; advice: string }> {
  const base = readSeeds(cat.src);
  const out: Array<{ key: string; label: string; tags: string[]; meaning: string; advice: string }> = [];
  const seen = new Set<string>();
  const add = (label: string) => {
    const key = `${cat.id}_${slug(label)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const meaning = cat.meaningTpl.replace('{label}', label);
    const advice = cat.adviceTpl.replace('{label}', label);
    out.push({ key, label, tags: cat.tags, meaning, advice });
  };
  base.slice(0, cat.target).forEach(add);
  let i = 0;
  while (out.length < cat.target && base.length > 0) {
    const b = base[i % base.length];
    const a = ADJ[Math.floor(i / base.length) % ADJ.length];
    add(`${a} ${b}`);
    i++;
    if (i > cat.target * 5) break; // safety
  }
  return out;
}

function writeCsv(cat: CatConf, rows: Array<{ key: string; label: string; tags: string[]; meaning: string; advice: string }>) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const name = `${String(cat.code).padStart(2,'0')}-${cat.id}-gen.csv`;
  const outPath = path.join(OUT_DIR, name);
  const header = 'key,label,tags,meaning,advice,category,psych,culture.kr';
  const lines = [header];
  rows.forEach(r => {
    const tags = r.tags.join(' ');
    lines.push([
      r.key,
      csvEscape(r.label),
      csvEscape(tags),
      csvEscape(r.meaning),
      csvEscape(r.advice),
      cat.category,
      '',
      ''
    ].join(','));
  });
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`[packs] ${cat.id}: wrote ${rows.length} → ${outPath}`);
}

function main() {
  for (const cat of CATS) {
    const rows = makeRows(cat);
    writeCsv(cat, rows);
  }
  console.log('[packs] done. You can import with: npm run dict:import -- data/packs');
}

main();

