import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import {
  buildPendenciaGrupoContexto,
  type InsumoPendenciaGrupoContexto,
} from '@/domain/insumos/insumo-pendencia-grupo-contexto';

export type { InsumoPendenciaGrupoContexto };

export type InsumoPendenciaProdutoGrupo = {
  chave: string;
  empresaId: string;
  empresaNome: string;
  omieIdProduto: number;
  omieCodigoProduto: string | null;
  descricaoProduto: string | null;
  unidadeNf: string | null;
  pendencias: InsumoPendenciaComEmpresa[];
  pendenciaCount: number;
  nfsDistintas: number;
  quantidadeNfTotal: number;
  valorTotal: number;
  contexto: InsumoPendenciaGrupoContexto;
};

export function buildPendenciaGrupoChave(empresaId: string, omieIdProduto: number): string {
  return `${empresaId}:${omieIdProduto}`;
}

type InsumoPendenciaProdutoGrupoDraft = Omit<
  InsumoPendenciaProdutoGrupo,
  'nfsDistintas' | 'contexto'
>;

export function groupPendenciasPorProduto(
  items: InsumoPendenciaComEmpresa[],
): InsumoPendenciaProdutoGrupo[] {
  const map = new Map<string, InsumoPendenciaProdutoGrupoDraft>();

  for (const item of items) {
    const chave = buildPendenciaGrupoChave(item.empresa_id, item.omie_id_produto);
    const existing = map.get(chave);

    if (existing) {
      existing.pendencias.push(item);
      existing.pendenciaCount += 1;
      existing.quantidadeNfTotal += Number(item.quantidade_nf);
      existing.valorTotal += Number(item.valor_total_item);
      continue;
    }

    map.set(chave, {
      chave,
      empresaId: item.empresa_id,
      empresaNome: item.empresaNome,
      omieIdProduto: item.omie_id_produto,
      omieCodigoProduto: item.omie_codigo_produto,
      descricaoProduto: item.descricao_produto,
      unidadeNf: item.unidade_nf,
      pendencias: [item],
      pendenciaCount: 1,
      quantidadeNfTotal: Number(item.quantidade_nf),
      valorTotal: Number(item.valor_total_item),
    });
  }

  return [...map.values()]
    .map((grupo) => ({
      ...grupo,
      nfsDistintas: new Set(grupo.pendencias.map((p) => p.numero_nf).filter(Boolean)).size,
      contexto: buildPendenciaGrupoContexto(grupo.pendencias),
    }))
    .sort((a, b) => b.pendenciaCount - a.pendenciaCount);
}

export function filterPendenciaGrupos(
  grupos: InsumoPendenciaProdutoGrupo[],
  term: string,
): InsumoPendenciaProdutoGrupo[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return grupos;

  return grupos.filter((grupo) => {
    const haystack = [
      grupo.descricaoProduto,
      grupo.omieCodigoProduto,
      String(grupo.omieIdProduto),
      grupo.empresaNome,
      grupo.contexto.fornecedorTitulo,
      grupo.contexto.fornecedorSubtitulo,
      grupo.contexto.cfop,
      grupo.contexto.ncm,
      ...grupo.contexto.fornecedores.map((fornecedor) => fornecedor.label),
      ...grupo.pendencias.map((p) => p.numero_nf),
      ...grupo.pendencias.map((p) => p.fornecedor_nome),
      ...grupo.pendencias.map((p) => p.fornecedor_razao_social),
      ...grupo.pendencias.map((p) => p.cfop_entrada),
      ...grupo.pendencias.map((p) => p.ncm_produto),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function collectPendenciaIdsFromGrupos(
  grupos: InsumoPendenciaProdutoGrupo[],
  chaves: Set<string>,
): string[] {
  return grupos
    .filter((grupo) => chaves.has(grupo.chave))
    .flatMap((grupo) => grupo.pendencias.map((p) => p.id));
}
