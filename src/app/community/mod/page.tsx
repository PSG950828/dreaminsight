"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ModPage() {
  const sb = getSupabase();
  const [reports, setReports] = useState<any[]>([]);
  const [posts, setPosts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch('/api/mod/reports');
      if (r.status === 401) { setIsAdmin(false); return; }
      const j = await r.json();
      const list = (j.reports || []) as any[];
      setReports(statusFilter ? list.filter(x => (x.status||'pending') === statusFilter) : list);
      const map: Record<string, any> = {};
      (j.posts || []).forEach((row:any)=> { map[row.id] = row; });
      setPosts(map);
      setIsAdmin(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [statusFilter]);

  async function login() {
    const r = await fetch('/api/me-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (r.ok) { setPassword(''); await refresh(); } else { alert('인증 실패'); }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center space-y-3">
          <h1 className="text-xl font-bold">모더레이션 로그인</h1>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="관리자 비밀번호" type="password" className="border rounded px-3 py-2 text-sm bg-transparent w-full" />
          <div className="flex items-center justify-center gap-2">
            <Button onClick={login}>로그인</Button>
            <Link href="/community" className="text-sm underline">커뮤니티</Link>
          </div>
        </div>
      </div>
    );
  }

  async function hidePost(id: string, state: boolean) {
    const r = await fetch(`/api/mod/posts/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hide: state }) });
    if (!r.ok) { alert('실패'); return; }
    await refresh();
  }

  async function deletePost(id: string) {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    const r = await fetch(`/api/mod/posts/${id}`, { method: 'DELETE' });
    if (!r.ok) { alert('실패'); return; }
    await refresh();
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold">모더레이션</h1>
        <div className="text-xs opacity-70">신고 {reports.length}건</div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="opacity-70">상태</span>
          <select className="bg-transparent border rounded-md px-2 py-1" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
            <option value="">전체</option>
            <option value="pending">처리대기</option>
            <option value="resolved">처리완료</option>
            <option value="ignored">무시</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {loading && <div className="text-sm opacity-70">불러오는 중…</div>}
        {reports.map((r:any) => {
          const p = posts[r.post_id];
          return (
            <Card key={r.id} className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{r.reason} · {new Date(r.created_at).toLocaleString()}</span>
                  <span className="text-xs opacity-70">post: {r.post_id.substring(0,8)}…</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/40 border">
                  {p?.text || '(게시물 불러오기 실패)'}
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="secondary" onClick={()=> hidePost(r.post_id, true)}>숨김(신고)</Button>
                  <Button size="sm" variant="secondary" onClick={()=> hidePost(r.post_id, false)}>해제</Button>
                  <Button size="sm" variant="destructive" onClick={()=> deletePost(r.post_id)}>삭제</Button>
                  <div className="flex-1" />
                  <span className="text-xs opacity-70">상태: {r.status || 'pending'}</span>
                  <Button size="sm" variant="secondary" onClick={async()=>{ await fetch(`/api/mod/reports/${r.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'resolved' })}); refresh(); }}>완료</Button>
                  <Button size="sm" variant="secondary" onClick={async()=>{ await fetch(`/api/mod/reports/${r.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'ignored' })}); refresh(); }}>무시</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {reports.length === 0 && (
          <p className="text-sm opacity-70">신고가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
