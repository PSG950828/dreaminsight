"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type DictItem = { key: string; label: string; tags: string[]; category?: string|null };

export default function EncyclopediaPage() {
  const [items, setItems] = useState<DictItem[]>([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  async function load() {
    setLoading(true);
    try {
      const url = new URL('/api/dictionary/list', location.origin);
      if (q) url.searchParams.set('q', q);
      if (tag) url.searchParams.set('tag', tag);
      if (category) url.searchParams.set('category', category);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      const r = await fetch(url.toString());
      const j = await r.json();
      if (!r.ok) { alert(j?.error || '사전 조회 실패'); return; }
      setItems(j.items || []);
      setTotal(j.total || 0);
      setCount(j.count || 0);
      setTags(j.tags || {});
      setCategories(j.categories || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [page, pageSize]);

  // Telemetry helper
  function bumpTelemetry(key: string) {
    try {
      const raw = localStorage.getItem('di.telemetry') || '{}';
      const obj = JSON.parse(raw) as Record<string, number>;
      obj[key] = (obj[key] || 0) + 1;
      localStorage.setItem('di.telemetry', JSON.stringify(obj));
    } catch {}
    try {
      const [type, k] = key.split('.', 2);
      fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, key: k || key, delta: 1 }) }).catch(()=>{});
    } catch {}
  }

  // Fire open list event once
  useEffect(()=>{ try { bumpTelemetry('enc.open.list'); } catch {} }, []);

  const tagList = useMemo(()=> Object.entries(tags).sort((a,b)=> b[1]-a[1]).slice(0, 30), [tags]);
  const categoryList = useMemo(()=> Object.entries(categories).sort((a,b)=> b[1]-a[1]).slice(0, 20), [categories]);
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  useEffect(()=>{ if (page > totalPages) setPage(1); }, [count, pageSize]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">꿈 백과 — 사전</h1>
          <div className="text-sm opacity-70">전체 {total}개</div>
        </div>

        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">검색/태그</CardTitle></CardHeader>
          <CardContent className="text-sm flex items-center gap-2 flex-wrap">
            <input className="bg-transparent border rounded px-2 py-1" placeholder="라벨/키워드" value={q} onChange={(e)=>setQ(e.target.value)} onBlur={()=>{ if (q.trim()) bumpTelemetry('enc.search'); }} />
            <select className="bg-transparent border rounded px-2 py-1" value={tag} onChange={(e)=>{ setTag(e.target.value); if (e.target.value) bumpTelemetry(`enc.filter.tag.${e.target.value}`); }}>
              <option value="">전체 태그</option>
              {tagList.map(([t,c])=> (<option key={t} value={t}>{t} ({c})</option>))}
            </select>
            <select className="bg-transparent border rounded px-2 py-1" value={category} onChange={(e)=>{ setCategory(e.target.value); if (e.target.value) bumpTelemetry(`enc.filter.category.${e.target.value}`); }}>
              <option value="">전체 분류</option>
              {categoryList.map(([c,n])=> (<option key={c} value={c}>{c} ({n})</option>))}
            </select>
            <Button size="sm" variant="secondary" onClick={()=>{ setPage(1); load(); bumpTelemetry('enc.search'); }} disabled={loading}>{loading? '조회중…' : '조회'}</Button>
          </CardContent>
        </Card>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {tagList.slice(0, 10).map(([t]) => (
            <button key={`chip-t-${t}`} className={`px-2 py-1 rounded-full border text-xs ${tag===t? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''}`} onClick={()=>{ setTag(tag===t? '' : t); setPage(1); load(); }}>{t}</button>
          ))}
          {categoryList.slice(0, 6).map(([c]) => (
            <button key={`chip-c-${c}`} className={`px-2 py-1 rounded-full border text-xs ${category===c? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''}`} onClick={()=>{ setCategory(category===c? '' : c); setPage(1); load(); }}>{c}</button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {items.length === 0 ? (
            <div className="text-xs opacity-60">결과 없음</div>
          ) : items.map(it => (
            <Link key={it.key} href={`/encyclopedia/${encodeURIComponent(it.key)}`} onClick={()=> bumpTelemetry(`enc.click.item.${it.key}`)} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60">
              <div className="font-medium">{it.label} <span className="opacity-60 text-xs">({it.key})</span></div>
              {it.tags?.length ? (
                <div className="text-[11px] opacity-70 mt-1">{it.tags.join(', ')}</div>
              ) : null}
              {it.category && (
                <div className="text-[11px] opacity-60 mt-1">{it.category}</div>
              )}
            </Link>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs opacity-70">{count}개 중 페이지 {page}/{totalPages}</div>
          <div className="flex items-center gap-2">
            <select className="bg-transparent border rounded px-2 py-1 text-xs" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)||50); setPage(1); }}>
              {[25,50,100,150,200].map(n => (<option key={n} value={n}>{n}/페이지</option>))}
            </select>
            <Button size="sm" variant="secondary" disabled={page<=1} onClick={()=>setPage(p=> Math.max(1, p-1))}>이전</Button>
            <Button size="sm" variant="secondary" disabled={page>=totalPages} onClick={()=>setPage(p=> Math.min(totalPages, p+1))}>다음</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
