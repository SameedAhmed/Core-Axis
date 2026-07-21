import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'github.com', 'res.cloudinary.com'],
  },
  // pdf-parse wraps pdf.js, which resolves to its browser build (not the Node
  // one) when webpack bundles it for the server — that build calls
  // Object.defineProperty on browser globals that don't exist server-side.
  // Keeping it external makes Next load it via native require instead.
  serverExternalPackages: ["pdf-parse"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Default is 1MB, too small for base64-encoded PDF/Excel/CV uploads sent
    // to Server Actions (finance analyst document upload, bulk CV upload).
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};


export default nextConfig;
