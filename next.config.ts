import type { NextConfig } from "next";

/**
 * A static export for GitHub Pages. A project site is served from a sub-path —
 * `https://<owner>.github.io/retailer-scanner-test/` — which the Pages workflow passes in as
 * `PAGES_BASE_PATH`; locally it is empty.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // Links and scripts get the base path from Next; a URL to a file in public/ has to add it itself.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
