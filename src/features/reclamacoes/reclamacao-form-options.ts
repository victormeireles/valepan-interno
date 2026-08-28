import type {
  ReclamacaoCategoriaRecord,
  ReclamacaoOpcao,
} from '@/domain/reclamacoes/reclamacao-types';

export function categoriasDoSelect(params: {
  ativas: ReclamacaoCategoriaRecord[];
  atual?: Pick<
    ReclamacaoCategoriaRecord,
    'id' | 'nome' | 'ativa' | 'exigeObservacao' | 'ordem'
  > | null;
}): ReclamacaoCategoriaRecord[] {
  const { ativas, atual } = params;
  if (!atual) return ativas;
  if (ativas.some((c) => c.id === atual.id)) return ativas;
  return [...ativas, { ...atual, ativa: atual.ativa }];
}

export function categoriasDoFiltro(
  ativas: ReclamacaoOpcao[],
  itens: { categoriaId: string; categoriaNome: string }[],
): ReclamacaoOpcao[] {
  const byId = new Map(ativas.map((c) => [c.id, c]));
  for (const item of itens) {
    if (!byId.has(item.categoriaId)) {
      byId.set(item.categoriaId, {
        id: item.categoriaId,
        nome: item.categoriaNome,
      });
    }
  }
  return [...byId.values()];
}

export function idPorNome(opcoes: ReclamacaoOpcao[], nome: string): string {
  return opcoes.find((o) => o.nome === nome)?.id ?? '';
}
