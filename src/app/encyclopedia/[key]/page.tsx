"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMergedSymbols, getMergedAliases } from '@/lib/dictionary';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

export default function SymbolDetailPage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
  const syms = getMergedSymbols();
  const s = (syms as any)[key];
  const aliases = (getMergedAliases()[key] || []).slice(0, 100);
  const [plus, setPlus] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await fetch('/api/me', { cache: 'no-store' }); const j = await r.json(); setPlus(!!j?.plus); } catch {}
    })();
  }, []);

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

  // Hooks below must run unconditionally; handle missing symbol in the computations

  const longNarrative = useMemo(() => {
    if (!s) return '';
    const label = s.label || key;
    const tags = (s.tags || []).slice(0, 6);
    const ctxPsych = s.contexts?.psych || '';
    const cat = (s as any).category || '';
    const base: string[] = [];
    base.push(`${label}은(는) ${cat || '상징'}으로서 ${tags.length ? tags.join('·') : '핵심'} 테마를 비춥니다.`);
    base.push(`꿈에서 ${label}이(가) 등장할 때는 최근의 사건·감정·결정을 연결해 보는 것이 중요합니다. 같은 상징이라도 빈도/강도/맥락(누구와, 어디서, 어떤 색·감정이 동반되었는지)에 따라 메시지가 달라집니다.`);
    if (s.meaning && s.meaning.length > 0) base.push(`핵심 해석: ${s.meaning}`);
    if (ctxPsych) base.push(`심리 관점: ${ctxPsych}`);
    base.push(`${label}이(가) 반복된다면 ‘첫 기억’과 ‘가장 강한 감정’을 기록하고, 깨어있는 시간의 장면과 연결 지어 3문장으로 요약해 보세요. 반복 패턴은 삶의 한 영역(관계/일/건강/디지털/자연 등)을 은유하는 경우가 많습니다.`);
    base.push(`실천 팁: 1) 감정 라벨 1개, 2) 연결된 장면 3문장, 3) 10~25분짜리 작은 행동 1개를 오늘 바로 실행하면 꿈의 신호를 현실의 변화로 번역할 수 있습니다.`);
    return base.join('\n\n');
  }, [key]);

  const exampleScenes = useMemo(() => {
    if (!s) return [] as string[];
    const t = (s.tags || []).join(' ');
    const out: string[] = [];
    if (/감정|물|바다|정화/.test(t)) out.push('탁한 물이 맑아지는 장면 — 감정 정화/회복의 신호');
    if (/관계|경계|소통/.test(t)) out.push('가까운 사람과의 대화에서 말이 막히는 장면 — 경계/표현 과제');
    if (/전환|이동|여정/.test(t)) out.push('공항 게이트 앞에서 여권을 확인하는 장면 — 전환의 문턱/자격 확인');
    if (/평가|시험|표현/.test(t)) out.push('시험장에서 답안이 생각나지 않는 장면 — 기준/자기효능감 조정');
    if (/자연|폭발|폭풍|번개/.test(t)) out.push('천둥 번개 뒤 맑아지는 하늘 — 정화 후 새로운 관점');
    return out;
  }, [key]);

  // ---------- Inline auto-linking to related encyclopedia entries ----------
  function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const linkIndex = useMemo(() => {
    if (!s) return { re: null, map: new Map<string,string>() };
    // Build candidate labels from symbols that share at least one tag or same category
    const curTags: string[] = (s.tags || []) as string[];
    const curCat: string = (s as any).category || '';
    const pairs: Array<{ label: string; key: string }> = [];
    for (const [k, v] of (Object.entries(syms) as Array<[string, any]>)) {
      if (k === key) continue;
      const vt: string[] = ((v as any).tags || []) as string[];
      const sameTag = vt.some(t => curTags.includes(t));
      const sameCat = curCat && (v as any).category === curCat;
      if (!sameTag && !sameCat) continue;
      const labels = String((v as any).label || '').split(/\//).map((x: string) => x.trim()).filter(Boolean);
      labels.forEach((lab: string) => {
        if (lab.length >= 2 && lab !== s.label) pairs.push({ label: lab, key: k });
      });
    }
    // Sort by label length desc to prefer longer matches first
    pairs.sort((a,b)=> b.label.length - a.label.length);
    // Cap to avoid huge regex
    const capped = pairs.slice(0, 150);
    const map = new Map<string, string>();
    capped.forEach(p => { if (!map.has(p.label)) map.set(p.label, p.key); });
    const labels = Array.from(map.keys());
    const re = labels.length ? new RegExp(`(${labels.map(escRe).join('|')})`, 'g') : null;
    return { re, map } as { re: RegExp | null; map: Map<string,string> };
  }, [key]);

  function linkify(text: string): React.ReactNode {
    const { re, map } = linkIndex;
    if (!text) return null;
    if (!re) return text;
    const parts: React.ReactNode[] = [];
    let last = 0;
    const src = text;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const idx = m.index;
      const hit = m[0];
      if (idx > last) parts.push(src.slice(last, idx));
      const k = map.get(hit);
      if (k) {
        parts.push(
          <Link key={`${hit}-${idx}`} href={`/encyclopedia/${encodeURIComponent(k)}`} className="underline decoration-dotted underline-offset-2">
            {hit}
          </Link>
        );
      } else {
        parts.push(hit);
      }
      last = idx + hit.length;
    }
    if (last < src.length) parts.push(src.slice(last));
    return <>{parts}</>;
  }

  const faqJson = useMemo(() => {
    if (!s) return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] } as any;
    const qa = [
      { q: `${s.label} 꿈은 무슨 의미인가요?`, a: s.meaning || `${s.label}은(는) 반복될수록 개인 맥락과 연결해 해석합니다.` },
      { q: `${s.label} 꿈이 반복되면 어떻게 해석하나요?`, a: '반복은 현재 삶의 특정 패턴을 가리킬 수 있습니다. 최근 장면과 감정/결정의 연결을 3문장으로 기록해 보세요.' },
      { q: `${s.label}을(를) 꿨을 때 무엇을 하면 좋나요?`, a: s.advice || '가장 작은 행동 1가지를 10분 이내로 시작하세요.' },
      { q: `${s.label}과(와) 비슷한 상징은 무엇인가요?`, a: '연결 태그가 겹치는 상징들을 함께 참고하세요. 같은 테마(예: 전환/경계/정화)에서 의미가 강화됩니다.' },
      { q: `${s.label} 색/감정과 함께 나오면?`, a: '검정·빨강은 경고/통제 저하, 초록·하양은 회복/정화를 암시하는 경우가 많습니다. 느낀 감정 라벨 1개를 먼저 적어보세요.' },
    ];
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: qa.map(({q,a}) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    } as any;
  }, [key]);

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
        {/* SEO: FAQ Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
        <div className="text-sm flex items-center justify-between">
          <Link href="/encyclopedia" className="underline">← 사전 목록</Link>
          <Link href={`/?prefill=${encodeURIComponent(s.label)}&tab=history`} onClick={()=> bumpTelemetry(`enc.click.start.${key}`)} className="px-3 py-1.5 rounded-md border text-xs">해석 시작</Link>
        </div>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">{s.label} <span className="opacity-60 text-xs">({key})</span></CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            {/* 개요/심층 해설(공개) */}
            <div>
              <div className="font-medium mb-1">심층 해설(개요)</div>
              <div className="opacity-90 whitespace-pre-wrap">{linkify(longNarrative)}</div>
            </div>
            {s.tags?.length ? (<div className="opacity-80">태그: {s.tags.join(', ')}</div>) : null}
            {s.category ? (<div className="opacity-60">분류: {s.category}</div>) : null}
            {s.meaning ? (
              <div>
                <div className="font-medium mb-1">의미</div>
                <div className="opacity-90 whitespace-pre-wrap">{linkify(String(s.meaning || ''))}</div>
              </div>
            ) : null}
            {s.advice ? (
              <div>
                <div className="font-medium mb-1">조언</div>
                <div className="opacity-90 whitespace-pre-wrap">{s.advice}</div>
              </div>
            ) : null}
            {exampleScenes.length ? (
              <div>
                <div className="font-medium mb-1">예시 장면</div>
                <ul className="list-disc list-inside opacity-90">
                  {exampleScenes.map((x,i)=>(<li key={i}>{linkify(x)}</li>))}
                </ul>
              </div>
            ) : null}
            {s.contexts?.psych && (
              <div>
                <div className="font-medium mb-1">심리 메모</div>
                <div className="opacity-90 whitespace-pre-wrap">{s.contexts.psych}</div>
              </div>
            )}
            {(s.contexts?.culture?.kr || s.contexts?.culture?.en) && (
              <div>
                <div className="font-medium mb-1">문화 메모</div>
                <div className="opacity-90 whitespace-pre-wrap">
                  {s.contexts?.culture?.kr ? `KR: ${s.contexts.culture.kr}` : ''}
                  {s.contexts?.culture?.en ? `\nEN: ${s.contexts.culture.en}` : ''}
                </div>
              </div>
            )}
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

            {/* Plus 영역: 심층 인사이트/코칭 */}
            <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="font-medium">심층 인사이트</div>
                {!plus && (
                  <button disabled={checkoutBusy} onClick={async()=>{
                    try { setCheckoutBusy(true); const r = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: 'month' }) }); const j = await r.json(); if (j?.url) location.href = j.url; } finally { setCheckoutBusy(false); }
                  }} className="text-xs px-2 py-1 rounded border">{checkoutBusy? '연결중…' : 'Plus 구독'}</button>
                )}
              </div>
              {plus ? (
                <div className="opacity-90 text-sm mt-2">
                  • {s.label}는(은) { (s.tags||[]).slice(0,3).join('·') } 테마의 심층 신호입니다. 해석에서 반복된다면, 최근 일상의 어떤 장면과 연결되는지 3문장으로 기록해 보세요.
                  <br/>• 행동: {s.advice || '관련된 가장 작은 행동 1가지를 10분 이내로 시작해 보세요.'}
                </div>
              ) : (
                <div className="opacity-70 text-xs mt-2">Plus에서 심층 인사이트와 코칭 팁이 열립니다.</div>
              )}
            </div>
          </CardContent>
        </Card>
        <OftenTogether currentKey={key} />
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

function OftenTogether({ currentKey }: { currentKey: string }) {
  const syms = getMergedSymbols() as any;
  const cur = syms[currentKey];
  if (!cur) return null;
  const curTags: string[] = (cur.tags || []) as string[];
  const curCat: string = (cur.category || '') as string;
  const scored: Array<{ key:string; label:string; score:number; why:string }> = [];
  for (const [k, v] of Object.entries(syms)) {
    if (k === currentKey) continue;
    const vt: string[] = (v as any).tags || [];
    const inter = vt.filter(t => curTags.includes(t));
    const sameCat = curCat && (v as any).category === curCat;
    const score = inter.length + (sameCat ? 1 : 0);
    if (score <= 0) continue;
    const why = `${sameCat ? '같은 분류·' : ''}공유 태그 ${inter.length}`.replace(/·공유 태그 0$/,'');
    scored.push({ key: k, label: (v as any).label, score, why });
  }
  scored.sort((a,b)=> b.score - a.score || a.label.localeCompare(b.label, 'ko'));
  const top = scored.slice(0, 8);
  if (top.length === 0) return null;
  return (
    <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
      <CardHeader className="pb-2"><CardTitle className="text-lg">함께 자주 등장</CardTitle></CardHeader>
      <CardContent className="text-sm grid gap-2 sm:grid-cols-2">
        {top.map(it => (
          <Link key={it.key} href={`/encyclopedia/${encodeURIComponent(it.key)}`} className="p-2 rounded border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
            <div className="font-medium">{it.label} <span className="opacity-60 text-[11px]">({it.key})</span></div>
            <div className="text-[11px] opacity-70 mt-0.5">{it.why}</div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
