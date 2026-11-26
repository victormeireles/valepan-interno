import { describe, expect, it } from 'vitest';
import type { SugestaoListaBruta, SugestaoListaFonte } from './sugestao-lista-leitura';
import { SugestaoListaLeitura } from './sugestao-lista-leitura';

const LINHA: SugestaoListaBruta = {
  id: '1', tema: 'seguranca', texto: 'melhorar o piso da área',
  fotoPath: 'a.jpg', criadoEm: '2026-11-24T13:08:00.000Z', nome: 'Ana',
};

describe('SugestaoListaLeitura', () => {
  it('formata, rotula e segue sem foto se a URL falhar', async () => {
    const fonte: SugestaoListaFonte = { async buscar() { return [LINHA]; } };
    const fotos = { async signedUrls() { throw new Error('storage'); } };
    const [item] = await new SugestaoListaLeitura(fonte, fotos).listar('seguranca');
    expect(item.quando).toBe('24/11/2026 10:08');
    expect(item.rotulo).toBe('Segurança');
    expect(item.fotoUrl).toBeNull();
    expect(item.nome).toBe('Ana');
  });

  it('trata tema desconhecido como todos', async () => {
    let recebido: string | null = 'x';
    const fonte: SugestaoListaFonte = {
      async buscar(tema) { recebido = tema; return []; },
    };
    await new SugestaoListaLeitura(fonte, { async signedUrls() { return new Map(); } }).listar('outro');
    expect(recebido).toBeNull();
  });
});
