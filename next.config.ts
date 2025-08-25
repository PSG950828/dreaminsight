// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 시 ESLint 에러 무시 (임시 완화)
  eslint: { ignoreDuringBuilds: true },

  // 타입 에러도 임시 무시가 필요하면 아래 주석 해제
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
