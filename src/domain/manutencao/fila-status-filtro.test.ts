import { describe, expect, it } from 'vitest';
import { FilaStatusFiltro } from './fila-status-filtro';

describe('FilaStatusFiltro', () => {
  const filtro = new FilaStatusFiltro();
  const itens = [
    { status: 'aberta' as const, numero: 1 },
    { status: 'recebida' as const, numero: 2 },
    { status: 'finalizada' as const, numero: 3 },
  ];

  it('padrao abertas inclui aberta e recebida', () => {
    expect(filtro.aplicar(itens, 'abertas').map((item) => item.numero)).toEqual([1, 2]);
  });

  it('finalizadas so mostra finalizada', () => {
    expect(filtro.aplicar(itens, 'finalizadas').map((item) => item.numero)).toEqual([3]);
  });

  it('conta cada grupo', () => {
    expect(filtro.contar(itens)).toEqual({ abertas: 2, finalizadas: 1 });
  });
});
