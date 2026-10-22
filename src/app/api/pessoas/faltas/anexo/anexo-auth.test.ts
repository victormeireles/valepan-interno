import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}));

import { requirePessoasAnexoAuth } from './anexo-auth';

function sessaoCom(modulosEfetivos: Record<string, string>, isSystemOwner = false) {
  return { user: { id: 'user-1', isSystemOwner, modulosEfetivos } };
}

beforeEach(() => {
  authMock.mockReset();
});

describe('requirePessoasAnexoAuth', () => {
  it('retorna 401 sem sessão', async () => {
    authMock.mockResolvedValue(null);
    const resposta = await requirePessoasAnexoAuth('ler');
    expect(resposta?.status).toBe(401);
  });

  it('retorna 403 quando não tem acesso a nenhum módulo interno', async () => {
    authMock.mockResolvedValue(sessaoCom({}));
    const resposta = await requirePessoasAnexoAuth('ler');
    expect(resposta?.status).toBe(403);
  });

  it('retorna 403 sem o módulo interno_pessoas', async () => {
    authMock.mockResolvedValue(sessaoCom({ interno_reclamacoes: 'administrar' }));
    const resposta = await requirePessoasAnexoAuth('ler');
    expect(resposta?.status).toBe(403);
  });

  it('retorna 403 ao editar com nível apenas ler', async () => {
    authMock.mockResolvedValue(sessaoCom({ interno_pessoas: 'ler' }));
    const resposta = await requirePessoasAnexoAuth('editar');
    expect(resposta?.status).toBe(403);
  });

  it('libera ler com nível ler', async () => {
    authMock.mockResolvedValue(sessaoCom({ interno_pessoas: 'ler' }));
    expect(await requirePessoasAnexoAuth('ler')).toBeNull();
  });

  it('libera editar com nível editar', async () => {
    authMock.mockResolvedValue(sessaoCom({ interno_pessoas: 'editar' }));
    expect(await requirePessoasAnexoAuth('editar')).toBeNull();
  });

  it('libera dono do sistema', async () => {
    authMock.mockResolvedValue(sessaoCom({}, true));
    expect(await requirePessoasAnexoAuth('editar')).toBeNull();
  });
});
