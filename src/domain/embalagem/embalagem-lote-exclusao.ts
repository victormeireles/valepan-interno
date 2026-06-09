import type { Quantidade } from '@/domain/types/inventario';

/** Texto padrão na observação da saída ao excluir lote de embalagem. */
export const OBS_SAIDA_EXCLUSAO_EMBALAGEM =
  'Exclusão de embalagem preenchida incorretamente';

export function montarObservacaoSaidaExclusaoEmbalagem(produto: string): string {
  return `${OBS_SAIDA_EXCLUSAO_EMBALAGEM} — ${produto}`;
}

export function loteTemQuantidadeProduzida(q: Quantidade): boolean {
  return q.caixas + q.pacotes + q.unidades + Number(q.kg) > 0;
}
