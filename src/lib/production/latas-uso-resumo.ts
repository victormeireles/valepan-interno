export interface AssadeiraEstoqueInfo {
  nome: string;
  quantidadeLatas: number;
}

export interface ItemLataUso {
  tipoLata: string;
  latasPlanejadas: number;
}

export interface LataUsoTipoResumo {
  assadeiraId: string;
  nome: string;
  /** Soma das latas planejadas desse tipo no dia. */
  emUso: number;
  /** Estoque físico do tipo (assadeiras.quantidade_latas). */
  disponivel: number;
  /** emUso / disponivel; null quando não há estoque cadastrado. */
  razao: number | null;
}

export interface LatasUsoTotais {
  emUso: number;
  disponivel: number;
  razao: number | null;
}

function inteiroNaoNegativo(v: unknown): number {
  const n = Math.round(Number(v) || 0);
  return n > 0 ? n : 0;
}

/**
 * Agrega as latas planejadas por tipo de assadeira e compara com o estoque disponível.
 * Cada tipo é independente (latas não são intercambiáveis entre tipos).
 */
export function montarLatasUsoResumo(
  itens: ItemLataUso[],
  estoquePorAssadeira: Map<string, AssadeiraEstoqueInfo>,
): LataUsoTipoResumo[] {
  const emUsoPorTipo = new Map<string, number>();
  for (const it of itens) {
    const id = (it.tipoLata ?? '').trim();
    if (!id) continue;
    emUsoPorTipo.set(id, (emUsoPorTipo.get(id) ?? 0) + inteiroNaoNegativo(it.latasPlanejadas));
  }

  const out: LataUsoTipoResumo[] = [];
  for (const [id, emUso] of emUsoPorTipo) {
    const info = estoquePorAssadeira.get(id);
    const disponivel = inteiroNaoNegativo(info?.quantidadeLatas);
    out.push({
      assadeiraId: id,
      nome: info?.nome?.trim() || 'Lata sem nome',
      emUso,
      disponivel,
      razao: disponivel > 0 ? emUso / disponivel : null,
    });
  }

  // Mais críticos primeiro: sem estoque (null) no topo, depois maior razão.
  out.sort((a, b) => {
    const ra = a.razao ?? Number.POSITIVE_INFINITY;
    const rb = b.razao ?? Number.POSITIVE_INFINITY;
    return rb - ra || b.emUso - a.emUso || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
  });
  return out;
}

export interface LataSplitAviso {
  /** True quando as latas planejadas excedem o estoque do tipo (precisa lavar/reutilizar). */
  excede: boolean;
  emUso: number;
  disponivel: number;
  /** Quantos lotes seriam necessários para caber no estoque (ceil(emUso/disponivel)). */
  lotesSugeridos: number;
}

/**
 * Avalia se uma quantidade planejada de latas de um tipo excede o estoque disponível.
 * Como só é possível usar o máximo de latas do tipo de uma vez, o excedente exige dividir a ordem em lotes.
 * Sem estoque cadastrado (disponivel ≤ 0) não há como sugerir divisão → não emite aviso.
 */
export function avaliarLataSplit(latasPlanejadas: number, disponivel: number): LataSplitAviso {
  const emUso = inteiroNaoNegativo(latasPlanejadas);
  const disp = inteiroNaoNegativo(disponivel);
  const excede = disp > 0 && emUso > disp;
  return {
    excede,
    emUso,
    disponivel: disp,
    lotesSugeridos: excede ? Math.ceil(emUso / disp) : 1,
  };
}

export function totaisLatasUso(resumo: LataUsoTipoResumo[]): LatasUsoTotais {
  let emUso = 0;
  let disponivel = 0;
  for (const r of resumo) {
    emUso += r.emUso;
    disponivel += r.disponivel;
  }
  return { emUso, disponivel, razao: disponivel > 0 ? emUso / disponivel : null };
}
