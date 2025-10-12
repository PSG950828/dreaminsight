import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET() {
  const sb = getServiceSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 });
  try {
    const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
    // Try list root
    const { data, error } = await sb.storage.from(bucket).list('', { limit: 1 });
    if (error) return NextResponse.json({ ok: false, bucket, error: error.message }, { status: 500 });
    // Return sample public URL format
    const samplePath = 'health/_';
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(samplePath);
    return NextResponse.json({ ok: true, bucket, publicUrlSample: pub?.publicUrl || null });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}

