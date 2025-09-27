"use client";
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Analysis = {
  summary: string;
  symbols: Array<{ label: string; tags: string[]; meaning: string; advice?: string }>;
  emotions: string[];
  colors: { key: string; cue: string }[];
  actions: string[];
  patterns: string[];
  advice: string[];
  journalingPrompts: string[];
};
type Journal = { id: string; text: string; createdAt: number; analysis: Analysis };

const STORAGE_KEY = 'dreaminsight.journals.v1';

function loadJournals(): Journal[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Journal[] : []; }
  catch { return []; }
}
function saveJournals(list: Journal[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}
function exportAll(journals: Journal[]) {
  try {
    const blob = new Blob([JSON.stringify(journals, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dreaminsight-journals-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  } catch {}
}

export default function JournalPage() {
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [q, setQ] = React.useState('');
  const [range, setRange] = React.useState<number>(30);

  React.useEffect(() => {
    // 우선 로컬 로드
    setJournals(loadJournals());
    // 서버에 구성되어 있으면 병합
    (async () => {
      try {
        const r = await fetch('/api/journal?limit=1000', { cache: 'no-store' });
        if (!r.ok) return; // not configured or error → 무시
        const j = await r.json();
        const server: Journal[] = (j.items || []).map((it: any) => ({ id: String(it.id), text: String(it.text || ''), createdAt: Number(it.createdAt || Date.now()), analysis: (it.analysis || { summary: '', symbols: [], emotions: [], colors: [], actions: [], patterns: [], advice: [], journalingPrompts: [] }) }));
        // createdAt+text 키로 중복 제거 병합
        const key = (x: Journal) => `${x.createdAt}|${x.text.slice(0,64)}`;
        const map = new Map<string, Journal>();
        for (const s of server) map.set(key(s), s);
        for (const l of loadJournals()) if (!map.has(key(l))) map.set(key(l), l);
        const merged = Array.from(map.values()).sort((a,b)=> b.createdAt - a.createdAt);
        setJournals(merged);
      } catch {}
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const since = Date.now() - (range === 9999 ? 36500 : range) * 24 * 60 * 60 * 1000;
    const text = q.trim().toLowerCase();
    return journals
      .filter(j => j.createdAt >= since)
      .filter(j => !text || j.text.toLowerCase().includes(text) || j.analysis.summary.toLowerCase().includes(text))
      .sort((a,b)=> b.createdAt - a.createdAt);
  }, [journals, q, range]);

  function remove(id: string) {
    const next = journals.filter(j => j.id !== id); setJournals(next); saveJournals(next);
    try { fetch(`/api/journal/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(()=>{}); } catch {}
  }
  function clearAll() {
    if (!confirm('모든 꿈 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    setJournals([]); saveJournals([]);
  }
  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const text = await f.text().catch(()=> '');
    try {
      const arr = JSON.parse(text) as Journal[];
      if (!Array.isArray(arr)) throw new Error('invalid');
      const merged = [...arr, ...journals].sort((a,b)=> b.createdAt - a.createdAt);
      setJournals(merged); saveJournals(merged);
      alert('가져오기 완료');
    } catch { alert('가져오기 실패: JSON 형식 확인'); }
    e.currentTarget.value = '';
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">나의 꿈 보관함</h1>
          <Link href="/" className="underline text-sm">← 해석으로 돌아가기</Link>
        </div>

        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">검색/정렬</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            <input className="bg-transparent border rounded px-2 py-1" placeholder="내용/요약 검색" value={q} onChange={(e)=>setQ(e.target.value)} />
            <select className="bg-transparent border rounded px-2 py-1" value={range} onChange={(e)=>setRange(parseInt(e.target.value)||30)}>
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
              <option value={9999}>전체</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={()=>exportAll(journals)}>백업</Button>
              <label className="px-3 py-1.5 rounded-md border cursor-pointer">불러오기
                <input type="file" accept="application/json" className="hidden" onChange={onImport} />
              </label>
              <Button size="sm" variant="secondary" onClick={clearAll}>전체 삭제</Button>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <div className="text-sm opacity-70">저장된 꿈이 없습니다. 해석 페이지에서 꿈을 분석하고 저장해 보세요.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(j => (
              <Card key={j.id} className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="opacity-70 text-xs">{new Date(j.createdAt).toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={()=>remove(j.id)}>삭제</Button>
                      <Link href={`/?prefill=${encodeURIComponent(j.text)}`} className="px-3 py-1.5 rounded-md border text-xs">다시 해석</Link>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap leading-6">{j.text}</div>
                  <div className="opacity-80">요약: {j.analysis.summary}</div>
                  {!!j.analysis.symbols?.length && (
                    <div className="text-xs opacity-80">상징: {j.analysis.symbols.map(s=>s.label).join(', ')}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
