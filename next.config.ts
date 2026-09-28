import type { NextConfig } from "next";

/**
 * A static export for GitHub Pages. A project site is served from a sub-path —
 * `https://<owner>.github.io/retailer-scanner-test/` — which the Pages workflow passes in as
 * `PAGES_BASE_PATH`; locally it is empty.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH ?? "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
