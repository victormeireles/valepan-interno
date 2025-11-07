import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'canvas', 'jsbarcode'],
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // Aumentar limite de body para permitir upload de fotos até 10MB
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
