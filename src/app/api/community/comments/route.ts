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
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const body = await req.json().catch(()=> ({} as any));
  const { post_id, text, anon_name, user_uid } = body || {};
  const err = validateText(text || '');
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const mod = moderateText(text || '');
  if (!mod.ok) return NextResponse.json({ error: '댓글에 허용되지 않는 내용이 포함되어 있습니다.', violations: mod.violations }, { status: 400 });
  const { data, error } = await sb.from('comments').insert({ post_id, text, anon_name, user_uid }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
