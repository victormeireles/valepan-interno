import type { DerivedQuantidades } from '@/domain/producao/ordem-derivados';
import type { OrdemEtapaStatusFields } from '@/domain/types/ordem-producao-etapa';

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

export type OrdemProducaoRecord = OrdemProducaoUpsert &
  OrdemEtapaStatusFields & {
    id: string;
    createdAt: string;
    updatedAt: string;
  };
