"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Ent = { user_uid: string; plus?: boolean; plus_until?: string|null; created_at?: string; updated_at?: string };

export default function EntitlementsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [list, setList] = useState<Ent[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'all'|'active'|'expired'|'expiring'>('all');

  useEffect(()=>{
    (async ()=>{
      try { const r = await fetch('/api/me-admin'); const j = await r.json(); setIsAdmin(!!j?.admin); if (j?.admin) load(); } catch {}
    })();
  }, []);

  async function login() {
    const r = await fetch('/api/me-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (r.ok) { setIsAdmin(true); setPassword(""); load(); } else { alert('인증 실패'); }
  }

  async function load() {
    setLoading(true);
    try {
      const url = new URL('/api/entitlements/list', location.origin);
      if (q) url.searchParams.set('q', q);
      const r = await fetch(url.toString());
      const j = await r.json();
      if (!r.ok) { alert(j?.error || '조회 실패'); return; }
      setList(j.items || []);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const rows: string[] = ['user_uid,plus,plus_until,updated_at'];
    list.forEach(it => rows.push([it.user_uid, String(!!it.plus), it.plus_until || '', it.updated_at || ''].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'entitlements.csv'; a.click(); URL.revokeObjectURL(url);
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="max-w-md mx-auto p-6 text-center space-y-3">
          <h1 className="text-xl font-bold">Entitlements — 관리자</h1>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="관리자 비밀번호" type="password" className="border rounded px-3 py-2 text-sm bg-transparent w-full" />
          <div className="flex items-center justify-center gap-2">
            <Button onClick={login}>로그인</Button>
          </div>
        </div>
      </div>
    );
  }

  function filtered() {
    const now = Date.now();
    const week = 7*24*60*60*1000;
    return (list || []).filter((it) => {
      if (status === 'all') return true;
      const until = it.plus_until ? new Date(it.plus_until).getTime() : 0;
      const isActive = !!it.plus || (until > now);
      const isExpiring = isActive && until > 0 && (until - now) <= week;
      if (status === 'active') return isActive;
      if (status === 'expired') return !isActive;
      if (status === 'expiring') return isExpiring;
      return true;
    });
  }

  async function updateEnt(u: Ent, patch: Partial<Ent>) {
    try {
      const payload: any = { user_uid: u.user_uid };
      if (typeof patch.plus === 'boolean') payload.plus = patch.plus;
      if (patch.plus_until !== undefined) payload.plus_until = patch.plus_until;
      const r = await fetch('/api/entitlements/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { alert(j?.error || '업데이트 실패'); return; }
      await load();
    } catch (e:any) { alert('업데이트 오류: '+(e?.message||e)); }
  }

  function extendDays(u: Ent, days: number) {
    const base = u.plus_until ? new Date(u.plus_until) : new Date();
    const d = new Date(base.getTime() + days*24*60*60*1000);
    updateEnt(u, { plus_until: d.toISOString(), plus: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Entitlements — Plus 가입자</h1>
          <Link href="/stats" className="text-sm underline">/stats</Link>
        </div>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">검색/내보내기</CardTitle></CardHeader>
          <CardContent className="text-sm flex items-center gap-2">
            <input className="bg-transparent border rounded px-2 py-1" placeholder="user_uid 검색" value={q} onChange={(e)=>setQ(e.target.value)} />
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>{loading ? '조회중…' : '조회'}</Button>
            <Button size="sm" variant="secondary" onClick={exportCSV}>CSV</Button>
            <span className="ml-2 opacity-70">상태</span>
            <select className="bg-transparent border rounded px-2 py-1" value={status} onChange={(e)=>setStatus(e.target.value as any)}>
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="expired">만료</option>
              <option value="expiring">만료 임박(7일)</option>
            </select>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">목록 ({filtered().length}/{list.length})</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {filtered().length === 0 ? (
              <div className="text-xs opacity-60">데이터 없음</div>
            ) : (
              <div className="space-y-2">
                {filtered().map((it)=> {
                  const now = Date.now();
                  const untilTs = it.plus_until ? new Date(it.plus_until).getTime() : 0;
                  const isActive = !!it.plus || (untilTs > now);
                  const daysLeft = untilTs ? Math.ceil((untilTs - now)/(24*60*60*1000)) : null;
                  const isExpiring = isActive && untilTs > 0 && (untilTs - now) <= 7*24*60*60*1000;
                  const statusClass = isActive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-zinc-100 text-zinc-800 border border-zinc-200';
                  const expClass = isExpiring ? 'bg-amber-100 text-amber-900 border border-amber-200' : '';
                  const dateValue = it.plus_until ? new Date(it.plus_until).toISOString().slice(0,10) : '';
                  return (
                  <div key={it.user_uid} className="p-2 rounded border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center justify-between">
                      <div className="truncate mr-2">
                        <div className="font-medium text-xs">{it.user_uid}</div>
                        <div className="text-[11px] opacity-70">until: {it.plus_until || '-'} · updated: {it.updated_at || '-'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`text-xs px-2 py-1 rounded ${statusClass}`}>{isActive ? 'PLUS' : 'FREE'}</div>
                        {isExpiring && (
                          <div className={`text-xs px-2 py-1 rounded ${expClass}`}>{daysLeft}일 남음</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <label>plus</label>
                      <select className="bg-transparent border rounded px-2 py-1" value={String(!!it.plus)} onChange={(e)=>updateEnt(it, { plus: e.target.value==='true' })}>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                      <label>until</label>
                      <input className="bg-transparent border rounded px-2 py-1" type="date" defaultValue={dateValue} onBlur={(e)=>{ const v=e.target.value.trim(); updateEnt(it, { plus_until: v ? new Date(v+'T00:00:00Z').toISOString() : null }); }} />
                      <span className="opacity-70">연장</span>
                      {[7,30,90].map(d => (
                        <Button key={d} size="sm" variant="secondary" onClick={()=>extendDays(it, d)}>{d}일</Button>
                      ))}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
