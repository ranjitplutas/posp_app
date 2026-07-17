/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@posp-admin/contracts"],
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
