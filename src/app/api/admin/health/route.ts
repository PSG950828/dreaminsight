import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function isAdmin(req: Request) {
  try { const h = req.headers.get('cookie') || ''; return /(?:^|;\s*)di_admin=1(?:;|$)/.test(h); } catch { return false; }
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET_COMMUNITY: process.env.SUPABASE_BUCKET_COMMUNITY || 'community',
    ENABLE_AUTH: process.env.ENABLE_AUTH === 'true'
  };

  const sb = getServiceSupabase();
  const serviceReady = !!sb;
  const checks: any = { env, serviceReady };

  try {
    if (sb) {
      // Storage bucket list
      const bucket = env.SUPABASE_BUCKET_COMMUNITY || 'community';
      const list = await sb.storage.from(bucket).list('', { limit: 1 });
      checks.storage = { ok: !list.error, error: list.error?.message || '', bucket };
      // DB counts (head count)
      const countOf = async (table: string) => {
        const { count, error } = await sb.from(table as any).select('*', { count: 'exact', head: true });
        return { ok: !error, count: count || 0, error: error?.message || '' };
      };
      checks.db = {
        posts: await countOf('posts'),
        comments: await countOf('comments'),
        reports: await countOf('reports'),
        admin_aliases: await countOf('admin_aliases'),
        entitlements: await countOf('entitlements'),
        telemetry_events: await countOf('telemetry_events'),
      };
      // RPC smoke (optional)
      try {
        const rpc = await sb.rpc('list_posts', { p_uid: 'health' });
        checks.rpc = { list_posts: { ok: !rpc.error, rows: Array.isArray(rpc.data) ? (rpc.data as any[]).length : 0, error: rpc.error?.message || '' } };
      } catch { checks.rpc = { list_posts: { ok: false, rows: 0, error: 'rpc_failed' } }; }
    }
  } catch (e: any) {
    checks.error = e?.message || 'health_error';
  }

  // Recommendations
  const tips: string[] = [];
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) tips.push('Supabase 환경변수를 채워주세요.');
  if (!serviceReady) tips.push('서버 서비스 롤 키로 Supabase 클라이언트를 초기화할 수 없습니다.');
  if (checks.storage && !checks.storage.ok) tips.push(`스토리지 버킷(${env.SUPABASE_BUCKET_COMMUNITY}) 접근 오류: 정책/버킷 유무 확인.`);
  if (checks.rpc && !checks.rpc.list_posts?.ok) tips.push('RPC(list_posts) 점검: 함수 생성/권한 확인.');

  return NextResponse.json({ ok: true, checks, tips });
}

