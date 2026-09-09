import { describe, expect, it, vi } from 'vitest';
import { UsuarioSessionStatusLoader } from './usuario-session-status-loader';

describe('UsuarioSessionStatusLoader', () => {
  it('marca e-mail vazio como status ok para o gate decidir', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json([
        { ativo: true, email: null, password_must_change: false },
      ]),
    );
    const loader = new UsuarioSessionStatusLoader({
      supabaseUrl: 'https://supabase.test',
      serviceRole: 'role',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(loader.load('user-1')).resolves.toEqual({
      kind: 'ok',
      ativo: true,
      email: null,
      passwordMustChange: false,
    });
  });

  it('fica unavailable se a consulta falhar', async () => {
    const loader = new UsuarioSessionStatusLoader({
      supabaseUrl: 'https://supabase.test',
      serviceRole: 'role',
      fetchImpl: vi.fn(async () => new Response(null, { status: 500 })) as never,
    });
    await expect(loader.load('user-1')).resolves.toEqual({
      kind: 'unavailable',
    });
  });
});
