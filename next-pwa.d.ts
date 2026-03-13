declare module 'next-pwa' {
  import type { NextConfig } from 'next';
  interface PWAOptions {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp | string;
      handler: string;
      options?: {
        cacheName?: string;
        expiration?: { maxEntries?: number; maxAgeSeconds?: number };
      };
    }>;
  }
  function withPWA(options: PWAOptions): (config: NextConfig) => NextConfig;
  export default withPWA;
}
