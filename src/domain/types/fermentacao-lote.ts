import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';

export type ProducaoLoteModo = 'parcial' | 'substituicao';

export interface EtapaLoteFotos {
  fotoUrl?: string;
  fotoId?: string;
  fotoUploadedAt?: string;
}

export interface FermentacaoLoteInsert {
  modo: ProducaoLoteModo;
  ordemProducaoId: string;
  assadeiras: number;
  unidades: number;
  produzidoEm: string;
  fotos?: EtapaLoteFotos;
  producaoAnterior?: EtapaQuantidade | null;
}

export interface FermentacaoLoteRecord extends FermentacaoLoteInsert {
  id: string;
  createdAt: string;
}
