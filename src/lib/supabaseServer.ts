function loadCreateClient(): any | null {
  try {
    const req = (Function('try{return require}catch(e){return null}')() as any);
    if (req) {
      try { return req('@supabase/supabase-js')?.createClient || null; } catch {}
    }
  } catch {}
  return null;
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  try {
    const createClient = loadCreateClient();
    if (!createClient) return null;
    return createClient(url, service, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}
