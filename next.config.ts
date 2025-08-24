import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ["http://172.30.1.62:3000"], // 네트워크 접속 허용 IP
  },
};

export default nextConfig;
