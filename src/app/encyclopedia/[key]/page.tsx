"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMergedSymbols, getMergedAliases } from '@/lib/dictionary';
import Link from 'next/link';
import React, { useEffect } from 'react';

export default function SymbolDetailPage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
  const syms = getMergedSymbols();
  const s = (syms as any)[key];
  const aliases = (getMergedAliases()[key] || []).slice(0, 100);

  function bumpTelemetry(k: string) {
    try {
      const raw = localStorage.getItem('di.telemetry') || '{}';
      const obj = JSON.parse(raw) as Record<string, number>;
      obj[k] = (obj[k] || 0) + 1;
      localStorage.setItem('di.telemetry', JSON.stringify(obj));
    } catch {}
    try { const [type, kk] = k.split('.',2); fetch('/api/telemetry', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type, key: kk||k, delta:1 }) }).catch(()=>{}); } catch {}
  }
  useEffect(()=>{ if (s) bumpTelemetry(`enc.open.symbol.${key}`); }, [key]);

  if (!s) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-4">
          <div className="text-sm"><Link href="/encyclopedia" className="underline">← 사전 목록</Link></div>
          <div className="text-xl font-bold">항목을 찾을 수 없습니다</div>
          <div className="opacity-70">키: {key}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="text-sm flex items-center justify-between">
          <Link href="/encyclopedia" className="underline">← 사전 목록</Link>
          <Link href={`/?prefill=${encodeURIComponent(s.label)}&tab=history`} onClick={()=> bumpTelemetry(`enc.click.start.${key}`)} className="px-3 py-1.5 rounded-md border text-xs">해석 시작</Link>
        </div>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">{s.label} <span className="opacity-60 text-xs">({key})</span></CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            {s.tags?.length ? (<div className="opacity-80">태그: {s.tags.join(', ')}</div>) : null}
            {s.category ? (<div className="opacity-60">분류: {s.category}</div>) : null}
            {s.meaning ? (
              <div>
                <div className="font-medium mb-1">의미</div>
                <div className="opacity-90 whitespace-pre-wrap">{s.meaning}</div>
              </div>
            ) : null}
            {s.advice ? (
              <div>
                <div className="font-medium mb-1">조언</div>
                <div className="opacity-90 whitespace-pre-wrap">{s.advice}</div>
              </div>
            ) : null}
            <div>
              <div className="font-medium mb-1">동의어(최대 100개)</div>
              {aliases.length ? (
                <div className="text-xs flex flex-wrap gap-1">
                  {aliases.map((a,i)=>(<span key={i} className="px-2 py-0.5 rounded-full border">{a}</span>))}
                </div>
              ) : (
                <div className="text-xs opacity-60">등록된 동의어가 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>
        <RelatedByTags currentKey={key} />
        <RelatedByCategory currentKey={key} />
      </div>
    </div>
  );
}

function RelatedByTags({ currentKey }: { currentKey: string }) {
  const syms = getMergedSymbols() as any;
  const cur = syms[currentKey];
  const curTags: string[] = (cur?.tags || []) as string[];
  if (!cur || curTags.length === 0) return null;
  const scores: Array<{ key:string; label:string; score:number; tags:string[] }> = [];
  for (const [k, v] of Object.entries(syms)) {
    if (k === currentKey) continue;
    const vt: string[] = (v as any).tags || [];
    const inter = vt.filter(t => curTags.includes(t));
    if (inter.length > 0) scores.push({ key: k, label: (v as any).label, score: inter.length, tags: inter });
  }
  scores.sort((a,b)=> b.score - a.score || a.label.localeCompare(b.label, 'ko'));
  const top = scores.slice(0, 10);
  if (top.length === 0) return null;
  return (
    <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
      <CardHeader className="pb-2"><CardTitle className="text-lg">관련 항목</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-2">
        {top.map(it => (
          <Link key={it.key} href={`/encyclopedia/${encodeURIComponent(it.key)}`} className="block p-2 rounded border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.label} <span className="opacity-60 text-xs">({it.key})</span></div>
              <div className="text-[11px] opacity-70">공유 태그 {it.score}</div>
            </div>
            <div className="text-[11px] opacity-70 mt-1">{it.tags.join(', ')}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function RelatedByCategory({ currentKey }: { currentKey: string }) {
  const syms = getMergedSymbols() as any;
  const cur = syms[currentKey];
  const cat: string | undefined = (cur?.category || undefined) as any;
  if (!cur || !cat) return null;
  const items: Array<{ key:string; label:string }> = [];
  for (const [k, v] of Object.entries(syms)) {
    if (k === currentKey) continue;
    if ((v as any).category === cat) items.push({ key: k, label: (v as any).label });
  }
  if (items.length === 0) return null;
  items.sort((a,b)=> a.label.localeCompare(b.label, 'ko'));
  const top = items.slice(0, 12);
  return (
    <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
      <CardHeader className="pb-2"><CardTitle className="text-lg">같은 분류의 항목</CardTitle></CardHeader>
      <CardContent className="text-sm grid gap-2 sm:grid-cols-2">
        {top.map(it => (
          <Link key={it.key} href={`/encyclopedia/${encodeURIComponent(it.key)}`} className="p-2 rounded border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
            <div className="font-medium">{it.label} <span className="opacity-60 text-xs">({it.key})</span></div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
