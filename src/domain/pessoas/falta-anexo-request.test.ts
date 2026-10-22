import { describe, expect, it } from 'vitest';
import { validarFaltaAnexoRequest } from './falta-anexo-request';

const UUID = '11111111-1111-1111-1111-111111111111';

function photo(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'foto.jpg', { type });
}

describe('validarFaltaAnexoRequest', () => {
  it('exige foto e faltaId uuid', () => {
    const ok = validarFaltaAnexoRequest({
      photo: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      faltaId: UUID,
    });
    expect('error' in ok).toBe(false);
  });

  it('rejeita sem foto', () => {
    const r = validarFaltaAnexoRequest({ photo: null, faltaId: UUID });
    expect(r).toEqual({ status: 400, error: 'Envie uma foto.' });
  });

  it('recusa tipo inválido, tamanho e uuid', () => {
    expect(
      validarFaltaAnexoRequest({
        photo: photo('application/pdf', 12),
        faltaId: UUID,
      }),
    ).toEqual({ status: 400, error: 'Arquivo deve ser uma imagem.' });

    expect(
      validarFaltaAnexoRequest({
        photo: photo('image/png', 4 * 1024 * 1024 + 1),
        faltaId: UUID,
      }),
    ).toEqual({ status: 400, error: 'Imagem deve ter no máximo 4MB.' });

    expect(
      validarFaltaAnexoRequest({
        photo: photo('image/jpeg', 12),
        faltaId: 'nao-uuid',
      }),
    ).toEqual({ status: 400, error: 'ID da falta inválido.' });
  });
});
