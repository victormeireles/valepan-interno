import { afterEach, describe, expect, it, vi } from 'vitest';
import { postReclamacaoFoto } from './reclamacao-foto-client';

const file = new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' });

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchResponse(init: {
  ok: boolean;
  status: number;
  type?: ResponseType;
  contentType?: string | null;
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok,
    status: init.status,
    type: init.type ?? 'basic',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? (init.contentType ?? null) : null,
    },
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('postReclamacaoFoto', () => {
  it('não trata HTML 200 (login) como sucesso', async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      contentType: 'text/html; charset=utf-8',
    });
    expect(await postReclamacaoFoto('r1', file)).toBe(false);
  });

  it('não trata opaqueredirect como sucesso', async () => {
    mockFetchResponse({
      ok: true,
      status: 0,
      type: 'opaqueredirect',
      contentType: null,
    });
    expect(await postReclamacaoFoto('r1', file)).toBe(false);
  });

  it('aceita JSON 200 como sucesso', async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      status: 200,
      contentType: 'application/json',
    });
    expect(await postReclamacaoFoto('r1', file)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reclamacoes/foto',
      expect.objectContaining({ method: 'POST', redirect: 'manual' }),
    );
  });
});
