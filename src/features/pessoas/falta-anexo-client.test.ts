import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteFaltaAnexo,
  fetchFaltaAnexoUrl,
  postFaltaAnexo,
} from './falta-anexo-client';

const file = new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' });
const FALTA_ID = '11111111-1111-4111-8111-111111111111';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchResponse(init: {
  ok: boolean;
  status: number;
  type?: ResponseType;
  contentType?: string | null;
  body?: unknown;
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok,
    status: init.status,
    type: init.type ?? 'basic',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? (init.contentType ?? null) : null,
    },
    json: async () => init.body ?? {},
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('postFaltaAnexo', () => {
  it('não trata HTML 200 (login) como sucesso', async () => {
    mockFetchResponse({ ok: true, status: 200, contentType: 'text/html' });
    expect(await postFaltaAnexo(FALTA_ID, file)).toBe(false);
  });

  it('não trata opaqueredirect como sucesso', async () => {
    mockFetchResponse({
      ok: true,
      status: 0,
      type: 'opaqueredirect',
      contentType: null,
    });
    expect(await postFaltaAnexo(FALTA_ID, file)).toBe(false);
  });

  it('aceita JSON 200 e envia photo + faltaId', async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      status: 200,
      contentType: 'application/json',
    });
    expect(await postFaltaAnexo(FALTA_ID, file)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pessoas/faltas/anexo',
      expect.objectContaining({ method: 'POST', redirect: 'manual' }),
    );
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('faltaId')).toBe(FALTA_ID);
    expect(form.get('photo')).toBeInstanceOf(File);
  });

  it('retorna false quando a rede falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await postFaltaAnexo(FALTA_ID, file)).toBe(false);
  });
});

describe('deleteFaltaAnexo', () => {
  it('envia DELETE com faltaId em JSON', async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      status: 200,
      contentType: 'application/json',
    });
    expect(await deleteFaltaAnexo(FALTA_ID)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pessoas/faltas/anexo',
      expect.objectContaining({
        method: 'DELETE',
        redirect: 'manual',
        body: JSON.stringify({ faltaId: FALTA_ID }),
      }),
    );
  });

  it('não trata HTML 200 como sucesso', async () => {
    mockFetchResponse({ ok: true, status: 200, contentType: 'text/html' });
    expect(await deleteFaltaAnexo(FALTA_ID)).toBe(false);
  });

  it('retorna false em erro 500', async () => {
    mockFetchResponse({
      ok: false,
      status: 500,
      contentType: 'application/json',
    });
    expect(await deleteFaltaAnexo(FALTA_ID)).toBe(false);
  });
});

describe('fetchFaltaAnexoUrl', () => {
  it('retorna signedUrl quando JSON ok', async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      status: 200,
      contentType: 'application/json',
      body: { signedUrl: 'https://x/y.jpg' },
    });
    expect(await fetchFaltaAnexoUrl(FALTA_ID)).toBe('https://x/y.jpg');
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/pessoas/faltas/anexo/url?faltaId=${FALTA_ID}`,
    );
  });

  it('retorna null em 404', async () => {
    mockFetchResponse({
      ok: false,
      status: 404,
      contentType: 'application/json',
    });
    expect(await fetchFaltaAnexoUrl(FALTA_ID)).toBeNull();
  });

  it('retorna null para HTML 200', async () => {
    mockFetchResponse({ ok: true, status: 200, contentType: 'text/html' });
    expect(await fetchFaltaAnexoUrl(FALTA_ID)).toBeNull();
  });

  it('retorna null quando signedUrl ausente', async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      contentType: 'application/json',
      body: {},
    });
    expect(await fetchFaltaAnexoUrl(FALTA_ID)).toBeNull();
  });
});
