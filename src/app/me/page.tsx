"use client";
import React from 'react';
import { getSupabase, getDeviceUID } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MePage() {
  const sb = getSupabase();
  const [email, setEmail] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [userId, setUserId] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  async function refreshSession() {
    try {
      if (!sb) return;
      const { data } = await (sb as any).auth.getUser();
      const u = data?.user || null;
      setUserId(u?.id || null);
      setUserEmail(u?.email || null);
      if (u?.id) {
        // Link device cookie to auth user for server storage
        try {
          document.cookie = `di_uid=${encodeURIComponent(u.id)}; Path=/; SameSite=Lax; Max-Age=${365*24*60*60}`;
        } catch {}
      }
    } catch {}
  }

  React.useEffect(() => { refreshSession(); }, []);

  async function sendMagicLink() {
    try {
      if (!sb) { setMsg('Supabase 미구성'); return; }
      setMsg('로그인 링크 전송 중...');
      const redirectTo = typeof location !== 'undefined' ? location.origin + '/me' : undefined;
      const { error } = await (sb as any).auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) { setMsg('전송 실패: ' + error.message); return; }
      setMsg('메일함을 확인하세요. 로그인 링크를 보냈습니다.');
    } catch (e:any) {
      setMsg('오류: ' + (e?.message || e));
    }
  }

  async function signOut() {
    try { if (sb) await (sb as any).auth.signOut(); } catch {}
    setUserId(null); setUserEmail(null);
    try { document.cookie = `di_uid=${encodeURIComponent(getDeviceUID())}; Path=/; SameSite=Lax; Max-Age=${365*24*60*60}`; } catch {}
    setMsg('로그아웃했습니다.');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md mx-auto px-4 py-6 sm:py-10 space-y-4">
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2"><CardTitle className="text-lg">내 계정</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {userId ? (
              <div className="space-y-2">
                <div>로그인됨: <b>{userEmail || userId}</b></div>
                <div className="text-xs opacity-70">서버 저장용 UID가 쿠키(di_uid)에 연결되었습니다.</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={refreshSession}>새로고침</Button>
                  <Button size="sm" variant="secondary" onClick={signOut}>로그아웃</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs opacity-80">이메일로 로그인 링크를 보내 드립니다.</div>
                <input className="w-full bg-transparent border rounded px-3 py-2" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={sendMagicLink} disabled={!email.includes('@')}>로그인 링크 보내기</Button>
                  <Button size="sm" variant="secondary" onClick={refreshSession}>세션 확인</Button>
                </div>
                <div className="text-xs opacity-70">지금은 로그인 없이도 기기 쿠키(di_uid)로 서버 보관함을 이용할 수 있습니다. 로그인 시 여러 기기에서 동기화됩니다.</div>
              </div>
            )}
            {msg && <div className="text-xs opacity-80">{msg}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

