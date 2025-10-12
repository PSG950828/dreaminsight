import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { moderateText } from '@/lib/moderation';

function validateText(text: string) {
  const t = (text || '').trim();
  if (t.length < 1 || t.length > 1000) return '길이가 너무 짧거나 깁니다.';
  const urlCount = (t.match(/https?:\/\//gi) || []).length;
  if (urlCount > 2) return '링크가 너무 많습니다.';
  return '';
}

export async function POST(req: Request) {
  // CSRF/Origin check (optional)
  try {
    if (process.env.ENABLE_CSRF === 'true') {
      const origin = req.headers.get('origin') || '';
      const host = new URL(req.url).origin;
      const allow = (process.env.CSRF_ORIGIN_ALLOW || '').split(/[\s,]+/).filter(Boolean);
      if (origin && origin !== host && !allow.includes(origin)) {
        return NextResponse.json({ error: 'csrf_rejected' }, { status: 403 });
      }
    }
  } catch {}

  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { post_id, text, anon_name, user_uid } = body || {};
  if (!post_id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const err = validateText(text || '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const mod = moderateText(text || '');
  if (!mod.ok) {
    try { await sb.from('telemetry_events').insert({ type: 'moderation', k: 'block.comment', delta: 1, user_uid: String(user_uid||'') }); } catch {}
    return NextResponse.json({ error: '댓글에 허용되지 않는 내용이 포함되어 있습니다.', violations: mod.violations }, { status: 400 });
  }
  // 게시글 존재/조회(비공개면 작성자만 댓글 허용 — 필요 정책에 맞게 조정)
  try {
    const { data: post } = await sb.from('posts').select('id,user_uid,private').eq('id', String(post_id)).single();
    if (!post) return NextResponse.json({ error: 'post_not_found' }, { status: 404 });
    if (post.private && user_uid && post.user_uid && post.user_uid !== user_uid) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }
  } catch {}

  // Daily quota
  try {
    const limit = parseInt(String(process.env.DAILY_QUOTA_COMMENTS || '10'), 10) || 10;
    const since = new Date(Date.now() - 24*60*60*1000).toISOString();
    const { count } = await sb.from('telemetry_events').select('*', { count: 'exact', head: true })
      .eq('user_uid', String(user_uid||''))
      .eq('type', 'quota')
      .eq('k', 'comment')
      .gte('created_at', since);
    if ((count || 0) >= limit) {
      return NextResponse.json({ error: 'quota_exceeded', upsell: true }, { status: 429 });
    }
  } catch {}

  const cleanAnon = String(anon_name||'').slice(0, 40);
  const { data, error } = await sb.from('comments').insert({ post_id, text, anon_name: cleanAnon, user_uid }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await sb.from('telemetry_events').insert({ user_uid: String(user_uid||''), type: 'quota', k: 'comment', delta: 1 }); } catch {}
  return NextResponse.json({ comment: data });
}
