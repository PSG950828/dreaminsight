/**
 * Restore-helper: JSON 배열 파일(백업 스냅샷) → INSERT SQL 생성
 * Usage:
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/restore-db-from-json.ts <table> <json_file>
 *   # 예) posts.json → posts 테이블로 INSERT SQL 출력
 */

import * as fs from 'fs';

function esc(v: any) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  // ISO date → to_timestamp (optional). 여기서는 문자열로 그대로 삽입.
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function main() {
  const [table, file] = process.argv.slice(2);
  if (!table || !file) {
    console.error('Usage: ts-node restore-db-from-json.ts <table> <json_file>');
    process.exit(2);
  }
  const raw = fs.readFileSync(file, 'utf-8');
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr) || arr.length === 0) {
    console.error('JSON must be a non-empty array');
    process.exit(3);
  }
  const cols = Array.from(new Set(arr.flatMap((o: any) => Object.keys(o))));
  console.log(`-- Insert into ${table} from ${file}`);
  console.log('begin;');
  for (const row of arr) {
    const values = cols.map((c) => esc((row as any)[c]));
    console.log(`insert into ${table} (${cols.join(',')}) values (${values.join(',')}) on conflict do nothing;`);
  }
  console.log('commit;');
}

main();

