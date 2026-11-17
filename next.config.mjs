/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Lets the artifacts test suites build next to a production .next they may not be able to overwrite.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingIncludes: {
    '/api/admin/invoices/**': ['./assets/invoices/**/*'],
    '/artifacts-content/**': ['./node_modules/hls.js/dist/hls.light.min.js'],
  },
  // @react-pdf/renderer ships fontkit + yoga (wasm); keep it external so its
  // assets resolve from node_modules at runtime instead of being bundled.
  // aws4 and ioredis stay external so the image ships them for scripts/artifacts-encoder.mjs.
  serverExternalPackages: ['@react-pdf/renderer', 'aws4', 'ioredis'],
  experimental: {
    cpus: 1,
    // Requests on the artifacts origins pass through proxy.ts, which buffers bodies; upload parts are 16 MiB (nginx allows 41m).
    proxyClientMaxBodySize: '41mb',
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // SEO and performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        // The artifacts origins set their own framing and CSP: content must be framable by the artifacts app origin.
        missing: [{ type: 'host', value: 'artifacts(?:-content)?\\..*' }],
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            // Directives that cannot break scripts or styles: no framing, no plugins, no <base> or form hijacking.
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
      {
        // The owner's share page on the artifacts app origin (a Next page; everything else there sets its own headers).
        // Only the artifact's shell on the same origin may frame it, to show the dialog over the artifact.
        source: '/share/:path*',
        has: [{ type: 'host', value: 'artifacts\\..*' }],
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/tinymce/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:asset(pfp.jpg|CV.pdf|favicon.ico|favicon-16x16.png|favicon-32x32.png|favicon-48x48.png|favicon-256x256.png|apple-touch-icon.png|android-chrome-192x192.png|android-chrome-512x512.png|inakilozanodotcomlogo.png|il-logo-icon.png|uk.png|spain.png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'inakilozano.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 80, 85],
    minimumCacheTTL: 14400,
  },
}

export default nextConfig;
