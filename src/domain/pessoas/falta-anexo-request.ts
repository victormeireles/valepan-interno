const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const FALTA_ANEXO_MAX_BYTES = 4 * 1024 * 1024;

export type FaltaAnexoRequestOk = {
  faltaId: string;
  photo: Blob;
};

export type FaltaAnexoRequestError = {
  status: 400;
  error: string;
};

export type FaltaAnexoRequestResult =
  | FaltaAnexoRequestOk
  | FaltaAnexoRequestError;

export function validarFaltaAnexoRequest(input: {
  photo: FormDataEntryValue | null;
  faltaId: FormDataEntryValue | null;
}): FaltaAnexoRequestResult {
  if (!(input.photo instanceof Blob) || input.photo.size === 0) {
    return { status: 400, error: 'Envie uma foto.' };
  }
  if (!input.photo.type.startsWith('image/')) {
    return { status: 400, error: 'Arquivo deve ser uma imagem.' };
  }
  if (input.photo.size > FALTA_ANEXO_MAX_BYTES) {
    return { status: 400, error: 'Imagem deve ter no máximo 4MB.' };
  }
  const faltaId = typeof input.faltaId === 'string' ? input.faltaId.trim() : '';
  if (!UUID_REGEX.test(faltaId)) {
    return { status: 400, error: 'ID da falta inválido.' };
  }
  return { faltaId, photo: input.photo };
}
