import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDEM_ETAPA_STATUS } from '@/domain/producao-etapa/ordem-etapa-status-defaults';
import {
  buildEtapaCascataDisplay,
  converterLtParaCaixasEmbalagem,
} from '@/domain/producao-etapa/etapa-cascata-display';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

function ordemBase(partial: Partial<OrdemProducaoRecord> = {}): OrdemProducaoRecord {
  return {
    id: 'op-1',
    createdAt: '',
    updatedAt: '',
    dataProducao: '2026-06-23',
    dataFabricacaoEtiqueta: '2026-06-23',
    tipoEstoqueId: 't1',
    produtoId: 'p1',
    observacao: '',
    assadeiraId: 'a1',
    assadeiras: 260,
    ordemPlanejamento: 1,
    quantidade: { caixas: 130, pacotes: 0, unidades: 0, kg: 0 },
    ...DEFAULT_ORDEM_ETAPA_STATUS,
    ...partial,
  };
}

describe('buildEtapaCascataDisplay', () => {
  it('forno mantém meta da OP enquanto fermentação não confirmou meta', () => {
    const cascata = buildEtapaCascataDisplay({
      ordem: ordemBase(),
      fermentacaoProduzidoLt: 40,
    });

    expect(cascata.forno.meta).toBe(260);
    expect(cascata.forno.produzido).toBe(0);
    expect(cascata.fermentacao.produzido).toBe(40);
  });

  it('forno com fermentação finalizada em 260 e forno 253 ao vivo', () => {
    const cascata = buildEtapaCascataDisplay({
      ordem: ordemBase({
        fermentacaoFinalizada: true,
        fermentacaoMetaConfirmada: 260,
      }),
      fermentacaoProduzidoLt: 260,
      fornoProduzidoLt: 253,
    });

    expect(cascata.fermentacao).toEqual({
      produzido: 260,
      meta: 260,
      finalizada: true,
    });
    expect(cascata.forno).toEqual({
      produzido: 253,
      meta: 260,
      finalizada: false,
    });
  });

  it('fermentação ao vivo sem finalizar', () => {
    const cascata = buildEtapaCascataDisplay({
      ordem: ordemBase(),
      fermentacaoProduzidoLt: 180,
    });

    expect(cascata.fermentacao.produzido).toBe(180);
    expect(cascata.fermentacao.finalizada).toBe(false);
  });
});

describe('converterLtParaCaixasEmbalagem', () => {
  it('260 LT com 2 LT por caixa → 130 CX', () => {
    expect(
      converterLtParaCaixasEmbalagem(260, {
        unidadesPorAssadeira: 1,
        boxUnits: 2,
      }),
    ).toBe(130);
  });

  it('253 LT → 126 CX', () => {
    expect(
      converterLtParaCaixasEmbalagem(253, {
        unidadesPorAssadeira: 1,
        boxUnits: 2,
      }),
    ).toBe(126);
  });
});
