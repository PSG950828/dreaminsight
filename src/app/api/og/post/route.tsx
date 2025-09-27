import { ImageResponse } from 'next/og';
import { getSupabase } from '@/lib/supabaseClient';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  if (!id) return new Response('Missing id', { status: 400 });

  const sb = getSupabase();
  if (!sb) return new Response('Supabase not configured', { status: 500 });
  let text = 'DreamInsight';
  let anon = '익명';
  let createdAt = '';
  try {
    const { data } = await sb.from('posts').select('text, anon_name, created_at').eq('id', id).single();
    if (data) {
      text = String((data as any).text || 'DreamInsight');
      anon = String((data as any).anon_name || '익명');
      createdAt = new Date((data as any).created_at).toLocaleDateString();
    }
  } catch {}

  const title = text.slice(0, 80);
  // Simple badge extraction (colors + keywords)
  const lower = text.toLowerCase();
  const badges: string[] = [];
  const push = (b: string) => { if (badges.length < 5 && !badges.includes(b)) badges.push(b); };
  if (/빨강|red/.test(lower)) push('빨강');
  if (/파랑|푸른|blue/.test(lower)) push('파랑');
  if (/초록|녹색|green/.test(lower)) push('초록');
  if (/검정|black/.test(lower)) push('검정');
  if (/노랑|yellow/.test(lower)) push('노랑');
  if (/병원|검진|수술|주사|두통|복통|기침|발열/.test(lower)) push('건강');
  if (/연인|이별|질투|화해|친구|상사|동료/.test(lower)) push('관계');
  if (/로그인|비번|2fa|해킹|알림|동기화|파일|용량/.test(lower)) push('디지털');
  const subtitle = `${anon} · ${createdAt}`;
  const width = 1200;
  const height = 630;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0b0b0b 0%, #111827 60%)', color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
          padding: '64px', boxSizing: 'border-box',
          justifyContent: 'space-between', position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: 9999, background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(17,24,39,0) 70%)' }} />
        <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ opacity: 0.9, fontSize: 26 }}>{subtitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }} />
            <div style={{ fontSize: 26, opacity: 0.95 }}>DreamInsight</div>
          </div>
        </div>
        {badges.length ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
            {badges.map((b, i) => (
              <div key={i} style={{ padding: '6px 10px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', fontSize: 18, opacity: 0.95 }}>{b}</div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    { width, height }
  );
}

