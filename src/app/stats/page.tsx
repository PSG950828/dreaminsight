"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMergedSymbols, refreshAliasPatterns } from "@/lib/dictionary";
import { loadUserAliases, upsertUserAliases } from "@/lib/dictStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Bucket = { label: string; count: number };

function Bar({ items, prevMap, onLabelClick }: { items: Bucket[]; prevMap?: Record<string, number>; onLabelClick?: (label: string) => void }) {
  const top = items.slice(0, 10);
  const peak = Math.max(1, ...top.map(i=>i.count));
  return (
    <div className="space-y-2">
      {top.map((it, idx) => {
        const prev = prevMap ? (prevMap[it.label] || 0) : 0;
        const diff = it.count - prev;
        const sign = diff > 0 ? '+' : diff < 0 ? '' : '';
        const pct = prev > 0 ? Math.round((diff / prev) * 100) : (it.count > 0 ? 100 : 0);
        const delta = prevMap ? ` (${sign}${diff}${prev>0?`, ${sign}${pct}%`:''})` : '';
        return (
        <div key={idx} className="text-xs">
          <div className="flex justify-between mb-1">
            {onLabelClick ? (
              <button className="truncate mr-2 underline" onClick={()=> onLabelClick(it.label)} title="상세 보기">{it.label}</button>
            ) : (
              <span className="truncate mr-2">{it.label}</span>
            )}
            <span className="opacity-60">{it.count}{delta}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className="h-2 bg-zinc-500/70 dark:bg-zinc-300/70" style={{ width: `${Math.round((it.count/peak)*100)}%` }} />
          </div>
        </div>
        );})}
      {top.length === 0 && <div className="text-xs opacity-60">데이터 없음</div>}
    </div>
  );
}

export default function StatsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [days, setDays] = useState(30);
  const [sym, setSym] = useState<Bucket[]>([]);
  const [sug, setSug] = useState<Bucket[]>([]);
  const [act, setAct] = useState<Bucket[]>([]);
  const [prevSym, setPrevSym] = useState<Record<string, number>>({});
  const [prevSug, setPrevSug] = useState<Record<string, number>>({});
  const [prevAct, setPrevAct] = useState<Record<string, number>>({});
  const [upsell, setUpsell] = useState<{ opens: Bucket[]; subscribes: Bucket[] } | null>(null);
  const [checkout, setCheckout] = useState<{ starts: Bucket[]; successes: Bucket[] } | null>(null);
  const [uploads, setUploads] = useState<{ successes: Bucket[]; fails: Bucket[]; all: Bucket[] } | null>(null);
  const [funnel, setFunnel] = useState<{ upsell: { open: Bucket[]; click: Bucket[] }; referral: { start: Bucket[] }; checkout: { start: number; success: number; startByPlan: Bucket[]; successByPlan: Bucket[] } } | null>(null);
  const [series, setSeries] = useState<{ symbols: Record<string, number[]>; suggestions: Record<string, number[]>; actions: Record<string, number[]>; uploads?: Record<string, number[]>; dayLabels: string[]; hours: { symbol: number[]; suggestion: number[]; 'action.done': number[]; upload?: number[] }; hoursByLabel: { symbol: Record<string, number[]>; suggestion: Record<string, number[]>; 'action.done': Record<string, number[]>; upload?: Record<string, number[]> } } | null>(null);
  const [kpis, setKpis] = useState<{ unknownTotal: number; suggestionTotal: number; symbolTotal: number; unknownRate: number; noiseTotal?: number } | null>(null);
  const [ency, setEncy] = useState<{ opens: Bucket[]; starts: Bucket[] } | null>(null);
  const [upsellSeries, setUpsellSeries] = useState<{ dayLabels: string[]; openByContext: Record<string, number[]>; subscribeByContext: Record<string, number[]>; hours: { open:number[]; subscribe:number[] } } | null>(null);
  const [checkoutSeries, setCheckoutSeries] = useState<{ dayLabels: string[]; success: { day: number[]; month: number[] }; ratio: number[] } | null>(null);
  const [abSeries, setAbSeries] = useState<{ dayLabels: string[]; open: {A:number[];B:number[]}; subscribe:{A:number[];B:number[]}; rate:{A:number[];B:number[];delta:number[]} } | null>(null);
  const [backups, setBackups] = useState<{ db: Array<{ path:string; url:string|null }>; storage: Array<{ path:string; url:string|null }> }|null>(null);
  // 우선 개선 임계치
  const [prioMinOpen, setPrioMinOpen] = useState<number>(50);
  const [prioMinDiff, setPrioMinDiff] = useState<number>(5);

  // Load/save threshold presets
  useEffect(() => {
    try {
      const raw = localStorage.getItem('di.stats.prio');
      if (raw) {
        const obj = JSON.parse(raw) as { open?: number; diff?: number };
        if (typeof obj.open === 'number') setPrioMinOpen(obj.open);
        if (typeof obj.diff === 'number') setPrioMinDiff(obj.diff);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('di.stats.prio', JSON.stringify({ open: prioMinOpen, diff: prioMinDiff })); } catch {}
  }, [prioMinOpen, prioMinDiff]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<{ type: 'symbol'|'suggestion'|'action.done'; label: string } | null>(null);
  const [alias, setAlias] = useState("");
  const [aliasMsg, setAliasMsg] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [topCombos, setTopCombos] = useState<Array<{ label: string; count: number }>>([]);
  // Toast
  const [toast, setToast] = useState<string>("");
  const [toastAt, setToastAt] = useState<number>(0);
  function showToast(msg: string) { setToast(msg); setToastAt(Date.now()); setTimeout(()=> setToast(''), 2500); }
  // Health state
  const [health, setHealth] = useState<any>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  async function runHealth() {
    try { const r = await fetch('/api/admin/health'); const j = await r.json(); if (r.ok) setHealth(j); else showToast('환경 점검 실패'); } catch { showToast('환경 점검 오류'); }
  }
  async function runOneClickBackup() {
    if (!confirm('원클릭 백업을 실행할까요? (최근 30일: DB 스냅샷 + 스토리지 매니페스트)')) return;
    try {
      const r1 = await fetch('/api/admin/backup/db?days=30', { method: 'POST' });
      const j1 = await r1.json();
      const r2 = await fetch('/api/admin/backup/storage?days=30', { method: 'POST' });
      const j2 = await r2.json();
      if (r1.ok && r2.ok) showToast(`백업 완료: DB ${j1.files?.length||0} / Storage posts ${j2.withFiles||0}`);
      else showToast('원클릭 백업 일부 실패');
    } catch { showToast('원클릭 백업 오류'); }
  }
  // 동의어 제안(텍스트 기반)
  const [sampleText, setSampleText] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/stats?days=${days}`);
      const j = await r.json();
      if (r.ok) {
        const filt = (arr: Bucket[]) => arr.filter(x => !filter || x.label.toLowerCase().includes(filter.toLowerCase()));
        setSym(filt(j.symbols || []));
        setSug(filt(j.suggestions || []));
        setAct(filt(j.actions || []));
        setUpsell(j.upsell || null);
        setCheckout(j.checkout || null);
        setUploads(j.uploads || null);
        setEncy(j.encyclopedia || null);
        setUpsellSeries(j.upsellSeries || null);
        setCheckoutSeries(j.checkoutSeries || null);
        setAbSeries(j.abSeries || null);
        setKpis(j.kpis || null);
        const toMap = (arr: Bucket[]) => Object.fromEntries((arr||[]).map((x:Bucket)=>[x.label, x.count] as const));
        setPrevSym(toMap(j.prev?.symbols || []));
        setPrevSug(toMap(j.prev?.suggestions || []));
        setPrevAct(toMap(j.prev?.actions || []));
        setSeries(j.series || null);
      }
      // Funnel (upsell→checkout)
      try {
        const rf = await fetch(`/api/stats/funnel?days=${days}`);
        const jf = await rf.json();
        if (rf.ok) setFunnel(jf);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function loadBackups() {
    try { const r = await fetch('/api/admin/backup/list'); const j = await r.json(); if (r.ok) setBackups(j.backups || null); } catch {}
  }

  useEffect(()=>{ 
    (async ()=>{
      try {
        const r = await fetch('/api/me-admin');
        const j = await r.json();
        setIsAdmin(!!j?.admin);
        if (j?.admin) load();
        // 최근 동기화 시각 초기화
        try { const v = localStorage.getItem('dreaminsight.aliases.bump'); if (v) setLastSyncAt(Number(v) || null); } catch {}
        // 로컬 조합 로드
        try { setTopCombos(readTopCombos()); } catch {}
      } catch {}
    })();
  }, []);

  useEffect(()=>{ if (isAdmin) load(); }, [days, isAdmin]);
  useEffect(()=>{ if (isAdmin) load(); }, [filter]);
  useEffect(()=>{ if (isAdmin) loadBackups(); }, [isAdmin]);

  async function login() {
    const r = await fetch('/api/me-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (r.ok) { setIsAdmin(true); setPassword(""); load(); } else { alert('인증 실패'); }
  }

  async function syncServerAliases() {
    setSyncBusy(true);
    try {
      const me = await fetch('/api/me-admin', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({admin:false}));
      if (!me?.admin) { alert('관리자만 사용할 수 있습니다.'); return; }
      const resp = await fetch('/api/admin/dict/aliases', { cache: 'no-store' });
      if (!resp.ok) { const j = await resp.json().catch(()=>({})); alert('동기화 실패: '+(j?.error||'오류')); return; }
      const data = await resp.json();
      const items: Array<{ sym_key: string; alias: string }> = data?.items || [];
      const map: Record<string, string[]> = {};
      for (const it of items) {
        const k = String((it as any)?.sym_key || '').trim();
        const a = String((it as any)?.alias || '').trim();
        if (!k || !a) continue;
        if (!map[k]) map[k] = [];
        if (!map[k].includes(a)) map[k].push(a);
      }
      try {
        localStorage.setItem('dreaminsight.admin.aliases.v1', JSON.stringify(map));
        const now = Date.now();
        localStorage.setItem('dreaminsight.aliases.bump', String(now));
        refreshAliasPatterns();
        setLastSyncAt(now);
        showToast('동의어 동기화 완료(즉시 반영)');
      } catch {}
    } catch (e:any) {
      alert('동기화 오류: '+(e?.message||e));
    } finally {
      setSyncBusy(false);
    }
  }

  async function suggestFromText() {
    setSuggestBusy(true);
    try {
      const r = await fetch('/api/dictionary/suggest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: sampleText }) });
      const j = await r.json();
      if (!r.ok) { alert(j?.error || '제안 실패'); return; }
      setSuggested(j.candidates || []);
    } finally {
      setSuggestBusy(false);
    }
  }

  // 다른 탭에서 동기화되면 표시 업데이트
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dreaminsight.aliases.bump') {
        const n = Number(e.newValue || '');
        if (!Number.isNaN(n)) setLastSyncAt(n);
      }
      if (e.key === 'di.combo.v1') {
        try { setTopCombos(readTopCombos()); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="max-w-md mx-auto p-6 text-center space-y-3">
          <h1 className="text-xl font-bold">서버 텔레메트리 — 관리자</h1>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="관리자 비밀번호" type="password" className="border rounded px-3 py-2 text-sm bg-transparent w-full" />
          <div className="flex items-center justify-center gap-2">
            <Button onClick={login}>로그인</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        {toast && (
          <div key={toastAt} className="fixed top-3 right-3 z-50 px-3 py-2 text-xs rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow">
            {toast}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">DreamInsight — 서버 텔레메트리</h1>
          <div className="flex items-center gap-2 text-sm">
            <Button size="sm" variant="secondary" onClick={()=> setHelpOpen(true)}>도움말</Button>
            <Link href="/admin/coverage" className="px-3 py-1.5 rounded-md border">Coverage</Link>
            <span className="opacity-70">기간</span>
            <select className="bg-transparent border rounded-md px-2 py-1" value={days} onChange={(e)=>setDays(parseInt(e.target.value)||30)}>
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
            <span className="opacity-70">임계치</span>
            <input className="w-20 bg-transparent border rounded px-2 py-1" type="number" min={0} value={prioMinOpen} onChange={(e)=>setPrioMinOpen(parseInt(e.target.value)||0)} title="최소 열람 수(우선 개선)" />
            <span className="opacity-70 text-xs">open↑</span>
            <input className="w-16 bg-transparent border rounded px-2 py-1" type="number" min={0} value={prioMinDiff} onChange={(e)=>setPrioMinDiff(parseInt(e.target.value)||0)} title="최소 Δ%p(우선 개선)" />
            <span className="opacity-70 text-xs">Δ%p↑</span>
            <Button size="sm" variant="secondary" onClick={()=>{ setPrioMinOpen(50); setPrioMinDiff(5); }}>50/5</Button>
            <Button size="sm" variant="secondary" onClick={()=>{ setPrioMinOpen(100); setPrioMinDiff(8); }}>100/8</Button>
            <Button size="sm" variant="secondary" onClick={()=>{ setPrioMinOpen(200); setPrioMinDiff(10); }}>200/10</Button>
            <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="라벨 검색" className="bg-transparent border rounded-md px-2 py-1" />
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>{loading ? '갱신중…' : '새로고침'}</Button>
            {upsell && (
              <Button size="sm" variant="secondary" onClick={()=>{
                // Build CSV: context-level totals + variant breakdown (A/B)
                const openArr = upsell.opens || [];
                const subArr = upsell.subscribes || [];
                const parseCtxVar = (label: string) => {
                  // label is like: open.ctx.variant or click.subscribe.ctx.variant
                  const parts = label.split('.');
                  if (parts.length >= 3) return { ctx: parts[1], var: parts[2] };
                  return { ctx: 'unknown', var: 'unknown' };
                };
                const openAgg = new Map<string, { total: number; A: number; B: number }>();
                const subAgg = new Map<string, { total: number; A: number; B: number }>();
                for (const o of openArr) {
                  const { ctx, var: v } = parseCtxVar(o.label);
                  const rec = openAgg.get(ctx) || { total: 0, A: 0, B: 0 };
                  rec.total += o.count;
                  if (v === 'A') rec.A += o.count; else if (v === 'B') rec.B += o.count;
                  openAgg.set(ctx, rec);
                }
                for (const s of subArr) {
                  const { ctx, var: v } = parseCtxVar(s.label);
                  const rec = subAgg.get(ctx) || { total: 0, A: 0, B: 0 };
                  rec.total += s.count;
                  if (v === 'A') rec.A += s.count; else if (v === 'B') rec.B += s.count;
                  subAgg.set(ctx, rec);
                }
                const rows: string[] = [];
                rows.push(['context','opens_total','subs_total','rate_total','opens_A','subs_A','rate_A','opens_B','subs_B','rate_B'].join(','));
                const contexts = Array.from(new Set([...openAgg.keys(), ...subAgg.keys()]));
                for (const ctx of contexts) {
                  const o = openAgg.get(ctx) || { total:0, A:0, B:0 };
                  const s = subAgg.get(ctx) || { total:0, A:0, B:0 };
                  const rt = o.total>0 ? (s.total/o.total) : 0;
                  const rA = o.A>0 ? (s.A/o.A) : 0;
                  const rB = o.B>0 ? (s.B/o.B) : 0;
                  rows.push([
                    ctx,
                    String(o.total), String(s.total), (rt*100).toFixed(1)+'%',
                    String(o.A), String(s.A), (rA*100).toFixed(1)+'%',
                    String(o.B), String(s.B), (rB*100).toFixed(1)+'%'
                  ].join(','));
                }
                const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `upsell-funnel-${days}d.csv`; a.click(); URL.revokeObjectURL(url);
              }}>CSV(업셀)</Button>
            )}
            <Button size="sm" variant="secondary" onClick={syncServerAliases} disabled={syncBusy}>{syncBusy ? '동기화…' : '동의어 동기화'}</Button>
            {lastSyncAt && <span className="opacity-60">최근 동기화 {new Date(lastSyncAt).toLocaleString()}</span>}
            <Button size="sm" variant="secondary" onClick={async()=>{
              if (!confirm('DB 백업을 시작할까요? (최근 30일, 수동 실행)')) return;
              try {
                const r = await fetch('/api/admin/backup/db?days=30', { method: 'POST' });
                const j = await r.json();
                if (r.ok) showToast(`백업 완료: ${j.files?.length||0}개 파일`);
                else alert('백업 실패: ' + (j?.error || '오류'));
              } catch (e:any) { alert('백업 오류: ' + (e?.message || e)); }
            }}>DB 백업(수동)</Button>
            <Button size="sm" variant="secondary" onClick={runOneClickBackup}>원클릭 백업(30일)</Button>
            <Button size="sm" variant="secondary" onClick={async()=>{
              if (!confirm('스토리지 매니페스트를 생성할까요? (최근 30일, 수동 실행)')) return;
              try {
                const r = await fetch('/api/admin/backup/storage?days=30', { method: 'POST' });
                const j = await r.json();
                if (r.ok) showToast(`스토리지 매니페스트 완료: ${j.withFiles||0}개 post`);
                else alert('매니페스트 실패: ' + (j?.error || '오류'));
              } catch (e:any) { alert('매니페스트 오류: ' + (e?.message || e)); }
            }}>스토리지 매니페스트</Button>
            <Button size="sm" variant="secondary" onClick={async()=>{
              try {
                const r = await fetch('/api/admin/backup/list');
                const j = await r.json();
                if (r.ok) {
                  const db = (j.backups?.db||[]).length;
                  const st = (j.backups?.storage||[]).length;
                  showToast(`백업 파일 — DB:${db}, Storage:${st}`);
                } else alert('백업 목록 실패: ' + (j?.error || '오류'));
              } catch (e:any) { alert('백업 목록 오류: ' + (e?.message || e)); }
            }}>백업 목록</Button>
            <Button size="sm" variant="secondary" onClick={async()=>{
              if (!confirm('오래된 백업을 정리할까요? (90일 이전 삭제)')) return;
              try {
                const r = await fetch('/api/admin/backup/cleanup?days=90', { method: 'POST' });
                const j = await r.json();
                if (r.ok) showToast(`정리 완료: DB ${j.removedDbFiles||0} / Storage ${j.removedStorageFiles||0}`);
                else alert('정리 실패: ' + (j?.error || '오류'));
              } catch (e:any) { alert('정리 오류: ' + (e?.message || e)); }
            }}>백업 정리(90일)</Button>
            <Button size="sm" variant="secondary" onClick={async()=>{
              if (!confirm('스토리지 매니페스트를 생성할까요? (최근 30일, 수동 실행)')) return;
              try {
                const r = await fetch('/api/admin/backup/storage?days=30', { method: 'POST' });
                const j = await r.json();
                if (r.ok) showToast(`스토리지 매니페스트 완료: ${j.withFiles||0}개 post`);
                else alert('매니페스트 실패: ' + (j?.error || '오류'));
              } catch (e:any) { alert('매니페스트 오류: ' + (e?.message || e)); }
            }}>스토리지 매니페스트</Button>
            <Button size="sm" variant="secondary" onClick={async()=>{
              try {
                const r = await fetch('/api/admin/backup/list');
                const j = await r.json();
                if (r.ok) {
                  const db = (j.backups?.db||[]).length;
                  const st = (j.backups?.storage||[]).length;
                  showToast(`백업 파일 — DB:${db}, Storage:${st}`);
                } else alert('백업 목록 실패: ' + (j?.error || '오류'));
              } catch (e:any) { alert('백업 목록 오류: ' + (e?.message || e)); }
            }}>백업 목록</Button>
            <Button size="sm" variant="secondary" onClick={()=>{
              const rows: string[] = ['type,label,count'];
              sym.forEach(x=> rows.push(`symbol,${x.label},${x.count}`));
              sug.forEach(x=> rows.push(`suggestion,${x.label},${x.count}`));
              act.forEach(x=> rows.push(`action.done,${x.label},${x.count}`));
              if (uploads) uploads.all.forEach(x=> rows.push(`upload,${x.label},${x.count}`));
              if (kpis?.noiseTotal) rows.push(`parse,noise,${kpis.noiseTotal}`);
              const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `stats-${days}d.csv`; a.click(); URL.revokeObjectURL(url);
            }}>CSV</Button>
            <Button size="sm" variant="secondary" onClick={()=>{
              if (!series) return;
              const head = ['type','label',...(series.dayLabels||[])];
              const rows: string[] = [head.join(',')];
              const push = (t: 'symbol'|'suggestion'|'action.done', obj: Record<string, number[]>) => {
                Object.entries(obj).slice(0,10).forEach(([label, arr]) => {
                  const line = [t, label, ...arr].join(','); rows.push(line);
                });
              };
              push('symbol', series.symbols);
              push('suggestion', series.suggestions);
              push('action.done', series.actions);
              if ((series as any).uploads) {
                Object.entries((series as any).uploads).forEach(([label, arr]: any) => {
                  rows.push(['upload', label, ...arr].join(','));
                });
              }
              if ((series as any).parse) {
                Object.entries((series as any).parse).forEach(([label, arr]: any) => {
                  rows.push(['parse', label, ...arr].join(','));
                });
              }
              const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `stats-series-${days}d.csv`; a.click(); URL.revokeObjectURL(url);
            }}>CSV(시리즈)</Button>
            <Button size="sm" variant="secondary" onClick={()=>{
              if (!series) return;
              const head = ['type','label',...Array.from({length:24},(_,i)=>`h${i}`)];
              const rows: string[] = [head.join(',')];
              const pushOverall = (t: 'symbol'|'suggestion'|'action.done', arr: number[]) => {
                rows.push([t, 'overall', ...arr].join(','));
              };
              // overall
              pushOverall('symbol', series.hours.symbol);
              pushOverall('suggestion', series.hours.suggestion);
              pushOverall('action.done', series.hours['action.done']);
              if ((series.hours as any).upload) rows.push(['upload','overall', ...((series.hours as any).upload||[])].join(','));
              if ((series.hours as any).parse) rows.push(['parse','overall', ...((series.hours as any).parse||[])].join(','));
              // top label hours (slice to 5 each)
              const pushByLabel = (t: 'symbol'|'suggestion'|'action.done', obj: Record<string, number[]>) => {
                Object.entries(obj).slice(0,5).forEach(([label, _]) => {
                  const arr = (series.hoursByLabel[t] || {})[label] || Array(24).fill(0);
                  rows.push([t, label, ...arr].join(','));
                });
              };
              pushByLabel('symbol', series.symbols);
              pushByLabel('suggestion', series.suggestions);
              pushByLabel('action.done', series.actions);
              if ((series.hoursByLabel as any).upload && (series as any).uploads) {
                Object.entries((series as any).uploads).slice(0,5).forEach(([label]: any)=>{
                  const arr = ((series.hoursByLabel as any).upload||{})[label] || Array(24).fill(0);
                  rows.push(['upload', label, ...arr].join(','));
                });
              }
              if (series.hours.upload) rows.push(['upload','overall', ...(series.hours.upload||[])].join(','));
              if ((series.hours as any).parse) rows.push(['parse','overall', ...((series.hours as any).parse||[])].join(','));
              if (series.hoursByLabel.upload && series.uploads) {
                Object.entries(series.uploads).slice(0,5).forEach(([label])=>{
                  const arr = (series.hoursByLabel.upload||{})[label] || Array(24).fill(0);
                  rows.push(['upload', label, ...arr].join(','));
                });
              }
              const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `stats-hours-${days}d.csv`; a.click(); URL.revokeObjectURL(url);
            }}>CSV(시간대)</Button>
          </div>
        </div>
        {kpis && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                <div>
                  <div className="text-[11px] opacity-60">심볼 매치</div>
                  <div className="text-lg font-semibold">{kpis.symbolTotal}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">미커버</div>
                  <div className="text-lg font-semibold">{kpis.unknownTotal}</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">미커버율</div>
                  <div className="text-lg font-semibold">{kpis.unknownRate}%</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">저정보 입력</div>
                  <div className="text-lg font-semibold">{kpis.noiseTotal || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>빠른 시작 — 운영 도움말</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <b>1) 환경 점검</b>
                <ul className="list-disc list-inside">
                  <li>상단 “환경 점검(초보자용)” 카드에서 점검 실행 → 초록 불 확인</li>
                  <li>필수 변수 누락/스토리지/RPC 에러는 카드의 권장 조치대로 해결</li>
                </ul>
              </div>
              <div>
                <b>2) 백업</b>
                <ul className="list-disc list-inside">
                  <li>“DB 백업(수동)”, “스토리지 매니페스트” 버튼으로 스냅샷 생성</li>
                  <li>“백업 목록/정리(90일)”로 파일 확인·삭제</li>
                </ul>
              </div>
              <div>
                <b>3) 지표 확인</b>
                <ul className="list-disc list-inside">
                  <li>KPI: 심볼/미커버/미커버율/저정보 — 미커버율 ≤ 10–15% 유지</li>
                  <li>시간대: 업로드/투표/신고/저정보 패턴 확인</li>
                </ul>
              </div>
              <div>
                <b>4) 사전 운영</b>
                <ul className="list-disc list-inside">
                  <li>“동의어 동기화”로 서버 동의어 즉시 반영(재컴파일)</li>
                  <li>/admin/suggest에서 후보 저장 → /stats로 효과 확인</li>
                </ul>
              </div>
              <div>
                <b>5) 장애/롤백</b>
                <ul className="list-disc list-inside">
                  <li>앱 롤백: Vercel 이전 성공 배포로 복구</li>
                  <li>데이터: DB 스냅샷 JSON으로 테이블 단위 복원</li>
                </ul>
              </div>
              <div className="text-xs opacity-70">자세한 절차: DEPLOY_PLAYBOOK.md / OPERATIONS_CHECKLIST.md 참고</div>
            </div>
          </DialogContent>
        </Dialog>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">환경 점검(초보자용)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={runHealth}>점검 실행</Button>
              <div className="opacity-70 text-xs">필수 항목: Supabase URL/Key, Service Role, Storage, RPC</div>
            </div>
            {health ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-medium">환경변수</div>
                  {Object.entries(health.checks?.env || {}).map(([k,v]: any)=> (
                    <div key={k} className="flex justify-between items-center">
                      <span>{k}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${v? 'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{v? 'OK':'MISSING'}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="font-medium">스토리지</div>
                  <div className="flex justify-between"><span>bucket</span><span>{health.checks?.storage?.bucket||'-'}</span></div>
                  <div className="flex justify-between items-center"><span>access</span><span className={`px-2 py-0.5 rounded-full text-[11px] ${health.checks?.storage?.ok? 'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{health.checks?.storage?.ok? 'OK':'FAIL'}</span></div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">DB Count</div>
                  {['posts','comments','reports','admin_aliases','entitlements','telemetry_events'].map((t)=> (
                    <div key={t} className="flex justify-between"><span>{t}</span><span>{health.checks?.db?.[t]?.count ?? '-'}</span></div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="font-medium">RPC</div>
                  <div className="flex justify-between items-center"><span>list_posts</span><span className={`px-2 py-0.5 rounded-full text-[11px] ${health.checks?.rpc?.list_posts?.ok? 'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{health.checks?.rpc?.list_posts?.ok? 'OK':'FAIL'}</span></div>
                </div>
                {Array.isArray(health.tips) && health.tips.length>0 && (
                  <div className="col-span-2 p-2 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                    <div className="font-medium mb-1">권장 조치</div>
                    <ul className="list-disc list-inside">
                      {health.tips.map((t:string,i:number)=>(<li key={i}>{t}</li>))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="opacity-70 text-xs">점검 실행을 눌러 환경 상태를 확인하세요.</div>
            )}
          </CardContent>
        </Card>
        {backups && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">백업 목록</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={loadBackups}>새로고침</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="opacity-70 mb-1 text-xs">DB 스냅샷(최근 10개)</div>
                  <div className="space-y-2 text-[12px]">
                    {(backups.db||[]).slice(0,10).map((b,i)=>{
                      const m = b.path.match(/backups\/db\/(.*?)\//);
                      const stamp = m?.[1] || '';
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <a className="underline truncate" href={b.url||'#'} target="_blank" rel="noreferrer">{b.path}</a>
                          {stamp && (
                            <Button size="sm" variant="secondary" onClick={async()=>{
                              if (!confirm(`DB 백업 삭제: ${stamp}?`)) return;
                              try {
                                const r = await fetch('/api/admin/backup/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prefix: `backups/db/${stamp}` }) });
                                const j = await r.json(); if (r.ok) { showToast(`삭제 완료: ${j.removed||0}`); loadBackups(); } else alert('삭제 실패: '+(j?.error||'오류'));
                              } catch (e:any) { alert('삭제 오류: '+(e?.message||e)); }
                            }}>삭제</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="opacity-70 mb-1 text-xs">스토리지 매니페스트(최근 10개)</div>
                  <div className="space-y-2 text-[12px]">
                    {(backups.storage||[]).slice(0,10).map((b,i)=> (
                      <div key={i} className="flex items-center gap-2">
                        <a className="underline truncate" href={b.url||'#'} target="_blank" rel="noreferrer">{b.path}</a>
                        <Button size="sm" variant="secondary" onClick={async()=>{
                          if (!confirm(`매니페스트 삭제: ${b.path}?`)) return;
                          try {
                            const r = await fetch('/api/admin/backup/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ paths: [b.path] }) });
                            const j = await r.json(); if (r.ok) { showToast(`삭제 완료: ${j.removed||0}`); loadBackups(); } else alert('삭제 실패: '+(j?.error||'오류'));
                          } catch (e:any) { alert('삭제 오류: '+(e?.message||e)); }
                        }}>삭제</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {checkout && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">결제 플로우 — 플랜별</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="opacity-70 mb-1 text-xs">시작 (checkout.start.*)</div>
                  <Bar items={checkout.starts} prevMap={{}} />
                </div>
                <div>
                  <div className="opacity-70 mb-1 text-xs">성공 (checkout.success.*)</div>
                  <Bar items={checkout.successes} prevMap={{}} />
                </div>
              </div>
              {/* Per-plan conversion */}
              <div className="mt-4 text-xs">
                <div className="opacity-70 mb-1">플랜별 전환율</div>
                {(() => {
                  const sMap = Object.fromEntries((checkout?.starts||[]).map(x => [x.label.split('.')[1]||x.label, x.count]));
                  const cMap = Object.fromEntries((checkout?.successes||[]).map(x => [x.label.split('.')[1]||x.label, x.count]));
                  const plans = Array.from(new Set([...Object.keys(sMap), ...Object.keys(cMap)])).sort();
                  if (plans.length === 0) return <div className="opacity-60">데이터 없음</div>;
                  return (
                    <div className="space-y-1">
                      {plans.map((p) => {
                        const start = sMap[p] || 0;
                        const succ = cMap[p] || 0;
                        const rate = start>0 ? Math.round((succ/start)*1000)/10 : 0;
                        return (
                          <div key={p} className="flex items-center justify-between">
                            <span className="truncate mr-2">{p}</span>
                            <span className="opacity-70">{succ}/{start} ({rate}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              {/* Rough Day→Month ratio (window-wise) */}
              <div className="mt-3 text-xs opacity-80">
                {(() => {
                  const day = (checkout?.successes||[]).find(x => x.label.endsWith('.day'))?.count || 0;
                  const mon = (checkout?.successes||[]).find(x => x.label.endsWith('.month'))?.count || 0;
                  if (day === 0) return null;
                  const ratio = Math.round((mon/day)*1000)/10;
                  return <div>Day→Month 전환(대략): {mon}/{day} ({ratio}%)</div>;
                })()}
              </div>
            </CardContent>
          </Card>
        )}
        {uploads && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">업로드 — 성공/실패</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="opacity-70 mb-1 text-xs">성공(upload.success)</div>
                  <Bar items={uploads.successes} prevMap={{}} />
                </div>
                <div>
                  <div className="opacity-70 mb-1 text-xs">실패(upload.fail)</div>
                  <Bar items={uploads.fails} prevMap={{}} />
                </div>
              </div>
              <div className="mt-3 text-xs opacity-80">총합: {(uploads.all||[]).reduce((a,b)=> a + (b.count||0), 0)}건</div>
              {series?.uploads && (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="opacity-70 mb-1 text-xs">일별 추이</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['success','fail','fail.too_large','fail.unsupported','fail.error'].filter(k => !!series?.uploads?.[k as any]).map(k => (
                        <MiniSpark key={k} label={`upload.${k}`} series={series?.uploads?.[k as any] || []} days={series?.dayLabels || []} />
                      ))}
                    </div>
                  </div>
                  {series.hours?.upload && (
                    <div>
                      <div className="opacity-70 mb-1 text-xs">시간대(전체)</div>
                      <HourHeat title="전체" arr={series.hours.upload} />
                      {series.hoursByLabel?.upload && (
                        <div className="mt-3">
                          <div className="opacity-70 mb-1 text-xs">시간대(상위 라벨)</div>
                          {Object.keys(series.uploads||{}).slice(0,3).map(k => (
                            <div key={k} className="mb-2">
                              <div className="text-[11px] opacity-70 mb-1">upload.{k}</div>
                              <HourHeat title="" arr={(series.hoursByLabel.upload||{})[k] || Array(24).fill(0)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {funnel && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">퍼널 — Upsell → Checkout (최근 {days}일)</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="opacity-70 mb-1 text-xs">Upsell — Open Top</div>
                  {funnel.upsell?.open?.slice(0,5).map((it,i)=> (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate mr-2">{it.label}</span>
                      <span className="opacity-70">{it.count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="opacity-70 mb-1 text-xs">Upsell — Click Top</div>
                  {funnel.upsell?.click?.slice(0,5).map((it,i)=> (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate mr-2">{it.label}</span>
                      <span className="opacity-70">{it.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="opacity-70 mb-1 text-xs">Checkout — Start vs Success</div>
                  <div className="text-xs">start: <b>{funnel.checkout?.start||0}</b> / success: <b>{funnel.checkout?.success||0}</b> ({(funnel.checkout?.start||0)>0 ? Math.round((funnel.checkout.success/(funnel.checkout.start||1))*1000)/10 : 0}% )</div>
                </div>
                <div>
                  <div className="opacity-70 mb-1 text-xs">Checkout — Success by Plan</div>
                  {funnel.checkout?.successByPlan?.slice(0,5).map((it,i)=> (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate mr-2">{it.label}</span>
                      <span className="opacity-70">{it.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {upsell && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">업셀 A/B 비교(전환률)</CardTitle>
                <div className="text-xs flex items-center gap-2">
                  <span className="opacity-70">최소 open</span>
                  <input className="w-16 bg-transparent border rounded px-2 py-1" type="number" min={0} value={(typeof (globalThis as any).__abMinOpen === 'number' ? (globalThis as any).__abMinOpen : 50)} onChange={(e)=>{ (globalThis as any).__abMinOpen = parseInt(e.target.value)||0; }} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              {(() => {
                const sumByVar = (arr: Bucket[], isOpen: boolean) => {
                  const m: Record<'A'|'B', number> = { A: 0, B: 0 } as any;
                  for (const it of arr) {
                    const parts = it.label.split('.');
                    const v = (isOpen ? parts[2] : parts[3]) as 'A'|'B';
                    if (v === 'A' || v === 'B') m[v] += it.count;
                  }
                  return m;
                };
                const open = sumByVar(upsell.opens||[], true);
                const sub = sumByVar(upsell.subscribes||[], false);
                const minOpen = (typeof (globalThis as any).__abMinOpen === 'number' ? (globalThis as any).__abMinOpen : 50);
                const valid = open.A >= minOpen && open.B >= minOpen;
                const rateA = open.A>0 ? Math.round((sub.A/open.A)*1000)/10 : 0;
                const rateB = open.B>0 ? Math.round((sub.B/open.B)*1000)/10 : 0;
                const delta = Math.round(Math.abs(rateB - rateA)*10)/10;
                return (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="opacity-70 mb-1">Variant A</div>
                      <div>open: {open.A} / subscribe: {sub.A} → {rateA}%</div>
                    </div>
                    <div>
                      <div className="opacity-70 mb-1">Variant B</div>
                      <div>open: {open.B} / subscribe: {sub.B} → {rateB}%</div>
                    </div>
                    <div className="col-span-2 mt-1">
                      {valid ? (
                        <div className="opacity-80">Δ(절대차): {delta}%p</div>
                      ) : (
                        <div className="opacity-60">표본 부족: 최소 open {minOpen} 이상에서 비교합니다.</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">상징 TOP</CardTitle></CardHeader>
          <CardContent>
            <Bar items={sym} prevMap={prevSym} onLabelClick={(label)=> setDetail({ type: 'symbol', label })} />
            {series && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sym.slice(0,4).map(s => (
                  <MiniSpark key={s.label} label={s.label} series={series.symbols[s.label] || []} days={series.dayLabels} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {upsell && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">업셀 퍼널(최근 {days}일)</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <UpsellFunnel opens={upsell.opens} subscribes={upsell.subscribes} />
            </CardContent>
          </Card>
        )}
        {ency && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">백과 인게이지먼트</CardTitle></CardHeader>
            <CardContent className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="opacity-70 mb-1 text-xs">상세 열람 TOP</div>
                <Bar items={ency.opens} prevMap={{}} onLabelClick={(label)=> { const k = label.replace('open.symbol.',''); window.open(`/encyclopedia/${encodeURIComponent(k)}`,'_blank'); }} />
              </div>
              <div>
                <div className="opacity-70 mb-1 text-xs">해석 시작 TOP</div>
                <Bar items={ency.starts} prevMap={{}} onLabelClick={(label)=> { const k = label.replace('click.start.',''); window.open(`/?prefill=${encodeURIComponent(k)}&tab=history`,'_blank'); }} />
              </div>
            </CardContent>
          </Card>
        )}
        {ency && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">백과 전환 퍼널</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <EncyFunnel opens={ency.opens} starts={ency.starts} />
            </CardContent>
          </Card>
        )}
        {upsell && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">업셀 A/B 전환 비교</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <UpsellABCompare opens={upsell.opens} subscribes={upsell.subscribes} />
            </CardContent>
          </Card>
        )}
        {upsell && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">우선 개선 컨텍스트</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <UpsellPriorityList opens={upsell.opens} subscribes={upsell.subscribes} minOpen={prioMinOpen} minDiff={prioMinDiff} />
            </CardContent>
          </Card>
        )}
        {upsell && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">업셀 실험 제안</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <UpsellRecommendations opens={upsell.opens} subscribes={upsell.subscribes} />
            </CardContent>
          </Card>
        )}
        {upsellSeries && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">업셀 시리즈/시간대</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(upsellSeries.openByContext).slice(0,4).map(([ctx, arr]) => (
                  <div key={`open-${ctx}`}>
                    <div className="text-xs opacity-70 mb-1">열람: {prettyCtx(ctx)}</div>
                    <MiniSpark label={ctx} series={arr} days={upsellSeries.dayLabels} />
                  </div>
                ))}
                {Object.entries(upsellSeries.subscribeByContext).slice(0,4).map(([ctx, arr]) => (
                  <div key={`sub-${ctx}`}>
                    <div className="text-xs opacity-70 mb-1">구독 클릭: {prettyCtx(ctx)}</div>
                    <MiniSpark label={ctx} series={arr} days={upsellSeries.dayLabels} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs opacity-70 mb-1">시간대 분포(열람)</div>
                  <HourHeat title="" arr={upsellSeries.hours.open} />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">시간대 분포(구독 클릭)</div>
                  <HourHeat title="" arr={upsellSeries.hours.subscribe} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <UpsellCopyEditor contexts={(() => {
          const set = new Set<string>();
          (upsell?.opens||[]).forEach(o=>{ const p=o.label.split('.'); if (p[0]==='open') set.add(p[1]||'unknown'); });
          (upsell?.subscribes||[]).forEach(s=>{ const p=s.label.split('.'); if (p[0]==='click'&&p[1]==='subscribe') set.add(p[2]||'unknown'); });
          // ensure known contexts included
          ['daily_limit','export_pdf','export_markdown','export_period_pdf','deep_narrative','gi_breakdown','preview_panel','report_panel','top_banner'].forEach(c=>set.add(c));
          return Array.from(set);
        })()} />
        {/* TOP 조합(상징×감정×색) — 로컬 누적 */}
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">TOP 조합(상징×감정×색)</CardTitle></CardHeader>
          <CardContent>
            {topCombos.length === 0 ? (
              <div className="text-xs opacity-60">로컬에 저장된 조합 데이터가 없습니다. 해석을 생성하면 누적됩니다.</div>
            ) : (
              <div className="space-y-2">
                {topCombos.slice(0,10).map((it, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="truncate mr-2">{it.label}</span>
                      <span className="opacity-60">{it.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-2 bg-zinc-500/70 dark:bg-zinc-300/70" style={{ width: `${Math.round((it.count / (topCombos[0]?.count||1))*100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* 미커버 토큰 TOP(로컬) */}
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">미커버 토큰 TOP(로컬)</CardTitle></CardHeader>
          <CardContent>
            <UnknownTop />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">제안 TOP</CardTitle></CardHeader>
          <CardContent>
            <Bar items={sug} prevMap={prevSug} onLabelClick={(label)=> setDetail({ type: 'suggestion', label })} />
            {series && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sug.slice(0,4).map(s => (
                  <MiniSpark key={s.label} label={s.label} series={series.suggestions[s.label] || []} days={series.dayLabels} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">코칭 완료 TOP</CardTitle></CardHeader>
          <CardContent>
            <Bar items={act} prevMap={prevAct} onLabelClick={(label)=> setDetail({ type: 'action.done', label })} />
            {series && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {act.slice(0,4).map(s => (
                  <MiniSpark key={s.label} label={s.label} series={series.actions[s.label] || []} days={series.dayLabels} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {series && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">시간대 히트맵(최근 {days}일)</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <HourHeat title="상징" arr={series.hours.symbol} />
              <HourHeat title="제안" arr={series.hours.suggestion} />
              <HourHeat title="코칭 완료" arr={series.hours['action.done']} />
            </CardContent>
          </Card>
        )}
        {checkoutSeries && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Day/Month 결제 추세</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <MiniSpark label="Day 성공" series={checkoutSeries.success.day} days={checkoutSeries.dayLabels} />
                <MiniSpark label="Month 성공" series={checkoutSeries.success.month} days={checkoutSeries.dayLabels} />
              </div>
              <div className="mt-3 text-xs">
                <div className="opacity-70 mb-1">Day→Month 비율(일별, %)</div>
                <div className="flex items-end gap-0.5 h-12">
                  {checkoutSeries.ratio.map((v,i)=> (
                    <div key={i} title={`${checkoutSeries.dayLabels[i]}: ${v}%`} className="w-2 bg-zinc-400 dark:bg-zinc-500 rounded" style={{ height: `${Math.min(100, Math.round(v))}%` }} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {abSeries && (
          <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
            <CardHeader className="pb-2"><CardTitle className="text-lg">업셀 A/B 추세(전환율)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <MiniSpark label="A: open" series={abSeries.open.A} days={abSeries.dayLabels} />
                <MiniSpark label="B: open" series={abSeries.open.B} days={abSeries.dayLabels} />
                <MiniSpark label="A: subscribe" series={abSeries.subscribe.A} days={abSeries.dayLabels} />
                <MiniSpark label="B: subscribe" series={abSeries.subscribe.B} days={abSeries.dayLabels} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniSpark label="A: rate %" series={abSeries.rate.A} days={abSeries.dayLabels} />
                <MiniSpark label="B: rate %" series={abSeries.rate.B} days={abSeries.dayLabels} />
                <MiniSpark label="Δ%p" series={abSeries.rate.delta} days={abSeries.dayLabels} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Detail Overlay */}
      {detail && series && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={()=> setDetail(null)}>
          <div className="bg-white dark:bg-zinc-900 w-full sm:w-[520px] rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800/60" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm">상세: {detail.type} · {detail.label}</div>
              <Button size="sm" variant="secondary" onClick={()=> setDetail(null)}>닫기</Button>
            </div>
            <MiniSpark label={detail.label} series={(detail.type==='symbol'?series.symbols[detail.label]:detail.type==='suggestion'?series.suggestions[detail.label]:series.actions[detail.label]) || []} days={series.dayLabels} />
            <div className="mt-3 text-xs">
              <div className="opacity-70 mb-1">시간대 분포</div>
              <HourHeat title="" arr={(series.hoursByLabel[detail.type] || {})[detail.label] || Array(24).fill(0)} />
            </div>
            <div className="mt-3 text-xs">
              <div className="opacity-70 mb-1">일별 값</div>
              <div className="max-h-40 overflow-auto border rounded-md p-2">
                {series.dayLabels.map((d,i)=> (
                  <div key={i} className="flex justify-between"><span>{d}</span><span>{((detail.type==='symbol'?series.symbols[detail.label]:detail.type==='suggestion'?series.suggestions[detail.label]:series.actions[detail.label])||[])[i] || 0}</span></div>
                ))}
              </div>
            </div>
            <div className="mt-3 text-xs">
              <div className="opacity-70 mb-1">추천 코칭</div>
              <ul className="list-disc list-inside space-y-1">
                {recommendForLabel(detail.type, detail.label).map((r,i)=>(<li key={i}><b>{r.title}</b> — {r.script}</li>))}
              </ul>
            </div>
            <div className="mt-3 text-xs">
              <div className="opacity-70 mb-1">관련 배지</div>
              <div className="flex flex-wrap gap-2">
                {extractBadges(detail.label).map((b,i)=>(<span key={i} className="px-2 py-0.5 rounded-full border text-[11px]">{b}</span>))}
              </div>
            </div>
            <div className="mt-3 text-xs flex items-center gap-2">
              <Link href={`/?prefill=${encodeURIComponent(detail.label)}&tab=history`} className="px-3 py-1.5 rounded-md border">해석으로 보내기</Link>
            </div>
            {detail.type === 'symbol' && (
              <div className="mt-3 text-xs">
                <div className="opacity-70 mb-1">사전 동의어 추가(로컬)</div>
                <div className="flex items-center gap-2">
                  <input id="alias-input" value={alias} onChange={(e)=>setAlias(e.target.value)} placeholder="새 동의어(예: 언성 높아짐)" className="bg-transparent border rounded-md px-2 py-1 flex-1" />
                  <Button size="sm" variant="secondary" onClick={()=>{
                    try {
                      // find symbol key by label
                      const syms = getMergedSymbols() as any;
                      const entry = Object.entries(syms).find(([,v]: any) => v.label === detail.label);
                      if (!entry) { setAliasMsg('심볼 키를 찾을 수 없습니다.'); return; }
                      const key = entry[0] as string;
                      const current = loadUserAliases();
                      const arr = Array.from(new Set([...(current[key]||[]), alias.trim()].filter(Boolean)));
                      if (!arr.length) { setAliasMsg('동의어를 입력하세요.'); return; }
                      upsertUserAliases(key, arr);
                      setAliasMsg('저장됨. 해석 엔진이 즉시 반영합니다.');
                      setAlias('');
                    } catch (e:any) { setAliasMsg('오류: '+(e?.message||e)); }
                  }}>로컬 저장</Button>
                  <Button size="sm" variant="secondary" onClick={async()=>{
                    try {
                      const syms = getMergedSymbols() as any;
                      const entry = Object.entries(syms).find(([,v]: any) => v.label === detail.label);
                      if (!entry) { setAliasMsg('심볼 키를 찾을 수 없습니다.'); return; }
                      const key = entry[0] as string;
                      const a = alias.trim(); if (!a) { setAliasMsg('동의어를 입력하세요.'); return; }
                      const r = await fetch('/api/admin/dict/aliases', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, alias: a }) });
                      if (!r.ok) { const j = await r.json().catch(()=>({})); setAliasMsg('서버 저장 실패: '+(j?.error||'오류')); return; }
                      // 저장 성공 시 즉시 동기화하여 패턴 재컴파일
                      try {
                        await syncServerAliases();
                        setAliasMsg('서버 사전 저장 + 동기화 완료. (즉시 반영됨)');
                        // Toast if available
                        try { (window as any).requestIdleCallback?.(()=>{}); } catch {}
                      } catch {
                        setAliasMsg('서버 사전 저장 완료. 동기화 실패 시 상단 버튼으로 재시도하세요.');
                      }
                      setAlias('');
                    } catch (e:any) { setAliasMsg('오류: '+(e?.message||e)); }
                  }}>서버 저장</Button>
                </div>
                {aliasMsg && <div className="mt-1 opacity-70">{aliasMsg}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Unknown tokens (local) ----------
function UnknownTop() {
  const [items, setItems] = React.useState<Array<{ w: string; c: number }>>([]);
  React.useEffect(()=>{
    try {
      const raw = localStorage.getItem('di.unknown.v1') || '{}';
      const obj = JSON.parse(raw) as Record<string, number>;
      const arr = Object.entries(obj).map(([w,c])=> ({ w, c: Number(c)||0 })).sort((a,b)=> b.c - a.c).slice(0, 30);
      setItems(arr);
    } catch { setItems([]); }
  }, []);
  function clearAll() {
    if (!confirm('미커버 토큰 로컬 데이터를 모두 삭제할까요?')) return;
    try { localStorage.removeItem('di.unknown.v1'); setItems([]); } catch {}
  }
  if (items.length === 0) return <div className="text-xs opacity-60">로컬 데이터 없음</div>;
  const peak = Math.max(1, ...items.map(i=>i.c));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end"><Button size="sm" variant="secondary" onClick={clearAll}>초기화</Button></div>
      {items.map((it, idx) => (
        <div key={idx} className="text-xs">
          <div className="flex justify-between mb-1">
            <span className="truncate mr-2">{it.w}</span>
            <span className="opacity-60">{it.c}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className="h-2 bg-zinc-500/70 dark:bg-zinc-300/70" style={{ width: `${Math.round((it.c/peak)*100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniSpark({ label, series, days }: { label: string; series: number[]; days: string[] }) {
  const max = Math.max(1, ...series);
  return (
    <div className="p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
      <div className="text-[11px] opacity-70 mb-1 truncate">{label}</div>
      <div className="flex items-end gap-0.5 h-12">
        {series.map((v, i) => (
          <div key={i} title={`${days[i]}: ${v}`} className="w-2 bg-zinc-400 dark:bg-zinc-500 rounded" style={{ height: `${Math.round((v/max)*100)}%` }} />
        ))}
      </div>
    </div>
  );
}

function HourHeat({ title, arr }: { title: string; arr: number[] }) {
  const max = Math.max(1, ...arr);
  const color = (v: number) => {
    const p = v / max;
    if (p === 0) return 'bg-zinc-100 dark:bg-zinc-900';
    if (p < 0.25) return 'bg-zinc-300 dark:bg-zinc-700';
    if (p < 0.5) return 'bg-zinc-400 dark:bg-zinc-600';
    if (p < 0.75) return 'bg-zinc-500 dark:bg-zinc-500';
    return 'bg-zinc-700 dark:bg-zinc-300';
  };
  return (
    <div>
      <div className="opacity-70 mb-1">{title}</div>
      <div className="grid grid-cols-12 gap-1">
        {arr.map((v, i) => (
          <div key={i} className={`h-4 rounded ${color(v)}`} title={`${i}:00 - ${v}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] opacity-60 mt-1">
        <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span>
      </div>
    </div>
  );
}

// ---------- Simple heuristic recommendations for a label ----------
function recommendForLabel(type: 'symbol'|'suggestion'|'action.done', label: string): Array<{ title: string; script: string }> {
  const l = (label || '').toLowerCase();
  const out: Array<{ title: string; script: string }> = [];
  const add = (title: string, script: string) => out.push({ title, script });
  // Relationship
  if (/말다툼|연인|싸움/.test(l)) add('I-메시지 10분', '사실-느낌-요구 각 1문장(I-메시지) 작성 → 전달 전 소리내어 읽기.');
  if (/질투|의심|읽씹|읽고 답/.test(l)) add('경계 회복 10분', '답장 기대를 24시간 유예하고, 오늘 나의 우선순위 1개에 집중.');
  if (/반지|결혼식/.test(l)) add('가치/약속 재선언', '관계 가치를 1문장으로 쓰고, 다음 7일의 작은 약속 1개를 합의.');
  // Health
  if (/검진|병원|검사/.test(l)) add('검진 질문 10분', '의사에게 물을 질문 1개와 최근 증상/기간/강도를 메모.');
  if (/두통|발열|기침|복통/.test(l)) add('회복 루틴 10분', '수분 섭취 + 눈 휴식/가벼운 스트레칭 + 자극 줄이기.');
  if (/수술/.test(l)) add('수술 준비 10분', '의견 2nd 후보 1명 찾기 + 준비/회복 체크리스트 초안.');
  // Digital/Security
  if (/로그인 실패|비번|비밀번호/.test(l)) add('비번/복구 10분', '비번 관리자 설정, 백업 코드 저장, 보안질문/메일 점검.');
  if (/2fa|인증/.test(l)) add('2FA 활성화 5분', '핵심 계정 2개에 2FA 즉시 켜기.');
  if (/해킹|탈취/.test(l)) add('즉시 보호 10분', '침해 계정 비번 변경 → 세션 종료 → 2FA → 의심 앱 점검.');
  if (/알림/.test(l)) add('알림 정리 10분', '오늘 하루 알림 채널 1개만 남기고 모두 끄기.');
  if (/동기화|파일 삭제|저장공간/.test(l)) add('백업/버전 15분', '휴지통/이전 버전 복구 확인 → 중요한 폴더 1개 수동 백업 → 버전 규칙 정하기.');
  // Privacy/Access
  if (/창문|프라이버시/.test(l)) add('공유 범위 10분', 'SNS/메신저 공개 범위를 2단계로 줄이고, 민감 정보 비공개 전환.');
  if (/문 잠김|열쇠/.test(l)) add('대안 접근 10분', '대안 문/연락처 1개 준비, 보관 장소 재설계.');
  // Natural/Noise
  if (/폭우|번개|눈보라|안개/.test(l)) add('정보 디톡스 10분', '알림/뉴스/피드 중단 → 핵심 3줄 요약만 남기기.');
  // Fallback
  if (out.length === 0) add('주의 전환 10분', '가장 작은 과제 1개를 골라 10분만 실행하고 완료 체크.');
  return out.slice(0, 3);
}

// ---------- Extract simple badges (colors/domains) from label ----------
function extractBadges(label: string): string[] {
  const l = (label || '').toLowerCase();
  const out: string[] = [];
  const add = (b: string) => { if (out.length < 6 && !out.includes(b)) out.push(b); };
  if (/빨강|red/.test(l)) add('빨강');
  if (/파랑|푸른|blue/.test(l)) add('파랑');
  if (/초록|녹색|green/.test(l)) add('초록');
  if (/검정|black/.test(l)) add('검정');
  if (/노랑|yellow/.test(l)) add('노랑');
  if (/보라|purple|자주/.test(l)) add('보라');
  if (/건강|검진|병원|수술|두통|복통|기침|발열/.test(l)) add('건강');
  if (/연인|친구|상사|동료|화해|질투|이별|가족/.test(l)) add('관계');
  if (/로그인|비번|2fa|해킹|알림|동기화|파일|용량|클라우드/.test(l)) add('디지털');
  return out;
}

// ---------- Read local combo counts and build labels ----------
function readTopCombos(): Array<{ label: string; count: number }> {
  try {
    const raw = localStorage.getItem('di.combo.v1');
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, number>;
    const syms = getMergedSymbols() as any;
    const arr: Array<{ label: string; count: number }> = [];
    for (const [k, v] of Object.entries(map)) {
      const m = /^S:(.*)\|E:(.*)\|C:(.*)$/.exec(k);
      if (!m) continue;
      const s = m[1]; const e = m[2]; const c = m[3];
      const sl = s && s !== '-' ? (syms[s]?.label || s) : '';
      const el = e && e !== '-' ? (syms[e]?.label || e) : '';
      const cl = c && c !== '-' ? (syms[c]?.label || c) : '';
      const parts = [sl, el, cl].filter(Boolean);
      if (parts.length === 0) continue;
      const label = parts.join(' × ');
      arr.push({ label, count: v as number });
    }
    return arr.sort((a,b)=> b.count - a.count);
  } catch {
    return [];
  }
}

// ---------- Upsell funnel component ----------
function UpsellFunnel({ opens, subscribes }: { opens: {label:string;count:number}[]; subscribes: {label:string;count:number}[] }) {
  // Aggregate by context (merge variants)
  const agg = (arr: {label:string;count:number}[], kind: 'open'|'click.subscribe') => {
    const map = new Map<string, number>();
    for (const it of arr) {
      const parts = it.label.split('.');
      // open.ctx.variant | click.subscribe.ctx.variant
      const ctx = kind === 'open' ? (parts[1] || 'unknown') : (parts[2] || 'unknown');
      map.set(ctx, (map.get(ctx) || 0) + (it.count || 0));
    }
    return Array.from(map.entries()).map(([label,count])=>({label,count})).sort((a,b)=> b.count - a.count);
  };
  const openCtx = agg(opens, 'open');
  const subCtx = agg(subscribes, 'click.subscribe');
  const conv = openCtx.map(o => {
    const s = subCtx.find(x => x.label === o.label)?.count || 0;
    const rate = o.count > 0 ? Math.round((s / o.count) * 100) : 0;
    return { label: o.label, open: o.count, sub: s, rate };
  }).slice(0, 10);

  return (
    <div className="space-y-2">
      {conv.length === 0 ? (
        <div className="text-xs opacity-60">업셀 데이터 없음</div>
      ) : (
        conv.map((it, idx) => (
          <div key={idx} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="truncate mr-2">{it.label}</span>
              <span className="opacity-60">{it.open} → {it.sub} ({it.rate}%)</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-2 bg-zinc-500/70 dark:bg-zinc-300/70" style={{ width: `${Math.max(5, Math.min(100, it.rate))}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function prettyCtx(ctx: string) {
  switch (ctx) {
    case 'daily_limit': return '일일 한도 초과';
    case 'export_pdf': return 'PDF 내보내기';
    case 'export_markdown': return 'Markdown 내보내기';
    case 'export_period_pdf': return '기간 PDF 내보내기';
    case 'deep_narrative': return '심층 전체 내러티브';
    case 'gi_breakdown': return 'GI 차원 분해';
    case 'preview_panel': return '미리보기 패널';
    case 'report_panel': return '리포트 패널';
    case 'top_banner': return '상단 무료 배너';
    default: return ctx || '기타';
  }
}

// ---------- Upsell A/B comparison ----------
function UpsellABCompare({ opens, subscribes }: { opens: {label:string;count:number}[]; subscribes: {label:string;count:number}[] }) {
  const parseCtxVar = (label: string) => {
    const parts = label.split('.');
    if (parts[0] === 'open') return { kind: 'open', ctx: parts[1] || 'unknown', variant: parts[2] || 'unknown' } as const;
    // click.subscribe.ctx.variant
    return { kind: 'subscribe', ctx: parts[2] || 'unknown', variant: parts[3] || 'unknown' } as const;
  };
  type AB = { A: number; B: number };
  const openByCtx: Record<string, AB> = {};
  const subByCtx: Record<string, AB> = {};
  for (const o of opens) {
    const p = parseCtxVar(o.label); if (p.kind !== 'open') continue;
    const rec = openByCtx[p.ctx] || { A:0, B:0 };
    if (p.variant === 'A') rec.A += o.count; else if (p.variant === 'B') rec.B += o.count;
    openByCtx[p.ctx] = rec;
  }
  for (const s of subscribes) {
    const p = parseCtxVar(s.label); if (p.kind !== 'subscribe') continue;
    const rec = subByCtx[p.ctx] || { A:0, B:0 };
    if (p.variant === 'A') rec.A += s.count; else if (p.variant === 'B') rec.B += s.count;
    subByCtx[p.ctx] = rec;
  }
  const contexts = Array.from(new Set([...Object.keys(openByCtx), ...Object.keys(subByCtx)]));
  const rows = contexts.map(ctx => {
    const o = openByCtx[ctx] || { A:0, B:0 };
    const s = subByCtx[ctx] || { A:0, B:0 };
    const rateA = o.A>0 ? (s.A/o.A) : 0;
    const rateB = o.B>0 ? (s.B/o.B) : 0;
    const totalOpen = o.A + o.B;
    return { ctx, totalOpen, rateA: Math.round(rateA*1000)/10, rateB: Math.round(rateB*1000)/10 };
  }).sort((a,b)=> b.totalOpen - a.totalOpen).slice(0, 8);

  if (rows.length === 0) return <div className="text-xs opacity-60">업셀 A/B 데이터 없음</div>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="text-xs" title={prettyCtx(r.ctx)}>
          <div className="flex items-center justify-between mb-1">
            <span className="truncate mr-2">{prettyCtx(r.ctx)}</span>
            <span className="opacity-60">A {r.rateA}% · B {r.rateB}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex">
            {/* render two bars proportionally by rate (cap 100) */}
            <div className="h-2 bg-zinc-500/70 dark:bg-zinc-400/70" style={{ width: `${Math.max(2, Math.min(100, r.rateA))}%` }} />
            <div className="h-2 bg-zinc-700/70 dark:bg-zinc-200/70 ml-1" style={{ width: `${Math.max(2, Math.min(100, r.rateB))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Upsell Recommendations ----------
function UpsellRecommendations({ opens, subscribes }: { opens: {label:string;count:number}[]; subscribes: {label:string;count:number}[] }) {
  const parseCtxVar = (label: string) => {
    const parts = label.split('.');
    if (parts[0] === 'open') return { kind: 'open', ctx: parts[1] || 'unknown', variant: parts[2] || 'unknown' } as const;
    return { kind: 'subscribe', ctx: parts[2] || 'unknown', variant: parts[3] || 'unknown' } as const;
  };
  type Tot = { openA: number; openB: number; subA: number; subB: number };
  const map: Record<string, Tot> = {};
  for (const o of opens) {
    const p = parseCtxVar(o.label); if (p.kind !== 'open') continue;
    map[p.ctx] = map[p.ctx] || { openA:0, openB:0, subA:0, subB:0 };
    if (p.variant === 'A') map[p.ctx].openA += o.count; else if (p.variant === 'B') map[p.ctx].openB += o.count;
  }
  for (const s of subscribes) {
    const p = parseCtxVar(s.label); if (p.kind !== 'subscribe') continue;
    map[p.ctx] = map[p.ctx] || { openA:0, openB:0, subA:0, subB:0 };
    if (p.variant === 'A') map[p.ctx].subA += s.count; else if (p.variant === 'B') map[p.ctx].subB += s.count;
  }
  const rows = Object.entries(map).map(([ctx, t]) => {
    const rateA = t.openA>0 ? (t.subA/t.openA) : 0;
    const rateB = t.openB>0 ? (t.subB/t.openB) : 0;
    const openTot = t.openA + t.openB;
    const subTot = t.subA + t.subB;
    return { ctx, openTot, subTot, rateA, rateB, diff: rateA - rateB };
  }).sort((a,b)=> b.openTot - a.openTot);

  const recs: Array<{ title: string; hint: string }> = [];
  for (const r of rows) {
    if (r.openTot < 10) {
      recs.push({ title: `${prettyCtx(r.ctx)} — 노출 확장 필요`, hint: '열람 샘플이 적습니다(10회 미만). 위치/빈도를 높여 표본을 확보하세요.' });
      continue;
    }
    const a = Math.round(r.rateA*1000)/10; // %
    const b = Math.round(r.rateB*1000)/10;
    const diff = Math.round((r.diff)*1000)/10;
    if (Math.abs(diff) >= 5) {
      const win = diff > 0 ? 'A' : 'B';
      recs.push({ title: `${prettyCtx(r.ctx)} — ${win} 유지(차이 ${Math.abs(diff)}%p)`, hint: `A ${a}% / B ${b}% · 더 좋은 변형을 기본값으로 유지하고, 열등 변형은 카피를 교체하세요.` });
    } else {
      recs.push({ title: `${prettyCtx(r.ctx)} — 추가 실험 권장`, hint: `A ${a}% / B ${b}% · 유의한 차이 없음. 가치를 더 선명하게/구체적인 혜택을 강조하는 카피를 시도하세요.` });
    }
    // 낮은 전환 보강
    if ((a < 2 && r.openTot >= 50) || (b < 2 && r.openTot >= 50)) {
      recs.push({ title: `${prettyCtx(r.ctx)} — 전환 저조`, hint: '열람은 충분하나 전환이 낮습니다. 긴급성(지금), 구체 혜택(전체 내러티브/내보내기) 강조 카피를 실험하세요.' });
    }
  }

  const top = recs.slice(0, 8);
  if (top.length === 0) return <div className="text-xs opacity-60">추천 생성할 데이터가 부족합니다.</div>;
  return (
    <ul className="list-disc list-inside space-y-1">
      {top.map((r,i)=>(
        <li key={i}><b>{r.title}</b> — {r.hint}</li>
      ))}
    </ul>
  );
}

// ---------- Upsell Priority List ----------
function UpsellPriorityList({ opens, subscribes, minOpen = 50, minDiff = 5 }: { opens: {label:string;count:number}[]; subscribes: {label:string;count:number}[]; minOpen?: number; minDiff?: number }) {
  const parseCtxVar = (label: string) => {
    const parts = label.split('.');
    if (parts[0] === 'open') return { kind: 'open', ctx: parts[1] || 'unknown', variant: parts[2] || 'unknown' } as const;
    return { kind: 'subscribe', ctx: parts[2] || 'unknown', variant: parts[3] || 'unknown' } as const;
  };
  type Tot = { openA: number; openB: number; subA: number; subB: number };
  const map: Record<string, Tot> = {};
  for (const o of opens) {
    const p = parseCtxVar(o.label); if (p.kind !== 'open') continue;
    map[p.ctx] = map[p.ctx] || { openA:0, openB:0, subA:0, subB:0 };
    if (p.variant === 'A') map[p.ctx].openA += o.count; else if (p.variant === 'B') map[p.ctx].openB += o.count;
  }
  for (const s of subscribes) {
    const p = parseCtxVar(s.label); if (p.kind !== 'subscribe') continue;
    map[p.ctx] = map[p.ctx] || { openA:0, openB:0, subA:0, subB:0 };
    if (p.variant === 'A') map[p.ctx].subA += s.count; else if (p.variant === 'B') map[p.ctx].subB += s.count;
  }
  const rows = Object.entries(map).map(([ctx, t]) => {
    const openTot = t.openA + t.openB;
    const subTot = t.subA + t.subB;
    const rateA = t.openA>0 ? (t.subA/t.openA) : 0;
    const rateB = t.openB>0 ? (t.subB/t.openB) : 0;
    const diff = Math.abs(rateA - rateB);
    const worst = Math.min(rateA, rateB);
    return { ctx, openTot, subTot, rateA: Math.round(rateA*1000)/10, rateB: Math.round(rateB*1000)/10, diff: Math.round(diff*1000)/10, worst: Math.round(worst*1000)/10 };
  }).filter(r => r.openTot >= (minOpen||0) && r.diff >= (minDiff||0))
    .sort((a,b)=> b.diff - a.diff || b.openTot - a.openTot)
    .slice(0, 6);
  if (rows.length === 0) return <div className="text-xs opacity-60">우선 개선할 컨텍스트가 없습니다.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r,i)=> (
        <div key={i} className="text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="truncate mr-2">{prettyCtx(r.ctx)}</span>
            <span className="opacity-60">Δ {r.diff}%p · A {r.rateA}% · B {r.rateB}%</span>
          </div>
          <div className="flex items-center gap-2">
            <a className="underline" href={`/?upsell=${encodeURIComponent(r.ctx)}&var=A`} target="_blank">보기(A)</a>
            <a className="underline" href={`/?upsell=${encodeURIComponent(r.ctx)}&var=B`} target="_blank">보기(B)</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Encyclopedia Funnel ----------
function EncyFunnel({ opens, starts }: { opens: {label:string;count:number}[]; starts: {label:string;count:number}[] }) {
  const keyOf = (label: string) => label.replace(/^open\.symbol\./, '').replace(/^click\.start\./, '');
  const openMap = new Map<string, number>();
  const startMap = new Map<string, number>();
  let totalOpen = 0, totalStart = 0;
  (opens || []).forEach(o => { const k = keyOf(o.label); openMap.set(k, (openMap.get(k)||0) + o.count); totalOpen += o.count; });
  (starts || []).forEach(s => { const k = keyOf(s.label); startMap.set(k, (startMap.get(k)||0) + s.count); totalStart += s.count; });
  const MERGED = getMergedSymbols() as any;
  const rows = Array.from(openMap.keys()).map(k => {
    const o = openMap.get(k) || 0;
    const s = startMap.get(k) || 0;
    const rate = o>0 ? Math.round((s/o)*1000)/10 : 0;
    const label = (MERGED?.[k]?.label || k) as string;
    return { k, label, open: o, start: s, rate };
  }).filter(r => r.open >= 10)
    .sort((a,b)=> b.rate - a.rate || b.open - a.open)
    .slice(0, 10);
  const totalRate = totalOpen>0 ? Math.round((totalStart/totalOpen)*1000)/10 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-70">전체 전환: {totalStart}/{totalOpen} ({totalRate}%)</div>
        <Button size="sm" variant="secondary" onClick={()=>{
          const rowsAll = Array.from(openMap.keys()).map(k => {
            const o = openMap.get(k) || 0;
            const s = startMap.get(k) || 0;
            const rate = o>0 ? Math.round((s/o)*1000)/10 : 0;
            const label = (MERGED?.[k]?.label || k) as string;
            return { k, label, open: o, start: s, rate };
          }).sort((a,b)=> b.rate - a.rate || b.open - a.open);
          const csv = ['key,label,open,start,rate%'].concat(rowsAll.map(r=> [r.k, r.label.replace(/,/g,' '), r.open, r.start, r.rate].join(','))).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'ency-funnel.csv'; a.click(); URL.revokeObjectURL(url);
        }}>CSV</Button>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs opacity-60">표본이 부족합니다.</div>
      ) : (
        rows.map((r, i) => (
          <div key={i} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="truncate mr-2">{r.label}</span>
              <span className="opacity-60">{r.start}/{r.open} ({r.rate}%)</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-2 bg-zinc-500/70 dark:bg-zinc-300/70" style={{ width: `${Math.max(2, Math.min(100, r.rate))}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---------- Upsell Copy Editor ----------
function UpsellCopyEditor({ contexts }: { contexts: string[] }) {
  type CopyMap = { [variant in 'A'|'B']?: { global?: { badge?: string; title?: string; subtitle?: string; cta?: string }; contexts?: Record<string, { badge?: string; title?: string; subtitle?: string; cta?: string }> } };
  const [map, setMap] = useState<CopyMap>(() => {
    try { const raw = localStorage.getItem('di.upsell.copy.v1'); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });
  type Snapshot = { id: string; name: string; at: number; data: CopyMap };
  const [snaps, setSnaps] = useState<Snapshot[]>(() => {
    try { const raw = localStorage.getItem('di.upsell.copy.snapshots'); return raw ? JSON.parse(raw) as Snapshot[] : []; } catch { return []; }
  });
  const [snapName, setSnapName] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [diffBase, setDiffBase] = useState<string>('');
  const [diffTarget, setDiffTarget] = useState<string>('');
  const [diffRows, setDiffRows] = useState<Array<{ v:'A'|'B'; ctx:string|null; field:'badge'|'title'|'subtitle'|'cta'; before?:string; after?:string }>>([]);
  const ensure = (v: 'A'|'B', ctx?: string) => {
    setMap(prev => {
      const next = { ...(prev||{}) } as CopyMap;
      if (!next[v]) next[v] = {};
      if (!next[v]!.contexts) next[v]!.contexts = {} as any;
      if (ctx && !next[v]!.contexts![ctx]) next[v]!.contexts![ctx] = {} as any;
      return next;
    });
  };
  const setField = (v: 'A'|'B', ctx: string|null, field: 'badge'|'title'|'subtitle'|'cta', value: string) => {
    setMap(prev => {
      const next = { ...(prev||{}) } as any;
      if (!next[v]) next[v] = {};
      if (ctx) {
        next[v].contexts = next[v].contexts || {};
        next[v].contexts[ctx] = next[v].contexts[ctx] || {};
        next[v].contexts[ctx][field] = value;
      } else {
        next[v].global = next[v].global || {};
        next[v].global[field] = value;
      }
      return next;
    });
  };
  const save = () => {
    try { localStorage.setItem('di.upsell.copy.v1', JSON.stringify(map)); localStorage.setItem('di.upsell.copy.bump', String(Date.now())); alert('저장되었습니다. 새 업셀 모달에 즉시 반영됩니다.'); } catch (e:any) { alert('저장 실패: '+(e?.message||e)); }
  };
  const reset = () => {
    if (!confirm('모든 커스텀 카피를 초기화할까요?')) return;
    try { localStorage.removeItem('di.upsell.copy.v1'); localStorage.setItem('di.upsell.copy.bump', String(Date.now())); setMap({}); } catch {}
  };
  const saveSnapshot = () => {
    const name = (snapName || '').trim() || new Date().toLocaleString();
    const s: Snapshot = { id: Math.random().toString(36).slice(2)+Date.now().toString(36), name, at: Date.now(), data: map };
    const next = [s, ...snaps].slice(0, 50);
    setSnaps(next);
    try { localStorage.setItem('di.upsell.copy.snapshots', JSON.stringify(next)); } catch {}
    setSnapName('');
  };
  const restoreSnapshot = (id: string) => {
    const s = snaps.find(x => x.id === id); if (!s) return;
    setMap(s.data);
    try { localStorage.setItem('di.upsell.copy.v1', JSON.stringify(s.data)); localStorage.setItem('di.upsell.copy.bump', String(Date.now())); } catch {}
  };
  const deleteSnapshot = (id: string) => {
    if (!confirm('이 스냅샷을 삭제할까요?')) return;
    const next = snaps.filter(x => x.id !== id);
    setSnaps(next);
    try { localStorage.setItem('di.upsell.copy.snapshots', JSON.stringify(next)); } catch {}
  };
  const exportSnapshot = (id: string) => {
    const s = snaps.find(x => x.id === id); if (!s) return;
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `upsell-copy-${s.name.replace(/\s+/g,'_')}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importSnapshot = () => {
    try {
      const s = JSON.parse(importText) as Snapshot | { data: CopyMap } | CopyMap;
      if ((s as any)?.data) {
        const snap = s as Snapshot;
        const clean: Snapshot = { id: snap.id || Math.random().toString(36).slice(2), name: snap.name || new Date().toLocaleString(), at: snap.at || Date.now(), data: snap.data };
        const next = [clean, ...snaps].slice(0, 50);
        setSnaps(next);
        localStorage.setItem('di.upsell.copy.snapshots', JSON.stringify(next));
      } else {
        const data = s as CopyMap;
        const clean: Snapshot = { id: Math.random().toString(36).slice(2), name: new Date().toLocaleString(), at: Date.now(), data };
        const next = [clean, ...snaps].slice(0, 50);
        setSnaps(next);
        localStorage.setItem('di.upsell.copy.snapshots', JSON.stringify(next));
      }
      alert('가져오기 완료. 목록에서 복원하거나 편집 후 저장하세요.');
      setImportText('');
    } catch (e:any) {
      alert('가져오기 실패: '+(e?.message||e));
    }
  };
  const flatten = (m: CopyMap) => {
    const out: Record<string, { v:'A'|'B'; ctx:string|null; field:'badge'|'title'|'subtitle'|'cta'; value?: string }> = {};
    (['A','B'] as const).forEach(v => {
      const block = (m as any)?.[v] || {};
      const g = block.global || {};
      (['badge','title','subtitle','cta'] as const).forEach(f => {
        if (g[f]) { const key = `${v}|-|${f}`; out[key] = { v, ctx: null, field: f, value: g[f] }; }
      });
      const cx = block.contexts || {};
      Object.keys(cx).forEach((ctx) => {
        const obj = cx[ctx] || {};
        (['badge','title','subtitle','cta'] as const).forEach(f => {
          if (obj[f]) { const key = `${v}|${ctx}|${f}`; out[key] = { v, ctx, field: f, value: obj[f] }; }
        });
      });
    });
    return out;
  };
  const runDiff = () => {
    const base = diffBase === 'CURRENT' || !diffBase ? { id:'CURRENT', data: map } : snaps.find(s => s.id === diffBase);
    const target = diffTarget === 'CURRENT' || !diffTarget ? { id:'CURRENT', data: map } : snaps.find(s => s.id === diffTarget);
    if (!base || !target) { alert('비교할 스냅샷을 선택하세요.'); return; }
    const A = flatten((base as any).data as CopyMap);
    const B = flatten((target as any).data as CopyMap);
    const keys = new Set<string>([...Object.keys(A), ...Object.keys(B)]);
    const rows: Array<{ v:'A'|'B'; ctx:string|null; field:'badge'|'title'|'subtitle'|'cta'; before?:string; after?:string }> = [];
    for (const k of keys) {
      const a = A[k]?.value;
      const b = B[k]?.value;
      if (a !== b) {
        const [v, ctx, f] = k.split('|');
        rows.push({ v: v as 'A'|'B', ctx: ctx==='-'? null : ctx, field: f as any, before: a, after: b });
      }
    }
    rows.sort((x,y)=> (x.v.localeCompare(y.v)) || ((x.ctx||'').localeCompare(y.ctx||'')) || (x.field.localeCompare(y.field)) );
    setDiffRows(rows);
  };
  return (
    <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
      <CardHeader className="pb-2"><CardTitle className="text-lg">업셀 카피 편집</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={save}>저장</Button>
          <Button size="sm" variant="secondary" onClick={reset}>초기화</Button>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="font-medium mb-2">스냅샷</div>
          <div className="flex items-center gap-2 mb-2">
            <input className="bg-transparent border rounded px-2 py-1 text-sm" placeholder="스냅샷 이름(선택)" value={snapName} onChange={(e)=>setSnapName(e.target.value)} />
            <Button size="sm" variant="secondary" onClick={saveSnapshot}>스냅샷 저장</Button>
          </div>
          {snaps.length === 0 ? (
            <div className="text-xs opacity-60">저장된 스냅샷이 없습니다.</div>
          ) : (
            <div className="space-y-1">
              {snaps.slice(0,10).map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <div className="truncate mr-2">{new Date(s.at).toLocaleString()} — {s.name}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={()=>restoreSnapshot(s.id)}>복원</Button>
                    <Button size="sm" variant="secondary" onClick={()=>exportSnapshot(s.id)}>내보내기</Button>
                    <Button size="sm" variant="secondary" onClick={()=>deleteSnapshot(s.id)}>삭제</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            <div className="text-xs opacity-70 mb-1">가져오기(JSON)</div>
            <textarea className="w-full bg-transparent border rounded px-2 py-1 text-xs min-h-[80px]" placeholder='{"id":"...","name":"...","at":...,"data":{...}} 또는 {"A":{...},"B":{...}}' value={importText} onChange={(e)=>setImportText(e.target.value)} />
            <div className="mt-1">
              <Button size="sm" variant="secondary" onClick={importSnapshot}>가져오기</Button>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="font-medium mb-2">스냅샷 비교(diff)</div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
            <div className="flex-1">
              <div className="text-xs opacity-70">기준(Base)</div>
              <select className="w-full bg-transparent border rounded px-2 py-1 text-sm" value={diffBase} onChange={e=>setDiffBase(e.target.value)}>
                <option value="">선택</option>
                <option value="CURRENT">현재 편집본</option>
                {snaps.map(s=> (<option key={s.id} value={s.id}>{new Date(s.at).toLocaleString()} — {s.name}</option>))}
              </select>
            </div>
            <div className="flex-1">
              <div className="text-xs opacity-70">대상(Target)</div>
              <select className="w-full bg-transparent border rounded px-2 py-1 text-sm" value={diffTarget} onChange={e=>setDiffTarget(e.target.value)}>
                <option value="">선택</option>
                <option value="CURRENT">현재 편집본</option>
                {snaps.map(s=> (<option key={s.id} value={s.id}>{new Date(s.at).toLocaleString()} — {s.name}</option>))}
              </select>
            </div>
            <div>
              <Button size="sm" variant="secondary" onClick={runDiff}>비교</Button>
            </div>
          </div>
          <div className="mt-2">
            {diffRows.length === 0 ? (
              <div className="text-xs opacity-60">차이가 없습니다.</div>
            ) : (
              <div className="text-xs space-y-1">
                {diffRows.map((r, i) => (
                  <div key={i} className="p-2 rounded border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">Variant {r.v} · {r.ctx ? `${prettyCtx(r.ctx)} (${r.ctx})` : 'Global'} · {r.field}</div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div>
                        <div className="opacity-60">기준</div>
                        <div className="whitespace-pre-wrap break-words">{r.before || '(없음)'}</div>
                      </div>
                      <div>
                        <div className="opacity-60">대상</div>
                        <div className="whitespace-pre-wrap break-words">{r.after || '(없음)'}</div>
                      </div>
                    </div>
                    {r.ctx && (
                      <div className="mt-1 flex items-center gap-2">
                        <a className="underline" href={`/?upsell=${encodeURIComponent(r.ctx)}&var=A`} target="_blank">보기(A)</a>
                        <a className="underline" href={`/?upsell=${encodeURIComponent(r.ctx)}&var=B`} target="_blank">보기(B)</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-xs opacity-70">글로벌(전체 컨텍스트 공통)</div>
        {(['A','B'] as const).map(v => (
          <div key={`global-${v}`} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="font-medium mb-2">Variant {v} — Global</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs opacity-70">배지(badge)</div>
                <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.global?.badge || ''} onChange={e=> setField(v, null, 'badge', e.target.value)} />
              </div>
              <div>
                <div className="text-xs opacity-70">CTA</div>
                <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.global?.cta || ''} onChange={e=> setField(v, null, 'cta', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs opacity-70">제목(title)</div>
                <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.global?.title || ''} onChange={e=> setField(v, null, 'title', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs opacity-70">부제(subtitle)</div>
                <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.global?.subtitle || ''} onChange={e=> setField(v, null, 'subtitle', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <div className="text-xs opacity-70">컨텍스트별 오버라이드</div>
        {contexts.map(ctx => (
          <div key={ctx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="font-medium mb-2 flex items-center justify-between">
              <div>{prettyCtx(ctx)} <span className="opacity-60">({ctx})</span></div>
              <div className="flex items-center gap-2 text-xs">
                <Link href={`/?upsell=${encodeURIComponent(ctx)}&var=A`} target="_blank" className="underline">앱에서 보기(A)</Link>
                <Link href={`/?upsell=${encodeURIComponent(ctx)}&var=B`} target="_blank" className="underline">앱에서 보기(B)</Link>
              </div>
            </div>
            {(['A','B'] as const).map(v => (
              <div key={`${ctx}-${v}`} className="mb-2">
                <div className="text-xs opacity-70 mb-1">Variant {v}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs opacity-70">배지(badge)</div>
                    <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.contexts?.[ctx]?.badge || ''} onChange={e=> { ensure(v, ctx); setField(v, ctx, 'badge', e.target.value); }} />
                  </div>
                  <div>
                    <div className="text-xs opacity-70">CTA</div>
                    <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.contexts?.[ctx]?.cta || ''} onChange={e=> { ensure(v, ctx); setField(v, ctx, 'cta', e.target.value); }} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs opacity-70">제목(title)</div>
                    <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.contexts?.[ctx]?.title || ''} onChange={e=> { ensure(v, ctx); setField(v, ctx, 'title', e.target.value); }} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs opacity-70">부제(subtitle)</div>
                    <input className="w-full bg-transparent border rounded px-2 py-1" value={(map as any)?.[v]?.contexts?.[ctx]?.subtitle || ''} onChange={e=> { ensure(v, ctx); setField(v, ctx, 'subtitle', e.target.value); }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={save}>저장</Button>
          <Button size="sm" variant="secondary" onClick={reset}>초기화</Button>
        </div>
      </CardContent>
    </Card>
  );
}
