import { NextResponse } from 'next/server';

/**
 * Rota de health check para debug na Vercel.
 * Use: GET https://valepan-interno.vercel.app/api/health
 * - Se responder 200, o deployment está vivo (problema pode ser rota específica ou front).
 * - Se der timeout, o problema é cold start ou rede.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleCreds: Boolean(
        process.env.GOOGLE_SA_CLIENT_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY
      ),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  });
}
