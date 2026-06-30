import { describe, expect, it } from 'vitest';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { buildPendenciaGrupoContexto } from './insumo-pendencia-grupo-contexto';

function makePendencia(
  partial: Partial<InsumoPendenciaComEmpresa> & { id: string },
): InsumoPendenciaComEmpresa {
  return {
    empresa_id: 'emp-1',
    omie_id_produto: 1,
    omie_webhook_evento_id: null,
    omie_n_id_receb: 1,
    omie_n_id_item: 1,
    omie_codigo_produto: '1',
    descricao_produto: 'Produto',
    quantidade_nf: 10,
    unidade_nf: 'KG',
    preco_unit_nf: 1,
    valor_total_item: 10,
    numero_nf: '0001',
    data_emissao_nf: '2026-05-13',
    status: 'pendente',
    integracao_insumo_id: null,
    resolvido_em: null,
    created_at: '2026-05-13',
    fornecedor_razao_social: null,
    fornecedor_nome: null,
    fornecedor_cnpj: null,
    natureza_operacao: null,
    valor_total_nf: null,
    cfop_entrada: null,
    ncm_produto: null,
    categoria_compra_codigo: null,
    categoria_compra_descricao: null,
    empresaNome: 'NOVA RESENDE - RJ',
    ...partial,
  };
}

describe('buildPendenciaGrupoContexto', () => {
  it('resume fornecedor único e fiscal uniforme', () => {
    const contexto = buildPendenciaGrupoContexto([
      makePendencia({
        id: 'a',
        fornecedor_nome: 'CORDEX',
        fornecedor_razao_social: 'CORDEX IND E COM LTDA',
        cfop_entrada: '1102',
        ncm_produto: '22071090',
      }),
      makePendencia({
        id: 'b',
        fornecedor_nome: 'CORDEX',
        fornecedor_razao_social: 'CORDEX IND E COM LTDA',
        cfop_entrada: '1102',
        ncm_produto: '22071090',
      }),
    ]);

    expect(contexto.fornecedoresDistintos).toBe(1);
    expect(contexto.fornecedorTitulo).toBe('CORDEX');
    expect(contexto.cfop).toBe('1102');
    expect(contexto.ncm).toBe('22071090');
  });

  it('conta fornecedores distintos', () => {
    const contexto = buildPendenciaGrupoContexto([
      makePendencia({ id: 'a', fornecedor_nome: 'Fornecedor A', fornecedor_cnpj: '111' }),
      makePendencia({ id: 'b', fornecedor_nome: 'Fornecedor B', fornecedor_cnpj: '222' }),
      makePendencia({ id: 'c', fornecedor_nome: 'Fornecedor C', fornecedor_cnpj: '333' }),
    ]);

    expect(contexto.fornecedoresDistintos).toBe(3);
    expect(contexto.fornecedorTitulo).toBe('3 fornecedores');
    expect(contexto.fornecedorSubtitulo).toContain('Fornecedor A');
  });

  it('resume categoria única e lista múltiplas categorias', () => {
    const unica = buildPendenciaGrupoContexto([
      makePendencia({
        id: 'a',
        categoria_compra_codigo: '2.01.01',
        categoria_compra_descricao: 'Compras de Mercadorias para Revenda',
      }),
    ]);

    expect(unica.categoriaTitulo).toBe('Compras de Mercadorias para Revenda');
    expect(unica.categoriasDistintas).toBe(1);

    const multiplas = buildPendenciaGrupoContexto([
      makePendencia({
        id: 'a',
        categoria_compra_codigo: '2.01.01',
        categoria_compra_descricao: 'Compras de Mercadorias para Revenda',
      }),
      makePendencia({
        id: 'b',
        categoria_compra_codigo: '2.02.01',
        categoria_compra_descricao: 'Compras de Materia Prima',
      }),
      makePendencia({
        id: 'c',
        categoria_compra_codigo: '2.03.01',
        categoria_compra_descricao: 'Material de Escritório',
      }),
    ]);

    expect(multiplas.categoriasDistintas).toBe(3);
    expect(multiplas.categoriaTitulo).toBe('3 categorias');
    expect(multiplas.categoriaSubtitulo).toContain('Compras de Mercadorias para Revenda');
    expect(multiplas.categoriaSubtitulo).toContain('+1');
  });
});
