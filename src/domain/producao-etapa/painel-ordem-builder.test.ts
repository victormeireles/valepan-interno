import { describe, expect, it } from 'vitest';
import { buildPainelOrdem } from './painel-ordem-builder';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import { DEFAULT_ORDEM_ETAPA_STATUS } from './ordem-etapa-status-defaults';

const ordem: OrdemProducaoRecord = {
  id: 'ordem-1',
  dataProducao: '2026-06-17',
  dataFabricacaoEtiqueta: '2026-06-17',
  tipoEstoqueId: 'tipo-1',
  produtoId: 'prod-1',
  observacao: '',
  assadeiraId: 'ass-1',
  assadeiras: 10,
  ordemPlanejamento: 1,
  quantidade: { caixas: 0, pacotes: 0, unidades: 240, kg: 0 },
  createdAt: '',
  updatedAt: '',
  ...DEFAULT_ORDEM_ETAPA_STATUS,
};

const lotes: FermentacaoLoteRecord[] = [
  {
    id: 'l1',
    createdAt: '',
    modo: 'parcial',
    ordemProducaoId: 'ordem-1',
    assadeiras: 3,
    unidades: 0,
    produzidoEm: '2026-06-17T10:00:00Z',
  },
  {
    id: 'l2',
    createdAt: '',
    modo: 'parcial',
    ordemProducaoId: 'ordem-1',
    assadeiras: 2,
    unidades: 0,
    produzidoEm: '2026-06-17T11:00:00Z',
  },
];

describe('buildPainelOrdem', () => {
  it('agrega produzido e monta lotes do painel', () => {
    const item = buildPainelOrdem({
      etapa: 'fermentacao',
      ordem,
      lotes,
      produto: 'Brioche',
      tipoEstoque: 'Valepan',
      assadeiraNome: '24',
    });
    expect(item.ordemProducaoId).toBe('ordem-1');
    expect(item.aProduzir).toBe(10);
    expect(item.metaPlanejada).toBe(10);
    expect(item.metaEfetiva).toBe(10);
    expect(item.metaReferencia).toBe(10);
    expect(item.finalizada).toBe(false);
    expect(item.produzido).toBe(5);
    expect(item.lotes).toHaveLength(2);
    expect(item.unidade).toBe('lt');
    expect(item.modoQuantidade).toBe('assadeiras');
    expect(item.lotes[0]).toMatchObject({
      loteId: 'l1',
      modo: 'parcial',
      assadeiras: 3,
      unidades: 0,
      produzidoEm: '2026-06-17T10:00:00Z',
    });
  });

  it('usa meta efetiva da cascata quando fermentação confirmou meta menor', () => {
    const ordemForno: OrdemProducaoRecord = {
      ...ordem,
      assadeiras: 700,
      fermentacaoMetaConfirmada: 680,
      fermentacaoFinalizada: true,
    };

    const item = buildPainelOrdem({
      etapa: 'forno',
      ordem: ordemForno,
      lotes: [],
      produto: 'Brioche',
      tipoEstoque: 'Valepan',
      assadeiraNome: '24',
    });

    expect(item.metaPlanejada).toBe(700);
    expect(item.metaEfetiva).toBe(680);
    expect(item.aProduzir).toBe(680);
    expect(item.estimativaAnterior).toBeNull();
  });

  it('forno mantém meta da OP enquanto fermentação não confirmou meta', () => {
    const item = buildPainelOrdem({
      etapa: 'forno',
      ordem: { ...ordem, assadeiras: 36 },
      lotes: [],
      produto: 'HB Gergelim 75g',
      tipoEstoque: 'Valepan',
      assadeiraNome: '75g',
      fermentacaoProduzido: 40,
    });

    expect(item.metaPlanejada).toBe(36);
    expect(item.metaEfetiva).toBe(36);
    expect(item.aProduzir).toBe(36);
    expect(item.estimativaAnterior).toBe(40);
  });

  it('usa unidades quando ordem não tem assadeira', () => {
    const ordemSemAssadeira: OrdemProducaoRecord = {
      ...ordem,
      id: 'ordem-2',
      assadeiraId: '',
      assadeiras: 0,
      quantidade: { caixas: 0, pacotes: 0, unidades: 240, kg: 0 },
    };
    const lotesUnidades: FermentacaoLoteRecord[] = [
      {
        id: 'l3',
        createdAt: '',
        modo: 'parcial',
        ordemProducaoId: 'ordem-2',
        assadeiras: 0,
        unidades: 80,
        produzidoEm: '2026-06-17T10:00:00Z',
      },
      {
        id: 'l4',
        createdAt: '',
        modo: 'parcial',
        ordemProducaoId: 'ordem-2',
        assadeiras: 0,
        unidades: 40,
        produzidoEm: '2026-06-17T11:00:00Z',
      },
    ];

    const item = buildPainelOrdem({
      etapa: 'fermentacao',
      ordem: ordemSemAssadeira,
      lotes: lotesUnidades,
      produto: 'Brioche',
      tipoEstoque: 'Valepan',
    });

    expect(item.modoQuantidade).toBe('unidades');
    expect(item.unidade).toBe('un');
    expect(item.aProduzir).toBe(240);
    expect(item.metaPlanejada).toBe(240);
    expect(item.produzido).toBe(120);
    expect(item.assadeiraNome).toBeUndefined();
  });
});
