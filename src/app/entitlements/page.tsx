"use client";
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EntitlementsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Entitlements</h1>
          <Link href="/stats" className="text-sm underline">/stats</Link>
        </div>
        <Card className="rounded-2xl border-zinc-200/60 dark:border-zinc-800/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">서비스 정책 변경</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>꿈해석 서비스가 <strong>완전 무료</strong>로 전환되었습니다.</p>
            <p>모든 사용자가 제한 없이 꿈 분석 기능을 이용하실 수 있습니다.</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              이 페이지는 더 이상 사용되지 않습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
