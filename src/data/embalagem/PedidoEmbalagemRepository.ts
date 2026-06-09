import {
  OrdemProducaoRepository,
  ordemProducaoRepository,
} from '@/data/producao/OrdemProducaoRepository';

export type {
  OrdemProducaoKey as PedidoEmbalagemKey,
  OrdemProducaoRecord as PedidoEmbalagemRecord,
  OrdemProducaoUpsert as PedidoEmbalagemUpsert,
} from '@/domain/types/ordem-producao';

export const PedidoEmbalagemRepository = OrdemProducaoRepository;
export const pedidoEmbalagemRepository = ordemProducaoRepository;
