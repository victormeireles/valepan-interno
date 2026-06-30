import type {
  EtapaQuantidade,
  ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';

type Input = {
  produtoNome: string;
  modo: ModoQuantidadeEtapa;
  lote: EtapaQuantidade;
  unidadesPorAssadeira: number | null;
  loteId: string;
};

export function formatarObservacaoConsumoFermentacao(input: Input): string {
  const idCurto = input.loteId.slice(0, 8);
  if (input.modo === 'assadeiras') {
    const un = (input.unidadesPorAssadeira ?? 0) * input.lote.assadeiras;
    return `Produção fermentação • ${input.produtoNome} • ${input.lote.assadeiras} LT (${un} UN) • lote ${idCurto}`;
  }
  return `Produção fermentação • ${input.produtoNome} • ${input.lote.unidades} UN • lote ${idCurto}`;
}
