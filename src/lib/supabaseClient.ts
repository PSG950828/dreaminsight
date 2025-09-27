// Lazy loader to avoid hard dependency during build (when module may be missing)
function loadCreateClient(): any | null {
  try {
    // Try to access CommonJS require without bundler resolving it
    const req = (Function('try{return require}catch(e){return null}')() as any);
    if (req) {
      try { return req('@supabase/supabase-js')?.createClient || null; } catch {}
    }
  } catch {}
  return null;
}

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const createClient = loadCreateClient();
    if (!createClient) return null;
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

export function getDeviceUID(): string {
  if (typeof document === 'undefined') return 'server';
  try {
    const k = 'di_uid';
    const m = document.cookie.match(/(?:^|; )di_uid=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const v = `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    document.cookie = `di_uid=${encodeURIComponent(v)}; Max-Age=${365*24*60*60}; Path=/; SameSite=Lax`;
    return v;
  } catch {
    return `u_${Math.random().toString(36).slice(2)}`;
  }
}
