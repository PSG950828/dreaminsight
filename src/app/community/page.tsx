"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Download, MessageSquare, Pin, Send, Shield, ThumbsUp, X } from "lucide-react";
import { getSupabase, getDeviceUID } from "@/lib/supabaseClient";

type Post = {
  id: string;
  text: string;
  createdAt: number;
  anon: string;
  pinned?: boolean;
  private?: boolean;
  votes?: number;
  reported?: boolean;
};

type Comment = {
  id: string;
  postId: string;
  text: string;
  anon: string;
  createdAt: number;
};

const PKEY = "di.comm.posts.v1";
const CKEY = "di.comm.comments.v1";
const BKEY = "di.comm.blocks.v1";

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function loadPosts(): Post[] { try { const raw = localStorage.getItem(PKEY); return raw ? JSON.parse(raw) as Post[] : []; } catch { return []; } }
function savePosts(list: Post[]) { try { localStorage.setItem(PKEY, JSON.stringify(list)); } catch {} }
function loadComments(): Comment[] { try { const raw = localStorage.getItem(CKEY); return raw ? JSON.parse(raw) as Comment[] : []; } catch { return []; } }
function saveComments(list: Comment[]) { try { localStorage.setItem(CKEY, JSON.stringify(list)); } catch {} }
function loadBlocks(): string[] { try { const raw = localStorage.getItem(BKEY); return raw ? JSON.parse(raw) as string[] : []; } catch { return []; } }
function saveBlocks(list: string[]) { try { localStorage.setItem(BKEY, JSON.stringify(list)); } catch {} }

function anonName() {
  const adj = ["고요한","빛나는","깊은","잔잔한","선명한","따뜻한","차분한","날렵한","명료한","은은한"]; 
  const ani = ["고양이","사슴","돌고래","매","수달","사자","부엉이","펭귄","늑대","여우"]; 
  return `${adj[Math.floor(Math.random()*adj.length)]} ${ani[Math.floor(Math.random()*ani.length)]}`;
}

function usePlusFlag() {
  const [plus, setPlus] = useState(false);
  useEffect(()=>{
    try { if (localStorage.getItem('dreaminsight.plus')==='1') setPlus(true); } catch {}
    fetch('/api/me').then(r=>r.json()).then(d=>{ if (d?.plus) setPlus(true); }).catch(()=>{});
  }, []);
  return plus;
}

function useAnon() {
  const [name, setName] = useState("");
  useEffect(()=>{
    try {
      const key = "di.comm.anon";
      const cur = localStorage.getItem(key);
      if (cur) setName(cur); else { const n = anonName(); localStorage.setItem(key, n); setName(n); }
    } catch { setName(anonName()); }
  }, []);
  return [name, setName] as const;
}

export default function CommunityPage() {
  const [me] = useAnon();
  const isPlus = usePlusFlag();
  const sb = getSupabase();
  const deviceUid = typeof window !== 'undefined' ? getDeviceUID() : 'server';
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [priv, setPriv] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [cText, setCText] = useState("");
  const [risk, setRisk] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [postError, setPostError] = useState<string>("");
  const [postViol, setPostViol] = useState<Array<{ code:string; reason:string }>>([]);
  const [commentError, setCommentError] = useState<string>("");
  const [commentViol, setCommentViol] = useState<Array<{ code:string; reason:string }>>([]);

  useEffect(()=>{
    if (!sb) { setPosts(loadPosts()); setComments(loadComments()); setBlocks(loadBlocks()); return; }
    (async () => {
      const { data: p } = await sb.rpc('list_posts', { p_uid: deviceUid });
      const { data: c } = await sb.rpc('list_comments', { p_uid: deviceUid, p_limit: 500 });
      setPosts((p || []).map((r:any)=> ({ id: r.id, text: r.text, createdAt: new Date(r.created_at).getTime(), anon: r.anon_name, pinned: r.pinned, private: r.private, votes: r.likes_count, reported: r.reported })));
      setComments((c || []).map((r:any)=> ({ id: r.id, postId: r.post_id, text: r.text, anon: r.anon_name, createdAt: new Date(r.created_at).getTime() })));
      setBlocks(loadBlocks());
    })();

    // Realtime: posts/comments changes
    const channel = sb.channel('community-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload:any) => {
        const r = payload.new;
        setPosts(prev => [{ id: r.id, text: r.text, createdAt: new Date(r.created_at).getTime(), anon: r.anon_name, pinned: r.pinned, private: r.private, votes: r.likes_count, reported: r.reported }, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload:any) => {
        const r = payload.new;
        setPosts(prev => prev.map(p => p.id === r.id ? { ...p, text: r.text, pinned: r.pinned, votes: r.likes_count, reported: r.reported, private: r.private } : p));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload:any) => {
        const r = payload.new;
        setComments(prev => [{ id: r.id, postId: r.post_id, text: r.text, anon: r.anon_name, createdAt: new Date(r.created_at).getTime() }, ...prev]);
      })
      .subscribe();
    return () => { try { channel.unsubscribe(); } catch {} };
  }, []);

  // Free weekly limit (non-Plus): 1 post per 7 days
  const canPost = useMemo(() => {
    if (isPlus) return true;
    const weekAgo = Date.now() - 7*24*60*60*1000;
    const mine = posts.filter(p => p.anon === me && p.createdAt >= weekAgo);
    return mine.length === 0;
  }, [isPlus, posts, me]);

  const feed = useMemo(() => {
    const hidden = new Set(blocks);
    const list = posts.filter(p => !hidden.has(p.anon) && (!p.private || p.anon === me));
    // pinned first
    return [...list].sort((a,b)=> (Number(b.pinned) - Number(a.pinned)) || (b.createdAt - a.createdAt));
  }, [posts, blocks, me]);

  async function addPost() {
    const t = text.trim(); if (t.length < 6) return;
    if (!canPost) { alert("무료 이용자는 주 1회 게시 가능합니다(Plus 무제한)."); return; }
    try {
      const last = Number(localStorage.getItem('di.comm.lastPostAt') || '0');
      if (Date.now() - last < 60_000) { alert('게시 간격을 60초 이상으로 유지해 주세요.'); return; }
    } catch {}
    setPostError(""); setPostViol([]);
    if (!sb) {
      const p: Post = { id: genId(), text: t, createdAt: Date.now(), anon: me, private: priv, pinned: false, votes: 0 };
      const next = [p, ...posts]; setPosts(next); savePosts(next); setText(""); setPriv(false);
    } else {
      const r = await fetch('/api/community/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t, anon_name: me, user_uid: deviceUid, private: priv }) });
      const j = await r.json();
      if (!r.ok) { setPostError(j?.error || '게시 실패'); setPostViol(j?.violations || []); return; }
      const p:any = j.post;
      const np: Post = { id: p.id, text: p.text, createdAt: new Date(p.created_at).getTime(), anon: p.anon_name, private: p.private, pinned: p.pinned, votes: p.likes_count, reported: p.reported };
      setPosts([np, ...posts]); setText(""); setPriv(false);
    }
    try { localStorage.setItem('di.comm.lastPostAt', Date.now().toString()); } catch {}
  }

  async function togglePin(id: string) {
    if (!isPlus) { alert("핀 고정은 Plus 기능입니다."); return; }
    if (!sb) {
      setPosts(prev => { const next = prev.map(p => p.id===id? { ...p, pinned: !p.pinned } : p); savePosts(next); return next; });
    } else {
      const target = posts.find(p=>p.id===id); if (!target) return;
      await sb.rpc('toggle_pin', { p_post: id, p_state: !target.pinned });
      setPosts(prev => prev.map(p => p.id===id? { ...p, pinned: !p.pinned } : p));
    }
  }

  async function vote(id: string, delta: number) {
    if (!sb) {
      setPosts(prev => { const next = prev.map(p => p.id===id? { ...p, votes: Math.max(0, (p.votes||0)+delta) } : p); savePosts(next); return next; });
    } else {
      const r = await fetch('/api/community/vote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ post_id: id, user_uid: deviceUid }) });
      const j = await r.json(); if (r.ok) setPosts(prev => prev.map(p => p.id===id? { ...p, votes: j.likes as number } : p));
    }
  }

  async function report(id: string) {
    if (!confirm("이 게시물을 신고하시겠습니까?")) return;
    const reason = typeof window !== 'undefined' ? prompt('신고 사유를 선택/입력해 주세요(스팸/욕설/혐오/기타):', '스팸') || '스팸' : '신고';
    if (!sb) {
      setPosts(prev => { const next = prev.map(p => p.id===id? { ...p, reported: true } : p); savePosts(next); return next; });
    } else {
      const r = await fetch('/api/community/report', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ post_id: id, reporter_uid: deviceUid, reason }) });
      if (!r.ok) { alert('신고 실패'); return; }
      setPosts(prev => prev.map(p => p.id===id? { ...p, reported: true } : p));
    }
  }

  function blockUser(name: string) {
    if (!confirm(`${name} 사용자를 차단하시겠습니까?`)) return;
    const next = Array.from(new Set([name, ...blocks])); setBlocks(next); saveBlocks(next);
  }

  async function addComment(pid: string) {
    const t = cText.trim(); if (!t) return;
    setCommentError(""); setCommentViol([]);
    if (!sb) {
      const c: Comment = { id: genId(), postId: pid, text: t, anon: me, createdAt: Date.now() };
      const next = [c, ...comments]; setComments(next); saveComments(next); setCText("");
    } else {
      const r = await fetch('/api/community/comments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ post_id: pid, text: t, anon_name: me, user_uid: deviceUid }) });
      const j = await r.json(); if (!r.ok) { setCommentError(j?.error||'댓글 실패'); setCommentViol(j?.violations||[]); return; }
      const rr:any = j.comment; const c: Comment = { id: rr.id, postId: rr.post_id, text: rr.text, anon: rr.anon_name, createdAt: new Date(rr.created_at).getTime() };
      setComments([c, ...comments]); setCText("");
    }
  }

  const postCount = posts.length;
  const commentCount = comments.length;

  // Safety: detect high-risk keywords and show help
  useEffect(() => {
    const t = text.toLowerCase();
    const kws = ['자해', '죽고', '죽고싶', '극단', '폭력', '해치', '살해'];
    const hit = kws.find(k => t.includes(k));
    setRisk(hit ? hit : null);
  }, [text]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight">DreamInsight 커뮤니티</h1>
          <div className="text-xs opacity-70">익명 닉네임: <b>{me}</b> · 게시물 {postCount} · 댓글 {commentCount}</div>
        </div>

        {/* Composer */}
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60 mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">꿈 공유</CardTitle>
              <button className="text-xs underline opacity-80" onClick={()=>setShowGuide(v=>!v)}>안전 가이드 {showGuide? '닫기':'보기'}</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!canPost && (
              <div className="text-xs p-2 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                무료 이용자는 최근 7일 내 1회만 게시할 수 있어요. Plus에서 무제한/핀/프라이빗 제공.
              </div>
            )}
            {risk && (
              <div className="text-xs p-2 rounded-md bg-rose-50 text-rose-900 border border-rose-200">
                도움이 필요하신가요? 24시간 도움: <b>국번없이 1393(자살예방상담)</b>, 129(정신건강), 112(긴급). 가까운 사람에게 연락하거나 전문 기관에 연결해 보세요.
              </div>
            )}
            {postError && (
              <div className="text-xs p-2 rounded-md bg-rose-50 text-rose-900 border border-rose-200">
                <div className="font-medium mb-1">게시가 차단되었습니다.</div>
                <div className="mb-1">이유: {postError}</div>
                {postViol.length ? (
                  <ul className="list-disc list-inside">
                    {postViol.map((v,i)=>(<li key={i}>{v.reason}</li>))}
                  </ul>
                ) : null}
              </div>
            )}
            {showGuide && (
              <div className="text-xs p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="font-medium mb-1">안전 가이드</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>욕설/혐오, 홍보/스팸, 연락처(전화/메일/채널) 포함 시 차단됩니다.</li>
                  <li>링크는 3개 이하, 과도한 반복문자/이모지는 지양해 주세요.</li>
                  <li>도움이 필요하면 1393(자살예방상담), 129(정신건강), 112(긴급)으로 연락해 주세요.</li>
                </ul>
              </div>
            )}
            <Textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="오늘의 꿈을 익명으로 공유해 보세요(텍스트)" className="min-h-[100px] text-sm" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input id="priv" type="checkbox" checked={priv} onChange={(e)=>setPriv(e.target.checked)} />
                <Label htmlFor="priv" className="text-sm">프라이빗 일기</Label>
                <Badge className="ml-2" variant="secondary">{isPlus ? 'Plus' : 'Free'}</Badge>
              </div>
              <Button size="sm" onClick={addPost} disabled={text.trim().length < 6 || (!isPlus && !canPost)}>
                <Send className="w-4 h-4 mr-1" />게시
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        <div className="space-y-3">
          {feed.length === 0 && (
            <p className="text-sm opacity-70">아직 게시물이 없습니다. 첫 번째 이야기를 남겨 보세요.</p>
          )}
          {feed.map((p) => (
            <Card key={p.id} className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{p.anon}</span>
                    {p.pinned && <Pin className="w-4 h-4" />}
                    {p.private && <Badge variant="secondary">Private</Badge>}
                  </div>
                  <div className="text-xs opacity-70">{new Date(p.createdAt).toLocaleString()}</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {p.reported ? (
                  <div className="text-xs p-2 rounded-md bg-rose-50 text-rose-900 border border-rose-200">신고된 게시물입니다.</div>
                ) : (
                  <p className="whitespace-pre-wrap leading-6">{p.text}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={()=> vote(p.id, +1)}><ThumbsUp className="w-4 h-4 mr-1" />{p.votes||0}</Button>
                  <Button variant="secondary" size="sm" onClick={()=> setOpenPost(p)}><MessageSquare className="w-4 h-4 mr-1" />댓글</Button>
                  <Button variant="secondary" size="sm" onClick={()=> report(p.id)}><Shield className="w-4 h-4 mr-1" />신고</Button>
                  <Button variant="secondary" size="sm" onClick={()=> blockUser(p.anon)}><X className="w-4 h-4 mr-1" />차단</Button>
                  <a className="text-xs underline opacity-70" href={`/api/og?text=${encodeURIComponent(p.text.slice(0, 120))}`} target="_blank" rel="noopener noreferrer">공유 이미지</a>
                  <div className="flex-1" />
                  <Button variant="secondary" size="sm" onClick={()=> togglePin(p.id)}><Pin className="w-4 h-4 mr-1" />핀</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comment Drawer */}
        {openPost && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center" onClick={()=> setOpenPost(null)}>
            <div className="bg-white dark:bg-zinc-900 w-full sm:w-[520px] max-h-[80vh] rounded-t-2xl sm:rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800/60" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{openPost.anon}의 글</div>
                <Button variant="ghost" size="icon" onClick={()=> setOpenPost(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="text-sm whitespace-pre-wrap p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 mb-2">{openPost.text}</div>
              <div className="space-y-2">
                <div className="text-xs opacity-70">댓글</div>
                {commentError && (
                  <div className="text-xs p-2 rounded-md bg-rose-50 text-rose-900 border border-rose-200">
                    <div className="mb-1">등록이 차단되었습니다: {commentError}</div>
                    {commentViol.length ? (
                      <ul className="list-disc list-inside">
                        {commentViol.map((v,i)=>(<li key={i}>{v.reason}</li>))}
                      </ul>
                    ) : null}
                  </div>
                )}
                <div className="space-y-2 max-h-[38vh] overflow-auto pr-1">
                  {comments.filter(c => c.postId === openPost.id).map(c => (
                    <div key={c.id} className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="text-xs opacity-70 mb-1">{c.anon} · {new Date(c.createdAt).toLocaleString()}</div>
                      <div className="text-sm whitespace-pre-wrap">{c.text}</div>
                    </div>
                  ))}
                  {comments.filter(c => c.postId === openPost.id).length === 0 && (
                    <div className="text-xs opacity-60">아직 댓글이 없습니다.</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Textarea value={cText} onChange={(e)=>setCText(e.target.value)} placeholder="댓글을 입력" className="min-h-[44px] text-sm" />
                  <Button onClick={()=> addComment(openPost.id)} disabled={cText.trim().length === 0}><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-[11px] opacity-60">© {new Date().getFullYear()} DreamInsight • 커뮤니티(로컬 저장 버전)</div>
      </div>
    </div>
  );
}
