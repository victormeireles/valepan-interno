const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const RECLAMACAO_FOTO_MAX_BYTES = 4 * 1024 * 1024;

export type ReclamacaoFotoRequestOk = {
  reclamacaoId: string;
  photo: Blob;
};

export type ReclamacaoFotoRequestError = {
  status: 400;
  error: string;
};

export type ReclamacaoFotoRequestResult =
  | ReclamacaoFotoRequestOk
  | ReclamacaoFotoRequestError;

export function validarReclamacaoFotoRequest(input: {
  photo: FormDataEntryValue | null;
  reclamacaoId: FormDataEntryValue | null;
}): ReclamacaoFotoRequestResult {
  if (!(input.photo instanceof Blob) || input.photo.size === 0) {
    return { status: 400, error: 'Envie uma foto.' };
  }
  if (!input.photo.type.startsWith('image/')) {
    return { status: 400, error: 'Arquivo deve ser uma imagem.' };
  }
  if (input.photo.size > RECLAMACAO_FOTO_MAX_BYTES) {
    return { status: 400, error: 'Imagem deve ter no máximo 4MB.' };
  }
  const reclamacaoId =
    typeof input.reclamacaoId === 'string' ? input.reclamacaoId.trim() : '';
  if (!UUID_REGEX.test(reclamacaoId)) {
    return { status: 400, error: 'ID da reclamação inválido.' };
  }
  return { reclamacaoId, photo: input.photo };
}
