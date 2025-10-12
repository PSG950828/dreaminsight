import { NextResponse } from 'next/server';
import { generatePDFBufferFromHTML } from '@/lib/pdf';

export const runtime = 'nodejs';

function escapeHtml(s: string) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function buildHTML(payload: any): string {
  const text: string = String(payload?.text || '');
  const a: any = payload?.analysis || {};
  const now = new Date();
  const lines: string[] = [];
  lines.push(`<h1 style="margin:0 0 8px 0; font-size:20px;">DreamInsight — 꿈 해석 리포트</h1>`);
  lines.push(`<div style="font-size:12px; opacity:.7; margin-bottom:16px;">작성일: ${now.toLocaleString()}</div>`);
  if (text) {
    lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">꿈 내용</h2>`);
    lines.push(`<div style=\"white-space:pre-wrap; line-height:1.6;\">${escapeHtml(text)}</div>`);
  }
  if (a?.summary) {
    lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">요약</h2><div>${escapeHtml(a.summary)}</div>`);
  }
  if (a?.answer) {
    lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">즉답</h2><div>${escapeHtml(a.answer)}</div>`);
  }
  const syms: any[] = a?.symbols || [];
  lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">상징 해석</h2>`);
  lines.push(`<ul>${syms.map(s=>`<li><b>${escapeHtml(s.label||'')}</b>: ${escapeHtml(s.meaning||'')}</li>`).join('') || '<li>(상징 없음)</li>'}</ul>`);
  const emos: string[] = a?.emotions || [];
  const cols: any[] = a?.colors || [];
  const acts: string[] = a?.actions || [];
  lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">감정/색/행동</h2>`);
  lines.push(`<div>감정: ${emos.join(', ')||'(없음)'}<br/>색: ${cols.map((c:any)=>`${escapeHtml(c.key)}(${escapeHtml(c.cue)})`).join(', ')||'(없음)'}<br/>행동: ${acts.join(', ')||'(없음)'}</div>`);
  const pats: string[] = a?.patterns || [];
  lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">패턴</h2>`);
  lines.push(`<ul>${pats.map(p=>`<li>${escapeHtml(p)}</li>`).join('') || '<li>(패턴 미도출)</li>'}</ul>`);
  const adv: string[] = a?.advice || [];
  lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">실천 조언</h2>`);
  lines.push(`<ul>${adv.map(x=>`<li>${escapeHtml(x)}</li>`).join('') || '<li>(조언 없음)</li>'}</ul>`);
  const prs: string[] = a?.journalingPrompts || [];
  lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">저널 프롬프트</h2>`);
  lines.push(`<ul>${prs.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`);
  // Action plan (optional)
  const plan: any[] = Array.isArray((a as any)?.actionPlan) ? (a as any).actionPlan : [];
  if (plan.length) {
    lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">행동 계획</h2>`);
    lines.push(`<ol>${plan.map(it=>`<li><b>${escapeHtml(String(it.title||''))}</b> — ${Number(it.duration)||0}분<br/>${escapeHtml(String(it.script||''))}</li>`).join('')}</ol>`);
  }
  // Evidence (optional)
  const ev: any = (a as any)?.evidence;
  if (ev?.rules?.length) {
    lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">근거 규칙</h2>`);
    lines.push(`<ul>${(ev.rules as string[]).map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul>`);
  }
  // GI/MDA (optional)
  if ((a as any)?.narrative) {
    lines.push(`<h2 style=\"font-size:16px; margin:12px 0 6px;\">심층 내러티브</h2>`);
    lines.push(`<div style=\"white-space:pre-wrap;\">${escapeHtml(String((a as any).narrative))}</div>`);
  }
  const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><title>DreamInsight Report</title>
  <style>@page{size:A4;margin:16mm 12mm;} body{font-family:-apple-system,system-ui,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,Arial,sans-serif;padding:0;color:#111;} ul{margin:0 0 8px 16px;}</style>
  </head><body style=\"padding:0 8px;\">${lines.join('\n')}</body></html>`;
  return html;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(()=> ({} as any));
    const html = String(payload?.html || '') || buildHTML(payload);
    const buf = await generatePDFBufferFromHTML(html);
    if (!buf) {
      return NextResponse.json({ error: 'not_configured', hint: 'Install puppeteer or puppeteer-core on server to enable server-side PDF.' }, { status: 501 });
    }
    // Use standard Response to avoid TS type friction with Node Buffer
    return new Response(new Uint8Array(buf as any), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dream-report-${Date.now()}.pdf"`
      }
    }) as any;
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 400 });
  }
}
