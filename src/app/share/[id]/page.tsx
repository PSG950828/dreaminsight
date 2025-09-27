import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

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

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
        <div className="max-w-md w-full mx-auto p-6 text-center space-y-3">
          <h1 className="text-xl font-bold">공유 페이지</h1>
          <p className="opacity-80 text-sm">게시물을 불러올 수 없습니다. 링크가 만료되었거나, 데이터베이스 연결이 설정되지 않았을 수 있어요.</p>
          <div>
            <Link href="/community" className="px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">커뮤니티로 이동</Link>
          </div>
        </div>
      </div>
    );
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
