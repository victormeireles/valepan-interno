import type { InternoModuloId, NivelModulo } from '@/lib/auth/interno-modulos-catalog';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      isSystemOwner: boolean;
      modulosEfetivos: Partial<Record<InternoModuloId, NivelModulo>>;
    };
  }

  interface User {
    isSystemOwner?: boolean;
    modulosEfetivos?: Partial<Record<InternoModuloId, NivelModulo>>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isSystemOwner?: boolean;
    modulosEfetivos?: Partial<Record<InternoModuloId, NivelModulo>>;
  }
}

export {};
