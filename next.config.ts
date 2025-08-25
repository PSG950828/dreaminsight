// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

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

  // 임시 완화 옵션(필요할 때만 켜고, 문제 해결 후 해제 권장)
  // eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
