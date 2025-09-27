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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex',
          background: '#0b0b0b', color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
          padding: '48px', boxSizing: 'border-box',
          justifyContent: 'space-between', alignItems: 'flex-end',
          backgroundImage: 'radial-gradient(1200px 600px at 1000px -200px, #5b5fc7 0%, transparent 60%)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
          <div style={{ fontSize: 44, lineHeight: 1.3, fontWeight: 700 }}>{text}</div>
          <div style={{ opacity: 0.8, fontSize: 24 }}>DreamInsight — 꿈 해석 커뮤니티</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 16 }} />
        </div>
      </div>
    ),
    { width, height }
  );
}

