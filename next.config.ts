import type { NextConfig } from 'next';

/**
 * The whole simulator runs in the browser, so it ships as a static export —
 * `npm run build` produces `out/`, which any static host (GitHub Pages, S3, an
 * internal nginx) can serve with no Node runtime.
 *
 * `NEXT_PUBLIC_BASE_PATH` covers project sites served from a subdirectory,
 * such as `https://<org>.github.io/<repo>/`. Leave it unset to deploy at root.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  // Static hosts resolve `/path/` to `/path/index.html`.
  trailingSlash: true,
};

export default nextConfig;
