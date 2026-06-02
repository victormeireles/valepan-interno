import type { OrdemProducaoLataSelecao } from '@/domain/types/ordem-producao';

/** Linha bruta antes de agrupar (ex.: importação ou digitação por cliente). */
export type OrdemProducaoItemBruto = {
  produtoId: string;
  tipoLata: OrdemProducaoLataSelecao;
  cliente: string;
  latas: number;
};

/** Linha após agrupar por produto + tipo de lata. */
export type OrdemProducaoItemAgrupado = {
  produtoId: string;
  tipoLata: OrdemProducaoLataSelecao;
  latasPlanejadas: number;
  clientes: string[];
};

function chaveAgrupamento(produtoId: string, tipoLata: OrdemProducaoLataSelecao): string {
  return `${produtoId}\u0000${tipoLata}`;
}

export function resolveLinhaDatas(input: {
  dataProducaoCabecalho: string;
  dataEtiquetaDefault: string;
  dataProducaoOverride?: string;
  dataEtiquetaOverride?: string;
}): { dataProducaoLinha: string; dataEtiquetaLinha: string } {
  return {
    dataProducaoLinha: input.dataProducaoOverride ?? input.dataProducaoCabecalho,
    dataEtiquetaLinha: input.dataEtiquetaOverride ?? input.dataEtiquetaDefault,
  };
}

export function buildClientesPreview(clientes: string[]): string {
  if (clientes.length <= 3) return clientes.join(', ');
  return `${clientes.slice(0, 3).join(', ')} +${clientes.length - 3}`;
}

/**
 * Agrupa itens pela chave produto + tipo de lata, somando latas e reunindo clientes (únicos).
 */
export function groupItensOrdem(itens: OrdemProducaoItemBruto[]): OrdemProducaoItemAgrupado[] {
  const map = new Map<
    string,
    { produtoId: string; tipoLata: OrdemProducaoLataSelecao; latas: number; clientes: Set<string> }
  >();

  for (const row of itens) {
    const k = chaveAgrupamento(row.produtoId, row.tipoLata);
    const cur = map.get(k);
    if (!cur) {
      map.set(k, {
        produtoId: row.produtoId,
        tipoLata: row.tipoLata,
        latas: row.latas,
        clientes: new Set([row.cliente]),
      });
    } else {
      cur.latas += row.latas;
      cur.clientes.add(row.cliente);
    }
  }

  return [...map.values()].map((v) => ({
    produtoId: v.produtoId,
    tipoLata: v.tipoLata,
    latasPlanejadas: v.latas,
    clientes: [...v.clientes].sort((a, b) => a.localeCompare(b)),
  }));
}

/** Resposta da action quando as tabelas da ordem diária ainda não existem (UI pode mostrar esqueleto). */
export function isOrdemDiariaSchemaMigrationPendingError(message: string | null | undefined): boolean {
  const m = String(message ?? '').toLowerCase();
  /** Coluna em falta: não é “tabela da ordem inexistente”. */
  if (m.includes('column') && m.includes('does not exist')) return false;
  const estruturaMsg =
    m.includes('migracao_oficial_ordem_diaria_op_interno.sql') ||
    m.includes('migracao_ordens_producao_diarias.sql');
  const relacaoAusente =
    m.includes('ordens_producao_diarias') &&
    (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'));
  return estruturaMsg || relacaoAusente;
}
