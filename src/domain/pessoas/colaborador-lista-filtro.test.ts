import { describe, expect, it } from 'vitest';
import { ColaboradorListaFiltro } from './colaborador-lista-filtro';

describe('ColaboradorListaFiltro', () => {
  it('filtra por nome e codigo sem acento/caixa; termo vazio devolve tudo', () => {
    const itens = [
      {
        codigo: 'VP-9001',
        nome: 'Maria da Silva',
        situacao: 'ativo' as const,
        setorNome: 'Produção',
        turnoNome: 'Manhã',
      },
      {
        codigo: 'VP-9002',
        nome: 'João Souza',
        situacao: 'desligado' as const,
        setorNome: null,
        turnoNome: null,
      },
    ];
    const filtro = new ColaboradorListaFiltro();
    expect(filtro.aplicar(itens, 'maria').map((i) => i.codigo)).toEqual(['VP-9001']);
    expect(filtro.aplicar(itens, 'vp-9002').map((i) => i.codigo)).toEqual(['VP-9002']);
    expect(filtro.aplicar(itens, '').length).toBe(2);
  });
});
