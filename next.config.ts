import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'canvas', 'jsbarcode'],
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    '/api/etiqueta/gerar': ['./public/logo-full-light.svg', './public/fonts/etiquetas/*.ttf'],
  },
  experimental: {
    // Aumentar limite de body para permitir upload de fotos até 10MB
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/api/painel/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
