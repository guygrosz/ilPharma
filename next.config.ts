import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // Rewrites to Azure Functions in development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:7071/api/:path*',
        },
      ];
    }
    return [];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.openstreetmap.org' },
    ],
  },
};

export default nextConfig;
