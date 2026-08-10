import type { NextAuthConfig } from 'next-auth';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import type { DatabaseComAuthz } from '@/types/database-authz';
import { AuthSignInGate } from './auth-sign-in-gate';
import { InternoAccessManager } from './interno-access-manager';
import { JwtAuthzEnricher } from './jwt-authz-enricher';
import { createMagicLinkProvider } from './magic-link-provider';
import { createQrProvider } from './qr-provider';
import { UsuarioAuthzLoader } from './usuario-authz-loader';
import { createWhatsAppProvider } from './whatsapp-provider';

const signInGate = new AuthSignInGate();
const jwtEnricher = new JwtAuthzEnricher();
const accessManager = new InternoAccessManager();

function serviceClient() {
  return createServiceRoleClient() as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
}

export const authConfig: NextAuthConfig = {
  providers: [
    createMagicLinkProvider(),
    createWhatsAppProvider(),
    createQrProvider(),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/login/verify',
  },
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30,
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email && !user.id) return false;

      try {
        const supabase = serviceClient();
        let row: {
          id: string;
          email: string | null;
          nome: string;
          ativo: boolean;
        } | null = null;

        if (user.email) {
          const { data, error } = await supabase
            .from('usuarios')
            .select('id, email, nome, ativo')
            .eq('email', user.email)
            .maybeSingle();
          if (error) throw error;
          row = data;
        } else if (user.id) {
          const { data, error } = await supabase
            .from('usuarios')
            .select('id, email, nome, ativo')
            .eq('id', user.id)
            .maybeSingle();
          if (error) throw error;
          row = data;
        }

        const gateResult = signInGate.decide(row);
        if (gateResult !== true) return gateResult;
        if (!row) return '/login?error=UserNotFound';

        const snap = await new UsuarioAuthzLoader(supabase).load(row.id);
        if (!snap || !accessManager.podeAcessarApp(snap)) {
          return '/login?error=SemPermissao';
        }

        return true;
      } catch (error) {
        console.error('[AUTH] signIn callback:', error);
        return '/login?error=DatabaseError';
      }
    },

    async jwt({ token, user }) {
      if (user) {
        try {
          await jwtEnricher.enrich(token, user, serviceClient());
        } catch (error) {
          console.error('[AUTH] jwt callback:', error);
          token.sub = user.id;
          token.isSystemOwner = false;
          token.modulosEfetivos = {};
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.name = token.name ?? session.user.name;
        session.user.isSystemOwner = Boolean(token.isSystemOwner);
        session.user.modulosEfetivos = token.modulosEfetivos ?? {};
      }
      return session;
    },
  },
};
