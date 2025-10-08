import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable Next.js automatic ESLint during builds
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: [
    'https://active-upward-sunbeam.ngrok-free.app'
  ],
};

export default nextConfig;
