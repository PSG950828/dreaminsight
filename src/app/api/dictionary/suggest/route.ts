import { NextResponse } from 'next/server';
import { getMergedAliases, getMergedSymbols, normalizeText } from '@/lib/dictionary';

function tokenizeKoEn(s: string): string[] {
  const n = normalizeText(s || '')
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n) return [];
  return n.split(' ').filter(Boolean);
}

const STOP = new Set<string>([
  '나','너','그','그녀','우리','너희','이','그것','뭐','하다','했다','했어','했다가','있다','있었어','있어요','꿈','꿈에서','꿈을','그리고','또','또한','또는','하지만','그러나','그래서','입니다','했다','했다는','됨','같다','듯','거','것','수','등','더','좀','잘','못','때','곳','듯함','만','약간','조금','매우','정말','진짜','개','존나','겁나','되게','완전','ㅋㅋ','ㅎㅎ','하하','헤헷','zz'
]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({} as any));
    const text = String(body?.text || '');
    if (!text.trim()) return NextResponse.json({ error: 'no_text' }, { status: 400 });
    const aliases = getMergedAliases();
    const symbols = getMergedSymbols();
    const known = new Set<string>();
    for (const list of Object.values(aliases)) {
      (list || []).forEach(a => { const k = normalizeText(a).replace(/\s+/g,''); if (k) known.add(k); });
    }
    // include symbol labels/tags as known
    for (const [k, v] of Object.entries(symbols)) {
      const label = normalizeText((v as any).label || '').replace(/\s+/g,'');
      if (label) known.add(label);
      ((v as any).tags || []).forEach((t: string) => { const z = normalizeText(t).replace(/\s+/g,''); if (z) known.add(z); });
    }
    const tokens = tokenizeKoEn(text);
    const mergedText = normalizeText(text).replace(/\s+/g,'');
    // find matched symbol keys (rough by alias regex via label includes)
    const matchedKeys: string[] = [];
    for (const [key, v] of Object.entries(symbols)) {
      const lbl = normalizeText((v as any).label || '').replace(/\s+/g,'');
      if (lbl && mergedText.includes(lbl)) matchedKeys.push(key);
    }

    const candidates = Array.from(new Set(tokens))
      .filter(t => t.length >= 2 && !STOP.has(t))
      .filter(t => !/^[0-9]+$/.test(t))
      .filter(t => !known.has(t.replace(/\s+/g,'')));

    return NextResponse.json({ tokens, matchedKeys, candidates });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 400 });
  }
}

