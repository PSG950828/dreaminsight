/**
 * Generate additional synthetic cases for regression
 * Usage: TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/gen-cases.ts
 */
import * as fs from 'fs';

function main() {
  const out: any[] = [];
  const colors = ['빨간불','노란불','초록빛','푸른빛','보랏빛','검은 그림자'];
  const emos = ['불안했다','두려웠다','슬펐다','행복했다','화가 났다'];
  const combos: Array<[string,string,string[]?,string?]> = [
    ['열쇠를 잃어버렸다', 'key_lost'],
    ['문이 잠겼다', 'door_locked'],
    ['여권을 잃어버렸다', 'passport_lost'],
    ['폰이 꺼졌다', 'phone_dead'],
    ['지갑을 잃어버렸다', 'wallet_lost'],
    ['시험을 봤다', 'exam'],
    ['말이 나오지 않았다', 'cannot_speak'],
    ['추락했다', 'falling'],
    ['치아가 부서졌다', 'teeth'],
    ['지하철이 붐볐다', 'subway_crowd']
  ];
  let id = 100;
  for (const c of colors) {
    out.push({ id: `g${id++}`, text: `${c}이 보였다`, notes: 'color cue' });
  }
  for (const e of emos) {
    out.push({ id: `g${id++}`, text: `나는 ${e}`, notes: 'emotion cue' });
  }
  for (let i=0; i<combos.length; i++) {
    for (let j=i+1; j<combos.length; j++) {
      const a = combos[i][0], ak = combos[i][1];
      const b = combos[j][0], bk = combos[j][1];
      out.push({ id: `g${id++}`, text: `${a}. ${b}.`, expectSymbols: [ak,bk] });
    }
  }
  fs.mkdirSync('data/tests', { recursive: true });
  fs.writeFileSync('data/tests/generated.json', JSON.stringify(out, null, 2), 'utf-8');
  console.log(`Wrote data/tests/generated.json (${out.length} cases)`);
}

main();

