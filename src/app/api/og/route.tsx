// Basic Open Graph image generator
// Usage: /api/og?text=... (first 120 chars recommended)
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get('text') || 'DreamInsight')
    .slice(0, 160)
    .replace(/\s+/g, ' ');

  const width = 1200;
  const height = 630;

  // Simple keyword badges + CTA
  const lower = text.toLowerCase();
  const badges: string[] = [];
  const push = (b: string) => { if (badges.length < 5 && !badges.includes(b)) badges.push(b); };
  if (/빨강|red/.test(lower)) push('빨강');
  if (/파랑|푸른|blue/.test(lower)) push('파랑');
  if (/초록|녹색|green/.test(lower)) push('초록');
  if (/검정|black/.test(lower)) push('검정');
  if (/노랑|yellow/.test(lower)) push('노랑');
  if (/두려움|무섭|쫄|fear|anx/.test(lower)) push('두려움');
  if (/기쁨|행복|happy|joy/.test(lower)) push('기쁨');
  const cta = '내 꿈 해석해보기 → dreaminsight';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0b0b0b 0%, #111827 60%)', color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
          padding: '48px', boxSizing: 'border-box',
          justifyContent: 'space-between', position: 'relative'
        }}
      >
        <div style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: 9999, background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(17,24,39,0) 70%)' }} />
        <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{text}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ opacity: 0.9, fontSize: 26 }}>DreamInsight — 꿈 해석 커뮤니티</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }} />
          </div>
        </div>
        {badges.length ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {badges.map((b, i) => (
              <div key={i} style={{ padding: '6px 10px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', fontSize: 18, opacity: 0.95 }}>{b}</div>
            ))}
          </div>
        ) : null}
        <div style={{ marginTop: 16, opacity: 0.95, fontSize: 22 }}>{cta}</div>
      </div>
    ),
    { width, height }
  );
}
