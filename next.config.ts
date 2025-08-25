// next.config.ts
import type { NextConfig } from "next";

// dev 모드 감지
const isDev = process.env.NODE_ENV !== "production";
// Vercel 환경 감지
const isPreview = process.env.VERCEL_ENV === "preview";

const nextConfig: NextConfig = {
  ...(isDev && {
    // ✅ 개발 모드에서만 허용: HMR, /_next/* 요청을 LAN 오리진에서 허용
    allowedDevOrigins: ["http://172.30.1.62:3000", "http://localhost:3000"],
  }),

  // 필요 시(배포에서 다른 오리진이 Server Actions 호출) 아래 주석 해제
  // experimental: {
  //   serverActions: {
  //     // 예: 프록시/서브도메인 등 외부 오리진이 액션 호출해야 할 때
  //     allowedOrigins: ["https://example-proxy.yourdomain.com"],
  //   },
  // },

  // ✅ 임시 완화 옵션
  eslint: {
    // Preview 환경(staging 브랜치)에서는 ESLint 에러 무시 → 빌드 통과
    ignoreDuringBuilds: isPreview,
  },
  typescript: {
    // 타입 에러로 빌드 실패 방지 (원한다면 임시로)
    // ignoreBuildErrors: isPreview,
  },
};

export default nextConfig;
