export type InsumoNfDetalheStatus = 'pendente' | 'ignorado' | 'resolvido' | 'lancada';

export type InsumoNfDetalhe = {
  id: string;
  numeroNf: string | null;
  data: string | null;
  quantidadeNf: number | null;
  unidadeNf: string | null;
  quantidadeEstoque: number | null;
  unidadeEstoque: string | null;
  valorItem: number | null;
  fornecedor: string | null;
  cfop: string | null;
  ncm: string | null;
  categoria: string | null;
  natureza: string | null;
  insumoNome: string | null;
  status: InsumoNfDetalheStatus;
  omieNIdReceb: number | null;
  omieNIdItem: number | null;
};

export type InsumoNfMovimentoEntrada = {
  id: string;
  createdAt: string;
  numeroNf: string | null;
  deltaQuantidade: number;
  custoUnitario: number;
  omieNIdReceb: number | null;
  omieNIdItem: number | null;
};

export type InsumoNfConsultaContexto = {
  fatorConversao: number;
  unidadeEstoque: string | null;
  unidadeNfVinculo: string | null;
  insumoNome: string | null;
};

const STATUS_LABELS: Record<InsumoNfDetalheStatus, string> = {
  pendente: 'Pendente',
  ignorado: 'Ignorada',
  resolvido: 'Resolvida',
  lancada: 'Lançada',
};

export function insumoNfDetalheStatusLabel(status: InsumoNfDetalheStatus): string {
  return STATUS_LABELS[status];
}
