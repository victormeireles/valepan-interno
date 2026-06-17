import type { ModoQuantidadeOrdem } from '@/domain/ordens-producao/ordem-quantidade-label';

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
  unidades: number;
  caixas: number;
  quantidadeLabel: string;
};

export type OrdensProducaoListResponse = {
  date: string;
  resumo: {
    totalOrdens: number;
    totalLatas: number;
    totalUnidades: number;
  };
  ordens: OrdemProducaoPainelItem[];
};
