# Legacy Checkout Cancel Page

```tsx
import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md w-full mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">결제가 취소되었습니다</h1>
        <p className="opacity-80 text-sm">언제든지 다시 시도하실 수 있어요. 궁금한 점이 있으면 문의해 주세요.</p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/" className="px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">홈으로</Link>
        </div>
        <p className="opacity-60 text-xs mt-2">Stripe Payment Link에서 취소 리다이렉트를 <code>/checkout/cancel</code>로 지정하면 이 화면이 표시됩니다.</p>
      </div>
    </div>
  );
}
```
