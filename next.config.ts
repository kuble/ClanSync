import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // QA uses separate loopback hosts to keep operator/member cookies isolated.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
