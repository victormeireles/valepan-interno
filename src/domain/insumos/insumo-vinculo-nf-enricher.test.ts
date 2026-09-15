import { describe, expect, it } from 'vitest';
import type { InsumoEntradaNfNumeroResumo } from '@/data/insumos/InsumoMovimentoNfConsultaRepository';
import { buildPendenciaGrupoContexto } from '@/domain/insumos/insumo-pendencia-grupo-contexto';
import { enrichVinculosComEntradasNf } from '@/domain/insumos/insumo-vinculo-nf-enricher';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

function buildVinculo(
  overrides: Partial<IntegracaoInsumoListItem> = {},
): IntegracaoInsumoListItem {
  return {
    id: 'vinc-1',
    empresa_id: 'emp-1',
    omie_id_produto: 59016,
    omie_codigo_produto: '59016',
    insumo_id: 'ins-1',
    fator_conversao: 1,
    descricao_omie: 'Álcool Etílico',
    ativo: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    empresaNome: 'Nova Resende',
    insumoNome: 'Etanol',
    insumoUnidadeCodigo: 'LT',
    insumoUnidadeNome: 'Litro',
    contexto: buildPendenciaGrupoContexto([]),
    valorUnitarioNf: null,
    unidadeNf: null,
    nfsDistintas: 1,
    pendenciaCount: 3,
    numerosNf: ['000056702'],
    ...overrides,
  };
}

function buildResumo(
  overrides: Partial<InsumoEntradaNfNumeroResumo> = {},
): InsumoEntradaNfNumeroResumo {
  return {
    empresaId: 'emp-1',
    insumoId: 'ins-1',
    numeroNf: '000059044',
    ...overrides,
  };
}

describe('enrichVinculosComEntradasNf', () => {
  it('une NFs lançadas do mesmo vínculo sem alterar pendências', () => {
    const [vinculo] = enrichVinculosComEntradasNf(
      [buildVinculo()],
      [
        buildResumo(),
        buildResumo({ insumoId: 'ins-2', numeroNf: '000060000' }),
      ],
    );

    expect(vinculo?.numerosNf).toEqual(['000056702', '000059044']);
    expect(vinculo?.nfsDistintas).toBe(2);
    expect(vinculo?.pendenciaCount).toBe(3);
  });
});
