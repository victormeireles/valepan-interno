import { auth } from '@/lib/auth';

export class SessionUsuarioIdResolver {
  async resolve(): Promise<string | null> {
    const session = await auth();
    const id = session?.user?.id?.trim();
    return id || null;
  }
}

export const sessionUsuarioIdResolver = new SessionUsuarioIdResolver();
