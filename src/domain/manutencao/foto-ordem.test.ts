import { describe, expect, it } from 'vitest';
import { FotoOrdem } from './foto-ordem';

const ID = '1AbCdEfGhIjKlMnOpQrStUv';

describe('FotoOrdem', () => {
  const fotos = new FotoOrdem();

  it('aceita ausência de foto', () => {
    expect(fotos.validar(null)).toEqual({ ok: true, foto: null });
  });

  it('aceita o link do Drive e remove espaços', () => {
    const resultado = fotos.validar({
      url: `  https://drive.google.com/file/d/${ID}/view  `,
      id: ` ${ID} `,
    });
    expect(resultado).toEqual({
      ok: true,
      foto: { url: `https://drive.google.com/file/d/${ID}/view`, id: ID },
    });
  });

  it('recusa url que não aponta para o arquivo', () => {
    expect(fotos.validar({ url: 'https://example.com/foto.jpg', id: ID }).ok).toBe(false);
  });

  it('recusa par incompleto', () => {
    expect(fotos.validar({ url: '', id: ID }).ok).toBe(false);
  });
});
