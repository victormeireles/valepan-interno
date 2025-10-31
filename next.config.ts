import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'canvas', 'jsbarcode'],
  experimental: {
    // Aumentar limite de body para permitir upload de fotos até 10MB
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
