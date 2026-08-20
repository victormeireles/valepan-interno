import type { Quantidade } from './inventario';
import type { ProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-types';

export type EmbalagemLoteModo = 'parcial' | 'substituicao' | 'importado';

export interface EmbalagemLoteFotos {
  pacoteFotoUrl?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoUrl?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoUrl?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
}

export interface EmbalagemLoteInsert {
  modo: EmbalagemLoteModo;
  pedidoEmbalagemId?: string | null;
  dataPedido: string;
  dataFabricacao: string;
  tipoEstoqueId: string;
  produtoId: string;
  congelado: 'Sim' | 'Não';
  lote?: number | null;
  quantidade: Quantidade;
  produzidoEm: string;
  obsEmbalagem?: string | null;
  fotos?: EmbalagemLoteFotos;
  producaoAnterior?: Quantidade | null;
  turno: ProducaoTurnoNumero;
}

export interface EmbalagemLoteRecord extends Omit<EmbalagemLoteInsert, 'turno'> {
  id: string;
  createdAt: string;
  turno?: ProducaoTurnoNumero | null;
}
