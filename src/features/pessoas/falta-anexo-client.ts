const ANEXO_ENDPOINT = '/api/pessoas/faltas/anexo';

function isJsonResponseOk(response: Response): boolean {
  if (response.type === 'opaqueredirect') return false;
  const contentType = response.headers.get('content-type') ?? '';
  return response.ok && contentType.includes('application/json');
}

export type PostFaltaAnexoResultado = {
  ok: boolean;
  signedUrl: string | null;
};

const POST_FALHOU: PostFaltaAnexoResultado = { ok: false, signedUrl: null };

function lerSignedUrl(body: { signedUrl?: unknown } | null): string | null {
  return typeof body?.signedUrl === 'string' && body.signedUrl.length > 0
    ? body.signedUrl
    : null;
}

export async function postFaltaAnexo(
  faltaId: string,
  file: File,
): Promise<PostFaltaAnexoResultado> {
  try {
    const form = new FormData();
    form.append('photo', file);
    form.append('faltaId', faltaId);
    const response = await fetch(ANEXO_ENDPOINT, {
      method: 'POST',
      body: form,
      redirect: 'manual',
    });
    if (!isJsonResponseOk(response)) return POST_FALHOU;
    const body = (await response.json().catch(() => null)) as {
      signedUrl?: unknown;
    } | null;
    return { ok: true, signedUrl: lerSignedUrl(body) };
  } catch {
    return POST_FALHOU;
  }
}

export async function deleteFaltaAnexo(faltaId: string): Promise<boolean> {
  try {
    const response = await fetch(ANEXO_ENDPOINT, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faltaId }),
      redirect: 'manual',
    });
    return isJsonResponseOk(response);
  } catch {
    return false;
  }
}

export async function fetchFaltaAnexoUrl(
  faltaId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${ANEXO_ENDPOINT}/url?faltaId=${encodeURIComponent(faltaId)}`,
      { redirect: 'manual' },
    );
    if (!isJsonResponseOk(response)) return null;
    return lerSignedUrl((await response.json()) as { signedUrl?: unknown });
  } catch {
    return null;
  }
}
