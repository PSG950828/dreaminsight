import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { getServiceSupabase } from "@/lib/supabaseServer";
import React from "react";

type Params = { params: { id: string } };

async function fetchPostText(id: string): Promise<{ text: string; anon?: string; createdAt?: number } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from("posts").select("id, text, anon_name, created_at").eq("id", id).single();
    if (error || !data) return null;
    return { text: data.text as string, anon: (data as any).anon_name, createdAt: new Date((data as any).created_at).getTime() };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = params.id;
  const post = await fetchPostText(id);
  const title = post?.text ? `${post.text.slice(0, 40)}… | DreamInsight 공유` : "DreamInsight 공유";
  const og = `/api/og/post?id=${encodeURIComponent(id)}`;
  return {
    title,
    openGraph: {
      title,
      images: [og],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [og],
    },
  };
}

export default async function SharePage({ params }: Params) {
  const id = params.id;
  const post = await fetchPostText(id);
  const images = await listImages(id);

  if (!post) {
    return <LocalShareFallback id={id} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight">DreamInsight 공유</h1>
          <div className="text-xs opacity-70">{post.anon || "익명"} · {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}</div>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-sm whitespace-pre-wrap leading-6">
          {post.text}
        </div>
        {images.length ? (
          <div className="mt-3 flex gap-2 flex-wrap">
            {images.map((src, i)=> (<img key={i} src={src} alt="이미지" className="w-28 h-28 object-cover rounded-md border" />))}
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/api/og?text=${encodeURIComponent(post.text.slice(0,160))}`} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-80">OG 이미지 열기</Link>
          <div className="flex-1" />
          <Link href={`/?prefill=${encodeURIComponent(post.text)}&tab=history`} className="px-3 py-1.5 rounded-md border text-xs">해석해보기</Link>
          <Link href="/community" className="px-3 py-1.5 rounded-md border text-xs">커뮤니티</Link>
        </div>
      </div>
    </div>
  );
}

// Client-side fallback: try to read localStorage community posts
function LocalShareFallback({ id }: { id: string }) {
  'use client';
  const [localPost, setLocalPost] = React.useState<{ text: string; anon: string; createdAt: number } | null>(null);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('di.comm.posts.v1') || '[]';
      const arr = JSON.parse(raw) as Array<any>;
      const hit = arr.find(p => p?.id === id);
      if (hit) setLocalPost({ text: String(hit.text||''), anon: String(hit.anon||'익명'), createdAt: Number(hit.createdAt||Date.now()) });
    } catch {}
  }, [id]);
  if (!localPost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="max-w-md w-full mx-auto p-6 text-center space-y-3">
          <h1 className="text-xl font-bold">공유 페이지</h1>
          <p className="opacity-80 text-sm">서버에서 게시물을 찾지 못했고, 이 기기 로컬에서도 찾을 수 없습니다. 같은 기기에서 작성하셨다면 /community에서 확인해 주세요.</p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/community" className="px-3 py-1.5 rounded-md border text-xs">커뮤니티</Link>
            <Link href="/" className="px-3 py-1.5 rounded-md border text-xs">메인</Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight">DreamInsight 공유(로컬)</h1>
          <div className="text-xs opacity-70">{localPost.anon || '익명'} · {new Date(localPost.createdAt).toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-sm whitespace-pre-wrap leading-6">
          {localPost.text}
        </div>
        {/* 로컬 모드 이미지는 현재 공유 페이지에 표시하지 않음 */}
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/api/og?text=${encodeURIComponent(localPost.text.slice(0,160))}`} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-80">OG 이미지 열기</Link>
          <div className="flex-1" />
          <Link href={`/?prefill=${encodeURIComponent(localPost.text)}&tab=history`} className="px-3 py-1.5 rounded-md border text-xs">해석해보기</Link>
          <Link href="/community" className="px-3 py-1.5 rounded-md border text-xs">커뮤니티</Link>
        </div>
      </div>
    </div>
  );
}

async function listImages(postId: string): Promise<string[]> {
  try {
    const sb = getServiceSupabase();
    if (!sb) return [];
    const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
    const prefix = `posts/${postId}`;
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 20, sortBy: { column: 'created_at', order: 'asc' } as any });
    if (error) return [];
    const out: string[] = [];
    for (const f of data || []) {
      const p = `${prefix}/${f.name}`;
      const { data: pub } = sb.storage.from(bucket).getPublicUrl(p);
      if (pub?.publicUrl) out.push(pub.publicUrl);
    }
    return out;
  } catch { return []; }
}
