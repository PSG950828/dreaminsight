import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { moderateText } from '@/lib/moderation';

function validateText(text: string) {
  const t = (text || '').trim();
  if (t.length < 6 || t.length > 2000) return '길이가 너무 짧거나 깁니다.';
  const urlCount = (t.match(/https?:\/\//gi) || []).length;
  if (urlCount > 3) return '링크가 너무 많습니다.';
  // 해시태그 개수 제한(최대 10개)
  try {
    const tags = (t.match(/(^|\s)#([\p{L}\p{N}_]{1,32})/giu) || []);
    if (tags.length > 10) return '해시태그는 최대 10개까지 가능합니다.';
    const FORBIDDEN_TAGS = new Set<string>(['성인','야동','음란','카지노','도박','대출','불법','스팸']);
    for (const m of tags) {
      const tag = m.replace(/^[^#]*#/, '').toLowerCase();
      if (FORBIDDEN_TAGS.has(tag)) return '금지된 해시태그가 포함되어 있습니다.';
    }
  } catch {}
  // 금지어(간단)
  const forbidden = ['야동','포르노','카지노','도박','대출','무료 머니','코인 리딩','선물 증정'];
  if (forbidden.some(w => t.toLowerCase().includes(w.replace(/\s+/g,' ').toLowerCase()))) return '금지된 단어가 포함되어 있습니다.';
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
  const { text, anon_name, user_uid, private: isPrivate } = body || {};
  const err = validateText(text || '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const mod = moderateText(text || '');
  if (!mod.ok) {
    try { await sb.from('telemetry_events').insert({ type: 'moderation', k: 'block.post', delta: 1, user_uid: String(user_uid||'') }); } catch {}
    return NextResponse.json({ error: '게시물에 허용되지 않는 내용이 포함되어 있습니다.', violations: mod.violations }, { status: 400 });
  }
  // 비공개 글은 사용자 식별자 필수
  if (!!isPrivate && !user_uid) {
    return NextResponse.json({ error: 'user_required_for_private' }, { status: 400 });
  }
  // Daily quota (optional, server-side)
  try {
    const limit = parseInt(String(process.env.DAILY_QUOTA_POSTS || '3'), 10) || 3;
    const since = new Date(Date.now() - 24*60*60*1000).toISOString();
    const { count } = await sb.from('telemetry_events').select('*', { count: 'exact', head: true })
      .eq('user_uid', String(user_uid||''))
      .eq('type', 'quota')
      .eq('k', 'post')
      .gte('created_at', since);
    if ((count || 0) >= limit) {
      return NextResponse.json({ error: 'quota_exceeded', upsell: true }, { status: 429 });
    }
  } catch {}

  const cleanAnon = String(anon_name||'').slice(0, 40);
  const { data, error } = await sb.from('posts').insert({ text, anon_name: cleanAnon, user_uid, private: !!isPrivate }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await sb.from('telemetry_events').insert({ user_uid: String(user_uid||''), type: 'quota', k: 'post', delta: 1 }); } catch {}
  return NextResponse.json({ post: data });
}
