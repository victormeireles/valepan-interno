import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { ProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-types';

export type ProducaoLoteModo = 'parcial' | 'substituicao';

export interface EtapaLoteFotos {
  fotoUrl?: string;
  fotoId?: string;
  fotoUploadedAt?: string;
}

export interface FornoLoteInsert {
  modo: ProducaoLoteModo;
  ordemProducaoId: string;
  assadeiras: number;
  unidades: number;
  produzidoEm: string;
  fotos?: EtapaLoteFotos;
  producaoAnterior?: EtapaQuantidade | null;
  turno: ProducaoTurnoNumero;
}

export interface FornoLoteRecord extends Omit<FornoLoteInsert, 'turno'> {
  id: string;
  createdAt: string;
  turno?: ProducaoTurnoNumero | null;
}
