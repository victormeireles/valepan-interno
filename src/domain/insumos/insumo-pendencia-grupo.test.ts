import { describe, expect, it } from 'vitest';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { groupPendenciasPorProduto } from './insumo-pendencia-grupo';

function makePendencia(
  partial: Partial<InsumoPendenciaComEmpresa> & { id: string; omie_id_produto: number },
): InsumoPendenciaComEmpresa {
  return {
    empresa_id: 'emp-1',
    omie_webhook_evento_id: null,
    omie_n_id_receb: 1,
    omie_n_id_item: 1,
    omie_codigo_produto: '59016',
    descricao_produto: 'Alcool Etilico',
    quantidade_nf: 100,
    unidade_nf: 'L',
    preco_unit_nf: 1,
    valor_total_item: 100,
    numero_nf: '0001',
    data_emissao_nf: '2026-06-18',
    status: 'pendente',
    integracao_insumo_id: null,
    resolvido_em: null,
    created_at: '2026-06-18',
    fornecedor_razao_social: null,
    fornecedor_nome: null,
    fornecedor_cnpj: null,
    natureza_operacao: null,
    cfop_entrada: null,
    ncm_produto: null,
    empresaNome: 'NOVA RESENDE - RJ',
    ...partial,
  };
}

describe('insumo-pendencia-grupo', () => {
  it('agrupa pendências pelo mesmo produto Omie', () => {
    const grupos = groupPendenciasPorProduto([
      makePendencia({ id: 'a', omie_id_produto: 59016, numero_nf: '000033204', quantidade_nf: 350 }),
      makePendencia({ id: 'b', omie_id_produto: 59016, numero_nf: '000032988', quantidade_nf: 400 }),
      makePendencia({ id: 'c', omie_id_produto: 59016, numero_nf: '000032925', quantidade_nf: 150 }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.pendenciaCount).toBe(3);
    expect(grupos[0]?.quantidadeNfTotal).toBe(900);
  });
});
