const isProd = process.env.NODE_ENV === 'production';

const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com";

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "manifest-src 'self'",
      "worker-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const publicCache = {
  key: 'Cache-Control',
  value: 'public, s-maxage=300, stale-while-revalidate=600',
};

const privateNoStore = {
  key: 'Cache-Control',
  value: 'private, no-store',
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.coingecko.com',
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/api/quotes',
        headers: [publicCache],
      },
      {
        source: '/api/search',
        headers: [publicCache],
      },
      {
        source: '/api/analysis',
        headers: [publicCache],
      },
      {
        source: '/api/analysis/:path*',
        headers: [publicCache],
      },
      {
        source: '/api/holdings',
        headers: [privateNoStore],
      },
      {
        source: '/api/holdings/:path*',
        headers: [privateNoStore],
      },
      {
        source: '/api/health',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/api/test_json',
        headers: [privateNoStore],
      },
    ];
  },
};

module.exports = nextConfig;
