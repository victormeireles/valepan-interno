const ANEXO_ENDPOINT = '/api/pessoas/faltas/anexo';

function isJsonResponseOk(response: Response): boolean {
  if (response.type === 'opaqueredirect') return false;
  const contentType = response.headers.get('content-type') ?? '';
  return response.ok && contentType.includes('application/json');
}

export async function postFaltaAnexo(
  faltaId: string,
  file: File,
): Promise<boolean> {
  try {
    const form = new FormData();
    form.append('photo', file);
    form.append('faltaId', faltaId);
    const response = await fetch(ANEXO_ENDPOINT, {
      method: 'POST',
      body: form,
      redirect: 'manual',
    });
    return isJsonResponseOk(response);
  } catch {
    return false;
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
    const body = (await response.json()) as { signedUrl?: unknown };
    return typeof body.signedUrl === 'string' && body.signedUrl.length > 0
      ? body.signedUrl
      : null;
  } catch {
    return null;
  }
}
