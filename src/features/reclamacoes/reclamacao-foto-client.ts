export async function postReclamacaoFoto(
  reclamacaoId: string,
  file: File,
): Promise<boolean> {
  const form = new FormData();
  form.append('photo', file);
  form.append('reclamacaoId', reclamacaoId);
  const response = await fetch('/api/reclamacoes/foto', {
    method: 'POST',
    body: form,
    redirect: 'manual',
  });
  return isReclamacaoFotoResponseOk(response);
}

function isReclamacaoFotoResponseOk(response: Response): boolean {
  if (response.type === 'opaqueredirect') return false;
  const contentType = response.headers.get('content-type') ?? '';
  return response.ok && contentType.includes('application/json');
}
