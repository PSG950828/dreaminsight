// next.config.ts
import type { NextConfig } from "next";

// Extend NextConfig typing to include Turbopack root option (not in official types yet)
type NextConfigWithTurbopack = NextConfig & { turbopack?: { root?: string } };

const nextConfig: NextConfigWithTurbopack = {
  // 빌드 시 ESLint 에러 무시 (임시 완화)
  eslint: { ignoreDuringBuilds: true },

  // Turbopack workspace root (silences multi-lockfile warning)
  turbopack: { root: __dirname },

  // 타입 에러도 임시 무시가 필요하면 아래 주석 해제
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
