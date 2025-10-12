import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

function parseDataUrl(dataUrl: string): { mime: string; data: Buffer } | null {
  try {
    const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) return null;
    const mime = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');
    return { mime, data: buf };
  } catch {
    return null;
  }
}

function sniffMime(buf: Buffer): 'image/png'|'image/jpeg'|'image/webp'|'image/gif'|'' {
  if (!buf || buf.length < 12) return '';
  // PNG
  const pngSig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
  let ok = true;
  for (let i=0;i<pngSig.length;i++) if (buf[i] !== pngSig[i]) { ok = false; break; }
  if (ok) return 'image/png';
  // JPEG (SOI .. EOI)
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  // GIF87a / GIF89a
  const hdr = buf.slice(0,6).toString('ascii');
  if (hdr === 'GIF87a' || hdr === 'GIF89a') return 'image/gif';
  // WebP: RIFF....WEBP
  const riff = buf.slice(0,4).toString('ascii');
  const webp = buf.slice(8,12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
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
  try {
    const ct = req.headers.get('content-type') || '';
    let postId = '';
    let userUid = '';
    let mime = '';
    let data: Buffer | null = null;
    if (ct.startsWith('multipart/form-data')) {
      // FormData input: fields post_id,user_uid and file at 'image'
      const form = await (req as any).formData?.() || await (req as any).formData?.();
      const f = form?.get('image') as File | null;
      postId = String(form?.get('post_id') || '').trim();
      userUid = String(form?.get('user_uid') || '').trim();
      if (f && typeof (f as any).arrayBuffer === 'function') {
        mime = (f as any).type || '';
        const ab = await (f as any).arrayBuffer();
        data = Buffer.from(ab);
      }
    } else {
      // JSON input: { post_id, dataUrl, user_uid }
      const body = await req.json().catch(()=> ({} as any));
      postId = String(body?.post_id || '').trim();
      const dataUrl = String(body?.dataUrl || '');
      userUid = String(body?.user_uid || '').trim();
      const parsed = parseDataUrl(dataUrl);
      if (parsed) { mime = parsed.mime; data = parsed.data; }
    }
    if (!postId || !data) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    // 게시글 존재/소유 검증(가능한 경우)
    try {
      const { data: post } = await sb.from('posts').select('id,user_uid,private').eq('id', postId).single();
      if (!post) return NextResponse.json({ error: 'post_not_found' }, { status: 404 });
      if (post.private && userUid && post.user_uid && post.user_uid !== userUid) {
        try { await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.unauthorized', delta: 1 }); } catch {}
        return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
      }
    } catch {}
    // Validate image buffer
    const sniffed = sniffMime(data);
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(mime) || !sniffed) {
      // telemetry fail (unsupported type)
      try { if (userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.unsupported', delta: 1 }); } catch {}
      return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
    }
    // magic number와 선언 MIME이 불일치할 경우 거부
    const normalized = mime.toLowerCase().replace('jpg', 'jpeg');
    if (sniffed !== normalized) {
      try { if (userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.signature', delta: 1 }); } catch {}
      return NextResponse.json({ error: 'mime_mismatch' }, { status: 400 });
    }
    const max = 1.5 * 1024 * 1024; // 1.5MB
    if (data.length > max) {
      try { if (userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.too_large', delta: 1 }); } catch {}
      return NextResponse.json({ error: 'too_large' }, { status: 400 });
    }

  const bucket = process.env.SUPABASE_BUCKET_COMMUNITY || 'community';
  // optional dimension check (PNG/GIF only; others skip)
    try {
      const dims = getDimensionsIfAvailable(data, sniffed);
      if (dims) {
        const { width, height } = dims;
        if (width > 4096 || height > 4096) {
          try { if (userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.too_large', delta: 1 }); } catch {}
          return NextResponse.json({ error: 'too_large_dimensions' }, { status: 400 });
        }
      }
    } catch {}
    // Strip metadata/EXIF if possible (privacy)
    try {
      if (sniffed === 'image/jpeg') {
        data = stripJpegExif(data);
      } else if (sniffed === 'image/webp') {
        data = stripWebpExif(data);
      } else if (sniffed === 'image/png') {
        data = stripPngText(data);
      }
    } catch {}

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ext = sniffed.includes('png') ? 'png' : sniffed.includes('webp') ? 'webp' : sniffed.includes('gif') ? 'gif' : 'jpg';
    const path = `posts/${postId}/${filename}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, data, { contentType: mime, upsert: false });
    if (error) {
      try { if (userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.error', delta: 1 }); } catch {}
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
    // quota: upload count per day (optional)
    try {
      const limit = parseInt(String(process.env.DAILY_QUOTA_UPLOADS || '10'), 10) || 10;
      const since = new Date(Date.now() - 24*60*60*1000).toISOString();
      const { count } = await sb.from('telemetry_events').select('*', { count: 'exact', head: true })
        .eq('user_uid', String(userUid||''))
        .eq('type', 'quota')
        .eq('k', 'upload')
        .gte('created_at', since);
      if ((count || 0) >= limit) {
        return NextResponse.json({ error: 'quota_exceeded', upsell: true }, { status: 429 });
      }
      await sb.from('telemetry_events').insert({ user_uid: String(userUid||''), type: 'quota', k: 'upload', delta: 1 });
    } catch {}
    try { if (userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'success', delta: 1 }); } catch {}
    return NextResponse.json({ url: pub?.publicUrl || null, path });
  } catch (e: any) {
    try { const sb = getServiceSupabase(); const body = await req.json().catch(()=> ({} as any)); const userUid = String(body?.user_uid || '').trim(); if (sb && userUid) await sb.from('telemetry_events').insert({ user_uid: userUid, type: 'upload', k: 'fail.error', delta: 1 }); } catch {}
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

function getDimensionsIfAvailable(buf: Buffer, mime: string): { width: number; height: number } | null {
  try {
    if (mime === 'image/png' && buf.length >= 24) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return { width: w, height: h };
    }
    if (mime === 'image/gif' && buf.length >= 10) {
      const w = buf.readUInt16LE(6);
      const h = buf.readUInt16LE(8);
      return { width: w, height: h };
    }
    if (mime === 'image/jpeg') {
      const dim = jpegDims(buf);
      return dim;
    }
    if (mime === 'image/webp') {
      const dim = webpDims(buf);
      return dim;
    }
    return null;
  } catch { return null; }
}

function jpegDims(buf: Buffer): { width: number; height: number } | null {
  // Basic SOF parser (baseline/progressive)
  let pos = 2; // skip SOI 0xFFD8
  const len = buf.length;
  while (pos + 3 < len) {
    // find marker
    if (buf[pos] !== 0xFF) { pos++; continue; }
    let marker = buf[pos + 1];
    // skip fill bytes FF FF ..
    while (marker === 0xFF) { pos++; marker = buf[pos + 1]; }
    pos += 2;
    // Standalone markers
    if (marker === 0xD9 || marker === 0xDA) return null;
    if (pos + 2 > len) return null;
    const size = buf.readUInt16BE(pos); pos += 2;
    if (size < 2 || pos + size - 2 > len) return null;
    if (marker >= 0xC0 && marker <= 0xC3) { // SOF0..SOF3
      if (size >= 7) {
        const height = buf.readUInt16BE(pos + 1);
        const width = buf.readUInt16BE(pos + 3);
        return { width, height };
      }
      return null;
    }
    pos += size - 2;
  }
  return null;
}

function webpDims(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 16) return null;
  if (buf.slice(0,4).toString('ascii') !== 'RIFF') return null;
  if (buf.slice(8,12).toString('ascii') !== 'WEBP') return null;
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const fourcc = buf.slice(pos, pos+4).toString('ascii');
    const size = buf.readUInt32LE(pos+4);
    const dataStart = pos + 8;
    if (fourcc === 'VP8X' && size >= 10) {
      const d = buf.slice(dataStart, dataStart + size);
      // VP8X: 1(flags) + 3(reserved) + 3(width-1 LE) + 3(height-1 LE)
      const w1 = d[4] | (d[5] << 8) | (d[6] << 16);
      const h1 = d[7] | (d[8] << 8) | (d[9] << 16);
      return { width: w1 + 1, height: h1 + 1 };
    }
    // advance (padded to even)
    pos = dataStart + size + (size % 2);
  }
  return null;
}

// ===== EXIF strip helpers (JPEG/WEBP) =====
function stripPngText(buf: Buffer): Buffer {
  // Remove ancillary text chunks: tEXt, zTXt, iTXt (and time)
  if (buf.length < 8) return buf;
  const sig = buf.slice(0, 8);
  if (sig.toString('hex') !== '89504e470d0a1a0a') return buf;
  const keep = new Set(['IHDR','PLTE','IDAT','IEND','bKGD','pHYs','tIME']);
  const drop = new Set(['tEXt','zTXt','iTXt']);
  let pos = 8;
  const parts: Buffer[] = [sig];
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.slice(pos+4, pos+8).toString('ascii');
    const dataStart = pos + 8; const dataEnd = dataStart + len; const crcEnd = dataEnd + 4;
    if (crcEnd > buf.length) break;
    if (!drop.has(type)) {
      // Always keep critical chunks (IHDR/IDAT/IEND). For safety, keep known safe ancillary; drop tEXt family.
      parts.push(buf.slice(pos, crcEnd));
    }
    pos = crcEnd;
    if (type === 'IEND') break;
  }
  return Buffer.concat(parts);
}

function stripJpegExif(buf: Buffer): Buffer {
  // Copy JPEG while skipping APP1 (EXIF) and APP13 (IPTC) segments
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return buf;
  let pos = 2; // skip SOI
  const out: number[] = [0xFF, 0xD8];
  while (pos + 3 < buf.length) {
    if (buf[pos] !== 0xFF) { pos++; continue; }
    const marker = buf[pos + 1];
    // EOI or SOS: copy rest and break
    if (marker === 0xD9 || marker === 0xDA) {
      // append from pos to end
      for (let i=pos; i<buf.length; i++) out.push(buf[i]);
      break;
    }
    pos += 2;
    if (pos + 2 > buf.length) break;
    const size = buf.readUInt16BE(pos); pos += 2;
    if (size < 2 || pos + size - 2 > buf.length) break;
    const segStart = pos - 2; // include length bytes
    const segEnd = pos + size - 2;
    // Skip APP1 (0xE1) EXIF and APP13 (0xED) IPTC
    if (marker === 0xE1 || marker === 0xED) {
      pos = segEnd; // skip segment
      continue;
    }
    // copy this segment
    out.push(0xFF, marker, (size >> 8) & 0xFF, size & 0xFF);
    for (let i = pos; i < segEnd; i++) out.push(buf[i]);
    pos = segEnd;
  }
  return Buffer.from(out);
}

function stripWebpExif(buf: Buffer): Buffer {
  // Remove EXIF chunk in RIFF WebP if present
  if (buf.length < 12 || buf.slice(0,4).toString('ascii') !== 'RIFF' || buf.slice(8,12).toString('ascii') !== 'WEBP') return buf;
  const len = buf.length;
  let pos = 12;
  const outParts: Buffer[] = [buf.slice(0, 12)];
  while (pos + 8 <= len) {
    const fourcc = buf.slice(pos, pos+4).toString('ascii');
    const size = buf.readUInt32LE(pos+4);
    const dataStart = pos + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > len) break;
    // Drop EXIF, ICCP(ICC profile), XMP  (privacy-oriented)
    if (!['EXIF','ICCP','XMP '].includes(fourcc)) {
      outParts.push(buf.slice(pos, dataEnd + (size % 2)));
    }
    pos = dataEnd + (size % 2);
  }
  return Buffer.concat(outParts);
}
