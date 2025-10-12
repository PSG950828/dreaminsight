import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md w-full mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">서비스 정책 변경</h1>
        <p className="opacity-80 text-sm">
          꿈해석 서비스가 <strong>완전 무료</strong>로 전환되었습니다!<br/>
          결제 없이도 모든 기능을 사용하실 수 있어요.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/" className="px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">홈으로</Link>
        </div>
        <p className="opacity-60 text-xs mt-2">결제 관련 기능은 더 이상 제공되지 않습니다.</p>
      </div>
    </div>
  );
}

