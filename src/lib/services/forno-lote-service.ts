import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import {
  resolveModoQuantidadeEtapa,
  validarQuantidadeLote,
  type EtapaQuantidade,
  type ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type { EtapaLoteFotos, FornoLoteRecord } from '@/domain/types/forno-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';

export type CriarLotePorOrdemInput = {
  ordemProducaoId: string;
  quantidade: EtapaQuantidade;
  fotos?: EtapaLoteFotos;
};

export type AtualizarLoteInput = {
  quantidade: EtapaQuantidade;
  fotos?: EtapaLoteFotos;
};

function getModo(ordem: OrdemProducaoRecord): ModoQuantidadeEtapa {
  return resolveModoQuantidadeEtapa(ordem.assadeiraId);
}

function validarQuantidadeRealizada(
  quantidade: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): void {
  validarQuantidadeLote(quantidade, modo);
}

function mergeFotos(
  existing: EtapaLoteFotos | undefined,
  patch: EtapaLoteFotos | undefined,
): EtapaLoteFotos | undefined {
  if (!patch) return existing;
  return { ...existing, ...patch };
}

export class FornoLoteService {
  async criarLotePorOrdem(input: CriarLotePorOrdemInput): Promise<FornoLoteRecord> {
    const ordem = await ordemProducaoRepository.findById(input.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    return fornoLoteRepository.insert({
      modo: 'parcial',
      ordemProducaoId: ordem.id,
      assadeiras: input.quantidade.assadeiras,
      unidades: input.quantidade.unidades,
      produzidoEm: new Date().toISOString(),
      fotos: input.fotos,
    });
  }

  async atualizarLote(loteId: string, input: AtualizarLoteInput): Promise<FornoLoteRecord> {
    const existing = await fornoLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }

    const ordem = await ordemProducaoRepository.findById(existing.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    return fornoLoteRepository.updateById(loteId, {
      assadeiras: input.quantidade.assadeiras,
      unidades: input.quantidade.unidades,
      fotos: mergeFotos(existing.fotos, input.fotos),
      produzidoEm: new Date().toISOString(),
      modo: 'substituicao',
      producaoAnterior: {
        assadeiras: existing.assadeiras,
        unidades: existing.unidades,
      },
    });
  }

  async excluirLote(loteId: string): Promise<void> {
    const existing = await fornoLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }
    await fornoLoteRepository.deleteById(loteId);
  }
}

export const fornoLoteService = new FornoLoteService();
