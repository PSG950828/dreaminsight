"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark as BookmarkIcon, Share2 } from "lucide-react";

export default function CommunityPage() {
  const [mode, setMode] = useState<'card'|'list'>('card');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest'|'likes'|'hot'>('latest');
  const [showImages, setShowImages] = useState(true);
  const [filterTag, setFilterTag] = useState('');
  // 더미 피드 (데모용). 실제 데이터 연동 전 단계.
  const base = useMemo(()=>[
    { id:'p1', anon:'잔잔한 사슴', createdAt: Date.now()-1000*60*5, text:'로또 맞는 꿈을 꿨어요. 파란 바다가 나오고 기분이 좋았어요.', likes:12, comments:3, img:true },
    { id:'p2', anon:'빛나는 여우', createdAt: Date.now()-1000*60*30, text:'시험장에 갔는데 준비가 안 돼 말이 안 나왔어요.', likes:5, comments:1, img:false },
    { id:'p3', anon:'깊은 돌고래', createdAt: Date.now()-1000*60*60*2, text:'낯선 도시에서 길을 잃고 높은 곳에서 떨어질 뻔했어요.', likes:8, comments:2, img:true },
    { id:'p4', anon:'차분한 부엉이', createdAt: Date.now()-1000*60*90, text:'보라빛 조명 속에서 달리며 크게 웃었어요.', likes:14, comments:4, img:true },
    { id:'p5', anon:'선명한 늑대', createdAt: Date.now()-1000*60*240, text:'집을 청소하다가 잃어버린 반지를 찾았어요.', likes:2, comments:0, img:false },
    { id:'p6', anon:'고요한 펭귄', createdAt: Date.now()-1000*60*360, text:'비 오는 날 우산 없이 걸었는데 이상하게 마음이 편안했어요.', likes:6, comments:2, img:false },
  ], []);
  // 스크롤 데모를 위해 반복 확장
  const posts = useMemo(()=>{
    const arr: any[] = [];
    for (let i=0;i<4;i++) {
      for (const p of base) arr.push({ ...p, id: p.id+"_"+i, createdAt: p.createdAt - i*3600_000 });
    }
    return arr;
  }, [base]);
  // 태그/검색/정렬
  const extractTags = (text: string) => (text.match(/#[\w가-힣]+/g) || []).map(s=> s.slice(1).toLowerCase());
  const trending = useMemo(()=>{
    const c: Record<string, number> = {};
    base.forEach(p => extractTags(p.text).forEach(t => { c[t] = (c[t]||0) + 1; }));
    return Object.entries(c).sort((a,b)=> b[1]-a[1]).slice(0, 12);
  }, [base]);

  // 인피니트 스크롤 상태
  const [showCount, setShowCount] = useState(8);
  const pageSize = 8;
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(()=>{
    const el = endRef.current; if (!el) return;
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e => { if (e.isIntersecting) setShowCount(c=> Math.min(c + pageSize, posts.length)); });
    }, { rootMargin: '200px' });
    io.observe(el);
    return ()=> io.disconnect();
  }, [pageSize, posts.length]);
  // 필터/정렬 적용 후 가시 리스트
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    let arr = posts.filter(p => {
      if (filterTag && !extractTags(p.text).includes(filterTag.toLowerCase())) return false;
      if (!q) return true;
      return p.anon.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
    });
    if (sortBy === 'likes') arr = [...arr].sort((a,b)=> (b.likes - a.likes) || (b.createdAt - a.createdAt));
    else if (sortBy === 'hot') arr = [...arr].sort((a,b)=> (b.likes*0.7 + b.comments) - (a.likes*0.7 + a.comments));
    else arr = [...arr].sort((a,b)=> b.createdAt - a.createdAt);
    return arr;
  }, [posts, query, sortBy, filterTag]);
  const visible = filtered.slice(0, showCount);
  // 라이트박스(이미지 확대) — 더미 그라디언트 확대 표시 + 좌우 이동
  const [lightbox, setLightbox] = useState<{ open: boolean; idx: number }>({ open: false, idx: 0 });
  const imageIds = useMemo(() => visible.filter(p=> p.img && showImages).map(p=> p.id), [visible, showImages]);
  const openLightboxById = (id: string) => {
    const i = imageIds.indexOf(id);
    if (i >= 0) setLightbox({ open: true, idx: i });
  };
  const stepLightbox = (d: number) => {
    setLightbox(s => {
      if (!s.open || imageIds.length === 0) return s;
      const n = (s.idx + d + imageIds.length) % imageIds.length;
      return { open: true, idx: n };
    });
  };
  const closeLightbox = () => setLightbox({ open:false, idx:0 });
  // 키보드 네비게이션(라이트박스): ←/→, ESC
  useEffect(()=>{
    if (!lightbox.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeLightbox(); }
      else if (e.key === 'ArrowLeft') { stepLightbox(-1); }
      else if (e.key === 'ArrowRight') { stepLightbox(1); }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [lightbox.open, imageIds.length]);

  // 시간 포맷(간결)
  const fmtTime = (t:number) => {
    const d = new Date(t); const now = new Date();
    const pad=(n:number)=> String(n).padStart(2,'0');
    const sameDay = d.toDateString()===now.toDateString();
    const yday = new Date(now.getTime()-86400000);
    const isYesterday = d.toDateString()===yday.toDateString();
    if (sameDay) return `오늘 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (isYesterday) return `어제 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">DreamInsight 커뮤니티</h1>
          <p className="opacity-70 text-sm mt-1">레이아웃 개편 중입니다. 곧 더 깔끔하고 고급스러운 보드로 개선됩니다.</p>
        </header>

        {/* 1) 안전한 스텝: 상단 툴바(고정) */}
        <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 py-3 mb-4 bg-white/85 dark:bg-zinc-900/70 backdrop-blur border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input value={query} onChange={(e)=> setQuery(e.target.value)} className="min-w-[200px] flex-1 bg-transparent border rounded px-3 py-2 text-sm" placeholder="검색(닉/내용)" />
            <label className="text-xs flex items-center gap-1"><input type="checkbox" /> 댓글 포함</label>
            <label className="text-xs flex items-center gap-1"><input type="checkbox" /> 내 글만</label>
            <select value={sortBy} onChange={(e)=> setSortBy(e.target.value as any)} className="bg-transparent border rounded px-2 py-2 text-xs">
              <option value="latest">최신순</option>
              <option value="likes">추천순</option>
              <option value="hot">인기(HOT)</option>
            </select>
            <div className="ml-auto flex items-center gap-1 text-xs">
              <button className={`px-2 py-1 rounded-md border ${mode==='card'?'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900':''}`} onClick={()=> setMode('card')}>카드</button>
              <button className={`px-2 py-1 rounded-md border ${mode==='list'?'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900':''}`} onClick={()=> setMode('list')}>리스트</button>
            </div>
          </div>
        </div>

        {/* 2) 보기 전환 + 더미 피드 (좌) + 사이드(우) */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div>
        {mode==='card' ? (
          <section className="grid gap-3 md:grid-cols-2">
            {visible.map(p => (
              <article key={p.id} className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/60 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between text-xs opacity-70 mb-2">
                  <div className="font-medium">{p.anon}</div>
                  <div className="tabular-nums">{fmtTime(p.createdAt)}</div>
                </div>
                {showImages && p.img && (
                  <div className="mb-2">
                    <button aria-label="이미지 확대" onClick={()=> openLightboxById(p.id)} className="w-full h-44 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-indigo-200 to-indigo-400 dark:from-indigo-900 dark:to-indigo-700 cursor-zoom-in" />
                  </div>
                )}
                <p className="text-sm leading-6 line-clamp-3">{p.text}</p>
                <div className="mt-3 flex items-center gap-2 text-xs tabular-nums">
                  <button title="좋아요" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><Heart className="w-3.5 h-3.5" /></button>
                  <span className="opacity-70 mr-2">{p.likes}</span>
                  <button title="댓글" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><MessageCircle className="w-3.5 h-3.5" /></button>
                  <span className="opacity-70 mr-2">{p.comments}</span>
                  <button title="저장" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><BookmarkIcon className="w-3.5 h-3.5" /></button>
                  <button title="공유" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><Share2 className="w-3.5 h-3.5" /></button>
                  <Link href="#" className="ml-auto underline opacity-80">보기</Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="space-y-2">
            {visible.map(p => (
              <article key={p.id} className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/60 p-3 transition-colors hover:bg-white dark:hover:bg-zinc-900">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] opacity-70 mb-1">
                      <span className="font-medium mr-1">{p.anon}</span>
                      <span className="tabular-nums">{fmtTime(p.createdAt)}</span>
                      <span className="ml-2 tabular-nums">· 👍 {p.likes}</span>
                      <span className="ml-2 tabular-nums">· 💬 {p.comments}</span>
                    </div>
                    <div className="text-sm leading-6 line-clamp-2">{p.text}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs tabular-nums">
                      <button title="좋아요" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><Heart className="w-3.5 h-3.5" /></button>
                      <span className="opacity-70 mr-2">{p.likes}</span>
                      <button title="댓글" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><MessageCircle className="w-3.5 h-3.5" /></button>
                      <span className="opacity-70 mr-2">{p.comments}</span>
                      <button title="저장" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><BookmarkIcon className="w-3.5 h-3.5" /></button>
                      <button title="공유" className="size-8 rounded-md border hover-elev inline-flex items-center justify-center"><Share2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="hidden sm:block w-24 h-16 rounded-md border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden">
                    {showImages && p.img ? (
                      <button aria-label="이미지 확대" onClick={()=> openLightboxById(p.id)} className="w-full h-full bg-gradient-to-br from-indigo-200 to-indigo-400 dark:from-indigo-900 dark:to-indigo-700 cursor-zoom-in" />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800" />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* 더보기 버튼 + 센티널 */}
        {showCount < posts.length && (
          <div className="flex items-center justify-center mt-3">
            <button className="px-3 py-1.5 rounded-md border text-sm" onClick={()=> setShowCount(c=> Math.min(c + pageSize, posts.length))}>더보기</button>
          </div>
        )}
        <div ref={endRef} className="h-6" />

        </div>
        {/* 사이드바 */}
        <aside className="hidden lg:block space-y-3">
          <section className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 p-4">
            <div className="text-sm font-medium mb-2">실시간 태그</div>
            <div className="flex flex-wrap gap-2">
              {trending.length ? trending.map(([t,n]) => (
                <button key={t} className={`px-2 py-1 rounded-full border text-xs ${filterTag===t? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900':''}`} onClick={()=>{ setFilterTag(filterTag===t? '' : t); setShowCount(8); }}>
                  #{t} <span className="opacity-60">({n})</span>
                </button>
              )) : <div className="text-xs opacity-60">태그가 없습니다.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between"><span>이미지 표시</span><input type="checkbox" checked={showImages} onChange={(e)=> setShowImages(e.target.checked)} /></div>
            <div className="flex items-center justify-between"><span>정렬</span>
              <select value={sortBy} onChange={(e)=> setSortBy(e.target.value as any)} className="bg-transparent border rounded px-2 py-1">
                <option value="latest">최신순</option>
                <option value="likes">추천순</option>
                <option value="hot">인기(HOT)</option>
              </select>
            </div>
          </section>
        </aside>
        </div>

        {/* 안내 */}
        {/* 라이트박스(더미) */}
        {lightbox.open && imageIds.length>0 && (
          <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center" onClick={closeLightbox}>
            <div className="relative w-[92vw] max-w-3xl h-[62vh]" onClick={(e)=> e.stopPropagation()}>
              <div className="absolute inset-0 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-indigo-200 to-indigo-400 dark:from-indigo-900 dark:to-indigo-700 shadow-xl" />
              <button aria-label="이전" onClick={()=> stepLightbox(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/80 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 text-sm">‹</button>
              <button aria-label="다음" onClick={()=> stepLightbox(1)} className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/80 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 text-sm">›</button>
              <button aria-label="닫기" onClick={closeLightbox} className="absolute right-2 top-2 size-9 rounded-full bg-white/80 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 text-sm">×</button>
              <div className="absolute left-0 right-0 -bottom-10 text-center text-xs opacity-80 tabular-nums">{lightbox.idx+1} / {imageIds.length}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
