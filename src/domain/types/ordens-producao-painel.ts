import type { AssadeiraDisplayVariant } from '@/domain/ordens-producao/ordem-assadeira-display';
import type { ModoQuantidadeOrdem } from '@/domain/ordens-producao/ordem-quantidade-label';

export type OrdemProducaoEstimativaView = {
  fermentacaoFim: string;
  camaraFim: string;
  fornoFim: string;
  resfriamentoFim: string;
  embalagemFim: string;
};

export type OrdemProducaoPainelItem = {
  id: string;
  ordemPlanejamento: number;
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao: string;
  modoQuantidade: ModoQuantidadeOrdem;
  assadeiras: number;
  assadeiraNome?: string;
  assadeiraVariant: AssadeiraDisplayVariant;
  unidades: number;
  caixas: number;
  quantidadeLabel: string;
  estimativa: OrdemProducaoEstimativaView | null;
};

export type OrdensProducaoListResponse = {
  date: string;
  resumo: {
    totalOrdens: number;
    totalLatas: number;
    totalUnidades: number;
    totalCaixas: number;
  };
  estimativaDisponivel: boolean;
  ordens: OrdemProducaoPainelItem[];
};
