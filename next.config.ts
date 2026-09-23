import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { authInterrupts: true },
  // Targeted E2E can run in dev mode without locking the user's QA server.
  distDir: process.env.CLANSYNC_E2E === "1" ? ".next-e2e" : ".next",
  // QA uses separate loopback hosts to keep operator/member cookies isolated.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
