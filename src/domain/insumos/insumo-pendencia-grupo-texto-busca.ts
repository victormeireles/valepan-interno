import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import type { InsumoPendenciaGrupoContexto } from '@/domain/insumos/insumo-pendencia-grupo-contexto';

type GrupoTextoBuscaInput = {
  descricaoProduto: string | null;
  omieCodigoProduto: string | null;
  omieIdProduto: number;
  empresaNome: string;
  contexto: InsumoPendenciaGrupoContexto;
  pendencias: InsumoPendenciaComEmpresa[];
};

export function buildTextoBuscaPendenciaGrupo(input: GrupoTextoBuscaInput): string {
  return [
    input.descricaoProduto,
    input.omieCodigoProduto,
    String(input.omieIdProduto),
    input.empresaNome,
    input.contexto.fornecedorTitulo,
    input.contexto.fornecedorSubtitulo,
    input.contexto.categoriaTitulo,
    input.contexto.categoriaSubtitulo,
    input.contexto.cfop,
    input.contexto.ncm,
    ...input.contexto.fornecedores.map((fornecedor) => fornecedor.label),
    ...input.contexto.categorias.map((categoria) => categoria.label),
    ...input.pendencias.map((pendencia) => pendencia.numero_nf),
    ...input.pendencias.map((pendencia) => pendencia.fornecedor_nome),
    ...input.pendencias.map((pendencia) => pendencia.fornecedor_razao_social),
    ...input.pendencias.map((pendencia) => pendencia.categoria_compra_descricao),
    ...input.pendencias.map((pendencia) => pendencia.cfop_entrada),
    ...input.pendencias.map((pendencia) => pendencia.ncm_produto),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
