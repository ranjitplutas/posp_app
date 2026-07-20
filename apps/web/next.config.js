/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@posp-admin/contracts"],
  // Single-container deployment: the Fastify API runs as a sibling process on
  // INTERNAL_API_URL (default http://127.0.0.1:4000, not exposed to the host).
  // Next.js proxies API calls to it so the browser only ever talks to one
  // origin/port — no CORS, no second reverse-proxy route to configure.
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || "http://127.0.0.1:4000";
    return [
      { source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` },
      { source: "/health/:path*", destination: `${apiUrl}/health/:path*` },
    ];
  },
  webpack: (webpackConfig) => {
    // @posp-admin/contracts is written for apps/api's NodeNext resolution, which
    // requires explicit ".js" extensions on relative imports even though the
    // files are .ts. Webpack doesn't do that TS-specific extension mapping by
    // default — this alias teaches it to also look for .ts/.tsx behind a ".js" specifier.
    webpackConfig.resolve.extensionAlias = {
      ...webpackConfig.resolve.extensionAlias,
      ".js": [".js", ".ts", ".tsx"],
    };
    return webpackConfig;
  },
};

module.exports = nextConfig;
