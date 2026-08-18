import { describe, expect, it } from 'vitest';
import { FluxoFilasEmbPorOp } from './fluxo-filas-emb-por-op';
import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

const aloc = new FluxoFilasEmbPorOp();

function ev(
  partial: Partial<FluxoControleEventoInput> & Pick<FluxoControleEventoInput, 'unidades'>,
): FluxoControleEventoInput {
  return {
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    produzidoEm: '2026-08-18T10:00:00-03:00',
    dataOp: '2026-08-18',
    ...partial,
  };
}

describe('FluxoFilasEmbPorOp', () => {
  it('soma na OP do lote, não na primeira OP do plano', () => {
    const map = aloc.alocar([
      ev({ ordemProducaoId: 'op-4', unidades: 50, produtoNome: 'Brioche 75g' }),
      ev({ ordemProducaoId: 'op-5', unidades: 377, produtoNome: 'Brioche 65g' }),
    ]);
    expect(map.unPorOp.get('op-4')).toBe(50);
    expect(map.unPorOp.get('op-5')).toBe(377);
    expect(map.unPorOp.size).toBe(2);
    expect(map.produtoNomePorOp.get('op-4')).toBe('Brioche 75g');
    expect(map.assadeiraNomePorOp.get('op-4')).toBe('Bun');
  });

  it('lote sem ordemProducaoId vai para semOpPorProduto', () => {
    const map = aloc.alocar([
      ev({ unidades: 10, produtoNome: 'Padrão' }),
      ev({ unidades: 5, produtoNome: 'Padrão', produzidoEm: '2026-08-18T11:00:00-03:00' }),
    ]);
    expect(map.unPorOp.size).toBe(0);
    expect(map.semOpPorProduto.get('Padrão')?.volumeUn).toBe(15);
    expect(map.semOpPorProduto.get('Padrão')?.ultimoLoteEm).toBe(
      '2026-08-18T11:00:00-03:00',
    );
  });
});
