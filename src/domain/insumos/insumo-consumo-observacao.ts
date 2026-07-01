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

function formatarConsumoEtapa(etapa: string, input: Input): string {
  const idCurto = input.loteId.slice(0, 8);
  if (input.modo === 'assadeiras') {
    const un = (input.unidadesPorAssadeira ?? 0) * input.lote.assadeiras;
    return `${etapa} • ${input.produtoNome} • ${input.lote.assadeiras} LT (${un} UN) • lote ${idCurto}`;
  }
  return `${etapa} • ${input.produtoNome} • ${input.lote.unidades} UN • lote ${idCurto}`;
}

export function formatarObservacaoConsumoFermentacao(input: Input): string {
  return formatarConsumoEtapa('Produção fermentação', input);
}

export function formatarObservacaoConsumoForno(input: Input): string {
  return formatarConsumoEtapa('Produção forno', input);
}

type EmbalagemInput = {
  produtoNome: string;
  unidades: number | null;
  pacotes: number | null;
  loteId: string;
};

export function formatarObservacaoConsumoEmbalagem(input: EmbalagemInput): string {
  const idCurto = input.loteId.slice(0, 8);
  const partes: string[] = [];
  if (input.pacotes != null) partes.push(`${Math.round(input.pacotes)} PCT`);
  if (input.unidades != null) partes.push(`${Math.round(input.unidades)} UN`);
  const medida = partes.length > 0 ? partes.join(' / ') : 'sem dimensão';
  return `Produção embalagem • ${input.produtoNome} • ${medida} • lote ${idCurto}`;
}
