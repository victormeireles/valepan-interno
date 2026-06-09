import type { DerivedQuantidades } from '@/domain/producao/ordem-derivados';

export type OrdemProducaoKey = {
  dataProducao: string;
  dataFabricacaoEtiqueta: string;
  tipoEstoqueId: string;
  produtoId: string;
  observacao: string;
  assadeiraId: string;
};

export type OrdemProducaoUpsert = OrdemProducaoKey & {
  assadeiras: number;
  ordemPlanejamento: number;
  quantidade: DerivedQuantidades;
};

export type OrdemProducaoRecord = OrdemProducaoUpsert & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
