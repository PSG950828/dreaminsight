# Legacy Checkout Success Page

완전 무료 정책 이전에 사용되던 결제 성공 페이지 코드입니다.

```tsx
"use client";
import React, { useEffect } from "react";
import { getDeviceUID } from "@/lib/supabaseClient";
import Link from "next/link";

export default function SuccessPage() {
  useEffect(() => {
    try {
      localStorage.setItem("dreaminsight.plus", "1");
      // Determine entitlement duration from URL (?plan=day|week|month or ?days=30), fallback 365
      const sp = new URLSearchParams(location.search);
      const plan = (sp.get('plan') || '').toLowerCase();
      const planDays = plan === 'day' ? 1 : plan === 'week' ? 7 : plan === 'month' ? 30 : NaN;
      const dParam = parseInt(sp.get('days') || '', 10);
      const days = Number.isFinite(planDays) ? (planDays as number) : (Number.isFinite(dParam) && dParam > 0 ? dParam : 365);
      const maxAge = days * 24 * 60 * 60;
      document.cookie = `di_plus=1; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
      // Persist entitlement on server (best-effort)
      const uid = getDeviceUID();
      const until = new Date(Date.now() + days*24*60*60*1000).toISOString();
      fetch('/api/entitlements/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_uid: uid, plus_until: until }) }).catch(()=>{});
      // Telemetry: checkout success by plan
      try {
        const key = plan ? `success.${plan}` : (Number.isFinite(dParam) ? `success.${dParam}d` : 'success.unknown');
        fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'checkout', key, delta: 1, user_uid: uid }) }).catch(()=>{});
      } catch {}
      // Record last plan locally for post-purchase upsell (e.g., day -> month)
      try { localStorage.setItem('di.last_plan', plan || (Number.isFinite(dParam) ? `${dParam}d` : 'unknown')); localStorage.setItem('di.last_plan_at', String(Date.now())); } catch {}
    } catch {}
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md w-full mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Plus가 활성화되었습니다 🎉</h1>
        <p className="opacity-80 text-sm">
          Plus 기능이 해제되었습니다. 이제 심층 내러티브 전체 보기와 GI 차원 분해 등 프리미엄 기능을 사용할 수 있어요.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/" className="px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">홈으로</Link>
          <Link href="/?tab=report" className="px-4 py-2 rounded-md border text-sm">리포트 보기</Link>
        </div>
        <p className="opacity-60 text-xs mt-2">
          결제 후 자동으로 이 페이지로 이동하지 않았다면, Stripe Payment Link 설정에서 성공 리다이렉트를 <code>/checkout/success</code>로 지정하세요.
        </p>
      </div>
    </div>
  );
}
```
