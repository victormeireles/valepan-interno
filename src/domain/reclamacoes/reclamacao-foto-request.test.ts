import { describe, expect, it } from 'vitest';
import { validarReclamacaoFotoRequest } from './reclamacao-foto-request';

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function photo(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'foto.jpg', { type });
}

describe('validarReclamacaoFotoRequest', () => {
  it('aceita imagem até 4MB com uuid', () => {
    const result = validarReclamacaoFotoRequest({
      photo: photo('image/jpeg', 12),
      reclamacaoId: UUID,
    });
    expect(result).toMatchObject({ reclamacaoId: UUID });
    if ('photo' in result) {
      expect(result.photo.type).toBe('image/jpeg');
    }
  });

  it('recusa sem foto, tipo inválido, tamanho e uuid', () => {
    expect(
      validarReclamacaoFotoRequest({ photo: null, reclamacaoId: UUID }),
    ).toEqual({ status: 400, error: 'Envie uma foto.' });

    expect(
      validarReclamacaoFotoRequest({
        photo: photo('application/pdf', 12),
        reclamacaoId: UUID,
      }),
    ).toEqual({ status: 400, error: 'Arquivo deve ser uma imagem.' });

    expect(
      validarReclamacaoFotoRequest({
        photo: photo('image/png', 4 * 1024 * 1024 + 1),
        reclamacaoId: UUID,
      }),
    ).toEqual({ status: 400, error: 'Imagem deve ter no máximo 4MB.' });

    expect(
      validarReclamacaoFotoRequest({
        photo: photo('image/jpeg', 12),
        reclamacaoId: 'nao-uuid',
      }),
    ).toEqual({ status: 400, error: 'ID da reclamação inválido.' });
  });
});
