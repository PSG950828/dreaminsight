"use client";
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMergedAliases, getMergedSymbols, normalizeText } from '@/lib/dictionary';

export default function BulkSuggestPage() {
  const [fileName, setFileName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [items, setItems] = React.useState<Array<{ w: string; c: number }>>([]);
  const [msg, setMsg] = React.useState('');
  const [targetKey, setTargetKey] = React.useState('');

  function buildKnownSet(): Set<string> {
    const aliases = getMergedAliases();
    const symbols = getMergedSymbols() as any;
    const known = new Set<string>();
    Object.values(aliases).forEach((list) => (list || []).forEach(a => { const k = normalizeText(a).replace(/\s+/g,''); if (k) known.add(k); }));
    for (const [, v] of Object.entries(symbols)) {
      const label = normalizeText((v as any).label || '').replace(/\s+/g,''); if (label) known.add(label);
      ((v as any).tags || []).forEach((t: string) => { const z = normalizeText(t).replace(/\s+/g,''); if (z) known.add(z); });
    }
    return known;
  }

  const STOP = new Set<string>([
    '나','너','그','그녀','우리','너희','이','그것','뭐','하다','했다','했어','했다가','있다','있었어','있어요','꿈','꿈에서','꿈을','그리고','또','또한','또는','하지만','그러나','그래서','입니다','했다','했다는','됨','같다','듯','거','것','수','등','더','좀','잘','못','때','곳','듯함','만','약간','조금','매우','정말','진짜','개','존나','겁나','되게','완전','ㅋㅋ','ㅎㅎ','하하','헤헷','zz'
  ]);

  function tokenizeAll(s: string): string[] {
    const n = normalizeText(s || '')
      .replace(/[^a-z0-9가-힣\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!n) return [];
    return n.split(' ').filter(Boolean);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setFileName(f.name); setItems([]); setMsg('');
    try {
      const txt = await f.text();
      const tokens = tokenizeAll(txt);
      const known = buildKnownSet();
      const counts = new Map<string, number>();
      for (const t of tokens) {
        if (t.length < 2) continue;
        if (STOP.has(t)) continue;
        if (/^[0-9]+$/.test(t)) continue;
        const k = t.replace(/\s+/g,'');
        if (known.has(k)) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
      const arr = Array.from(counts.entries()).map(([w,c])=>({ w, c })).sort((a,b)=> b.c - a.c).slice(0, 500);
      setItems(arr);
      setMsg(arr.length ? `후보 ${arr.length}개 (상위 500)` : '후보 없음');
    } catch (e:any) {
      setMsg('업로드 실패: ' + (e?.message || e));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function onUse(w: string) {
    try { navigator.clipboard.writeText(w); setMsg(`복사됨: ${w} — /stats 페이지에서 붙여넣어 저장하세요.`); } catch { setMsg('클립보드 복사 실패'); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">미커버 토큰 — 파일 업로드</h1>
          <Link href="/stats" className="text-sm underline">← /stats</Link>
        </div>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">파일 업로드</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-md border cursor-pointer text-xs">파일 선택
                <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onUpload} className="hidden" />
              </label>
              <div className="text-xs opacity-70">{fileName || 'TXT/CSV: 텍스트 전체에서 후보 추출'}</div>
              <div className="flex-1" />
              {busy && <div className="text-xs opacity-70">분석중…</div>}
            </div>
            {msg && <div className="text-xs opacity-80">{msg}</div>}
            {items.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {items.map((it,i)=> (
                  <button key={i} className="px-2 py-1 rounded-md border text-xs flex items-center justify-between gap-2" onClick={()=> onUse(it.w)}>
                    <span className="truncate">{it.w}</span>
                    <span className="opacity-60">{it.c}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="text-xs opacity-70">TIP: 버튼을 클릭하면 후보 단어가 복사됩니다. /stats → “사전 동의어 추가(로컬/서버)” 입력에 붙여넣으세요.</div>
            <div className="mt-3 p-2 rounded-md border">
              <div className="text-xs opacity-70 mb-1">대량 서버 저장(관리자): 아래 심볼 키에 상위 N개 후보를 일괄 저장합니다.</div>
              <div className="flex items-center gap-2 mb-2">
                <input className="bg-transparent border rounded px-2 py-1 text-xs flex-1" placeholder="심볼 키(예: elevator)" value={targetKey} onChange={(e)=> setTargetKey(e.target.value)} />
                <Button size="sm" variant="secondary" onClick={()=> location.href='/stats'}>동의어 관리로 이동</Button>
              </div>
              <div className="flex items-center gap-2">
                {[100,300,500].map(n => (
                  <Button key={n} size="sm" onClick={async()=>{
                    if (!targetKey.trim()) { alert('심볼 키를 입력하세요.'); return; }
                    setBusy(true); setMsg('서버 저장중…');
                    try {
                      const batch = items.slice(0, n);
                      let ok=0, fail=0;
                      for (const it of batch) {
                        try {
                          const r = await fetch('/api/admin/dict/aliases', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: targetKey.trim(), alias: it.w }) });
                          if (r.ok) ok++; else fail++;
                        } catch { fail++; }
                      }
                      setMsg(`서버 저장 완료: 성공 ${ok}/${n} · 실패 ${fail}`);
                    } finally {
                      setBusy(false);
                    }
                  }}>{n}개 저장</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
