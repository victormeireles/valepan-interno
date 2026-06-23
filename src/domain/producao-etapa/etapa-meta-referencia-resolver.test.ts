import { describe, expect, it } from 'vitest';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { DEFAULT_ORDEM_ETAPA_STATUS } from './ordem-etapa-status-defaults';
import {
  resolveMetaEfetiva,
  resolveMetaPlanejada,
  resolveMetaReferencia,
  type AssadeiraMetaContext,
} from './etapa-meta-referencia-resolver';
import { resolveEstimativaAnterior } from './etapa-estimativa-anterior-resolver';

const ASSADEIRA_CTX: AssadeiraMetaContext = {
  unidadesPorAssadeira: 1,
  boxUnits: 2,
};

function makeOrdem(
  overrides: Partial<OrdemProducaoRecord> = {},
): OrdemProducaoRecord {
  return {
    id: 'ordem-1',
    createdAt: '2026-06-17T08:00:00Z',
    updatedAt: '2026-06-17T08:00:00Z',
    dataProducao: '2026-06-17',
    dataFabricacaoEtiqueta: '2026-06-18',
    tipoEstoqueId: 'tipo-1',
    produtoId: 'prod-1',
    observacao: '',
    assadeiraId: 'ass-1',
    assadeiras: 700,
    ordemPlanejamento: 1,
    quantidade: { caixas: 350, pacotes: 0, unidades: 700, kg: 0 },
    ...DEFAULT_ORDEM_ETAPA_STATUS,
    ...overrides,
  };
}

describe('resolveMetaReferencia', () => {
  it('fermentação usa assadeiras da OP', () => {
    const ordem = makeOrdem();
    expect(resolveMetaReferencia('fermentacao', ordem)).toBe(700);
  });

  it('forno usa OP quando fermentação não confirmou meta', () => {
    const ordem = makeOrdem();
    expect(resolveMetaReferencia('forno', ordem)).toBe(700);
  });

  it('forno usa fermentacaoMetaConfirmada quando existir', () => {
    const ordem = makeOrdem({ fermentacaoMetaConfirmada: 680 });
    expect(resolveMetaReferencia('forno', ordem)).toBe(680);
  });

  it('embalagem usa caixas da OP sem meta de forno', () => {
    const ordem = makeOrdem();
    expect(resolveMetaReferencia('embalagem', ordem, ASSADEIRA_CTX)).toBe(350);
  });

  it('embalagem converte fornoMetaConfirmada LT → CX', () => {
    const ordem = makeOrdem({ fornoMetaConfirmada: 650 });
    expect(resolveMetaReferencia('embalagem', ordem, ASSADEIRA_CTX)).toBe(325);
  });
});

describe('resolveMetaPlanejada', () => {
  it('sempre retorna valores da OP por etapa', () => {
    const ordem = makeOrdem({
      fermentacaoMetaConfirmada: 680,
      fornoMetaConfirmada: 650,
    });

    expect(resolveMetaPlanejada('fermentacao', ordem)).toBe(700);
    expect(resolveMetaPlanejada('forno', ordem)).toBe(700);
    expect(resolveMetaPlanejada('embalagem', ordem)).toBe(350);
  });

  it('usa unidades quando ordem não tem assadeira', () => {
    const ordem = makeOrdem({
      assadeiraId: '',
      assadeiras: 0,
      quantidade: { caixas: 0, pacotes: 0, unidades: 240, kg: 0 },
    });

    expect(resolveMetaPlanejada('fermentacao', ordem)).toBe(240);
    expect(resolveMetaPlanejada('forno', ordem)).toBe(240);
    expect(resolveMetaPlanejada('embalagem', ordem)).toBe(240);
  });
});

describe('resolveMetaEfetiva', () => {
  it('espelha cascata da meta de referência', () => {
    const ordem = makeOrdem({
      fermentacaoMetaConfirmada: 680,
      fornoMetaConfirmada: 650,
    });

    expect(resolveMetaEfetiva('fermentacao', ordem)).toBe(700);
    expect(resolveMetaEfetiva('forno', ordem)).toBe(680);
    expect(resolveMetaEfetiva('embalagem', ordem, ASSADEIRA_CTX)).toBe(325);
  });
});

describe('resolveEstimativaAnterior', () => {
  it('forno retorna produzido de fermentação se etapa anterior aberta', () => {
    expect(
      resolveEstimativaAnterior({
        etapa: 'forno',
        fermentacaoProduzido: 680,
        fermentacaoFinalizada: false,
      }),
    ).toBe(680);
  });

  it('forno retorna null se fermentação finalizada', () => {
    expect(
      resolveEstimativaAnterior({
        etapa: 'forno',
        fermentacaoProduzido: 680,
        fermentacaoFinalizada: true,
      }),
    ).toBeNull();
  });

  it('embalagem retorna produzido de forno se etapa anterior aberta', () => {
    expect(
      resolveEstimativaAnterior({
        etapa: 'embalagem',
        fornoProduzido: 640,
        fornoFinalizada: false,
      }),
    ).toBe(640);
  });

  it('fermentação retorna null', () => {
    expect(resolveEstimativaAnterior({ etapa: 'fermentacao' })).toBeNull();
  });
});
