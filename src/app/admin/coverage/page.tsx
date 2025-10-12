"use client";
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CovItem = { w: string; c: number; suggest: Array<{ key:string; label:string }> };

export default function CoveragePage() {
  const [items, setItems] = React.useState<CovItem[]>([]);
  const [days, setDays] = React.useState(30);
  const [limit, setLimit] = React.useState(300);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [targetKey, setTargetKey] = React.useState('');

  async function load() {
    setBusy(true); setMsg('');
    try {
      const url = new URL(`/api/stats/coverage?days=${days}&limit=${limit}`, location.origin);
      const r = await fetch(url.toString(), { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setItems(j.items || []); else setMsg(j?.error || '조회 실패');
    } catch (e:any) { setMsg('오류: ' + (e?.message || e)); }
    finally { setBusy(false); }
  }

  async function saveTopN(n: number) {
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
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">미커버 토큰 — 서버 동의어 주입</h1>
          <Link href="/stats" className="text-sm underline">← /stats</Link>
        </div>

        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">조회</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="opacity-70 text-xs">기간</span>
              <input className="bg-transparent border rounded px-2 py-1 w-20" value={days} onChange={(e)=> setDays(Math.max(1, parseInt(e.target.value)||7))} />
              <span className="opacity-70 text-xs">limit</span>
              <input className="bg-transparent border rounded px-2 py-1 w-24" value={limit} onChange={(e)=> setLimit(Math.max(10, parseInt(e.target.value)||100))} />
              <Button size="sm" variant="secondary" onClick={load} disabled={busy}>{busy? '조회중…':'조회'}</Button>
            </div>
            {msg && <div className="text-xs opacity-80">{msg}</div>}
            <div className="text-xs opacity-70">TIP: 조회 후 아래에서 상위 N개를 선택한 심볼 키에 서버 동의어로 일괄 저장할 수 있습니다.</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">일괄 저장</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <input className="bg-transparent border rounded px-2 py-1 text-xs flex-1" placeholder="심볼 키(예: elevator)" value={targetKey} onChange={(e)=> setTargetKey(e.target.value)} />
              {[50,100,200].map(n => (
                <Button key={n} size="sm" onClick={()=> saveTopN(n)} disabled={busy || !items.length}>{busy? '저장중…' : `상위 ${n} 저장`}</Button>
              ))}
            </div>
            <div className="text-xs opacity-70">주의: 관리자 권한(쿠키)이 필요합니다. 실패 항목은 개별 저장을 시도하세요.</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">미커버 토큰 목록</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {items.length === 0 ? (
              <div className="text-xs opacity-60">데이터 없음 — 먼저 조회하세요.</div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-1">
                {items.map((it, i) => (
                  <div key={i} className="px-2 py-1 rounded-md border text-xs">
                    <div className="flex items-center justify-between">
                      <span className="truncate" title={it.w}>{it.w}</span>
                      <span className="opacity-60 tabular-nums">{it.c}</span>
                    </div>
                    {it.suggest?.length ? (
                      <div className="opacity-70 mt-0.5 truncate">{it.suggest.map(s => s.label).join(', ')}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

