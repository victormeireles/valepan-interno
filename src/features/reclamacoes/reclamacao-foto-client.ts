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
  });
  return response.ok;
}
