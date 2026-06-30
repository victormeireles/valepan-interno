import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { calcularValorUnitarioNf } from '@/domain/insumos/insumo-nf-valor-unitario';
import {
  buildPendenciaGrupoContexto,
  type InsumoPendenciaGrupoContexto,
} from '@/domain/insumos/insumo-pendencia-grupo-contexto';
import { buildTextoBuscaPendenciaGrupo } from '@/domain/insumos/insumo-pendencia-grupo-texto-busca';

export type { InsumoPendenciaGrupoContexto };

export type InsumoPendenciaProdutoGrupo = {
  chave: string;
  empresaId: string;
  empresaNome: string;
  omieIdProduto: number;
  omieCodigoProduto: string | null;
  descricaoProduto: string | null;
  unidadeNf: string | null;
  pendenciaIds: string[];
  /** Preenchido sob demanda (modal de NFs / vincular). Vazio no carregamento inicial da página. */
  pendencias: InsumoPendenciaComEmpresa[];
  pendenciaCount: number;
  nfsDistintas: number;
  quantidadeNfTotal: number;
  valorTotal: number;
  valorUnitarioNf: number | null;
  contexto: InsumoPendenciaGrupoContexto;
  textoBusca: string;
  ignoradoEm: string | null;
};

export function buildPendenciaGrupoChave(empresaId: string, omieIdProduto: number): string {
  return `${empresaId}:${omieIdProduto}`;
}

type InsumoPendenciaProdutoGrupoDraft = Omit<
  InsumoPendenciaProdutoGrupo,
  'nfsDistintas' | 'contexto' | 'valorUnitarioNf' | 'pendenciaIds' | 'textoBusca' | 'ignoradoEm'
>;

function calcularIgnoradoEm(pendencias: InsumoPendenciaComEmpresa[]): string | null {
  const datas = pendencias
    .map((pendencia) => pendencia.resolvido_em)
    .filter((value): value is string => Boolean(value));

  if (datas.length === 0) return null;
  return datas.sort().at(-1) ?? null;
}

function finalizarGrupo(draft: InsumoPendenciaProdutoGrupoDraft): InsumoPendenciaProdutoGrupo {
  const nfsDistintas = new Set(draft.pendencias.map((p) => p.numero_nf).filter(Boolean)).size;
  const contexto = buildPendenciaGrupoContexto(draft.pendencias);

  return {
    ...draft,
    pendenciaIds: draft.pendencias.map((pendencia) => pendencia.id),
    nfsDistintas,
    valorUnitarioNf: calcularValorUnitarioNf(draft.valorTotal, draft.quantidadeNfTotal),
    contexto,
    textoBusca: buildTextoBuscaPendenciaGrupo({
      descricaoProduto: draft.descricaoProduto,
      omieCodigoProduto: draft.omieCodigoProduto,
      omieIdProduto: draft.omieIdProduto,
      empresaNome: draft.empresaNome,
      contexto,
      pendencias: draft.pendencias,
    }),
    ignoradoEm: calcularIgnoradoEm(draft.pendencias),
  };
}

/** Remove linhas de NF do payload enviado ao cliente (carregadas sob demanda no modal). */
export function prepararGruposParaCliente(
  grupos: InsumoPendenciaProdutoGrupo[],
): InsumoPendenciaProdutoGrupo[] {
  return grupos.map((grupo) => ({ ...grupo, pendencias: [] }));
}

export function mesclarPendenciasNoGrupo(
  grupo: InsumoPendenciaProdutoGrupo,
  pendencias: InsumoPendenciaComEmpresa[],
): InsumoPendenciaProdutoGrupo {
  return { ...grupo, pendencias };
}

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
    .map((grupo) => finalizarGrupo(grupo))
    .sort((a, b) => b.pendenciaCount - a.pendenciaCount);
}

export function filterPendenciaGrupos(
  grupos: InsumoPendenciaProdutoGrupo[],
  term: string,
): InsumoPendenciaProdutoGrupo[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return grupos;

  return grupos.filter((grupo) => grupo.textoBusca.includes(normalized));
}

export function collectPendenciaIdsFromGrupos(
  grupos: InsumoPendenciaProdutoGrupo[],
  chaves: Set<string>,
): string[] {
  return grupos
    .filter((grupo) => chaves.has(grupo.chave))
    .flatMap((grupo) => grupo.pendenciaIds);
}

export function getGrupoIgnoradoEm(grupo: InsumoPendenciaProdutoGrupo): string | null {
  return grupo.ignoradoEm;
}
