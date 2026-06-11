import { describe, expect, it } from 'vitest';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import {
  findPrimeiroLoteCriadoDoDia,
  findPrimeiroLoteProduzidoDoDia,
} from './etiqueta-primeiro-lote';

const lote = (
  produzidoEm: string,
  createdAt: string,
): EmbalagemLoteRecord => ({
  id: `lote-${createdAt}`,
  createdAt,
  modo: 'parcial',
  pedidoEmbalagemId: 'ped-1',
  dataPedido: '2026-06-11',
  dataFabricacao: '2026-06-11',
  tipoEstoqueId: 'tipo-1',
  produtoId: 'prod-1',
  congelado: 'Não',
  quantidade: { caixas: 1, pacotes: 0, unidades: 0, kg: 0 },
  produzidoEm,
});

describe('etiqueta-primeiro-lote', () => {
  it('ignora lotes de outro dia', () => {
    const lotes = [lote('2026-06-10T10:00:00Z', '2026-06-10T10:00:00Z')];
    expect(findPrimeiroLoteCriadoDoDia(lotes, '2026-06-11')).toBeUndefined();
  });

  it('retorna o lote criado mais cedo no dia', () => {
    const lotes = [
      lote('2026-06-11T12:00:00Z', '2026-06-11T12:30:00Z'),
      lote('2026-06-11T10:00:00Z', '2026-06-11T10:15:00Z'),
    ];
    expect(findPrimeiroLoteCriadoDoDia(lotes, '2026-06-11')?.createdAt).toBe(
      '2026-06-11T10:15:00Z',
    );
  });

  it('retorna o lote produzido mais cedo no dia', () => {
    const lotes = [
      lote('2026-06-11T12:00:00Z', '2026-06-11T10:00:00Z'),
      lote('2026-06-11T09:00:00Z', '2026-06-11T11:00:00Z'),
    ];
    expect(findPrimeiroLoteProduzidoDoDia(lotes, '2026-06-11')?.produzidoEm).toBe(
      '2026-06-11T09:00:00Z',
    );
  });
});
