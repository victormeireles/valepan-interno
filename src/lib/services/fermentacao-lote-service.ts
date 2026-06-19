import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import {
  resolveModoQuantidadeEtapa,
  validarQuantidadeLote,
  type EtapaQuantidade,
  type ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type {
  EtapaLoteFotos,
  FermentacaoLoteRecord,
} from '@/domain/types/fermentacao-lote';
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

export class FermentacaoLoteService {
  async criarLotePorOrdem(input: CriarLotePorOrdemInput): Promise<FermentacaoLoteRecord> {
    const ordem = await ordemProducaoRepository.findById(input.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    return fermentacaoLoteRepository.insert({
      modo: 'parcial',
      ordemProducaoId: ordem.id,
      assadeiras: input.quantidade.assadeiras,
      unidades: input.quantidade.unidades,
      produzidoEm: new Date().toISOString(),
      fotos: input.fotos,
    });
  }

  async atualizarLote(
    loteId: string,
    input: AtualizarLoteInput,
  ): Promise<FermentacaoLoteRecord> {
    const existing = await fermentacaoLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }

    const ordem = await ordemProducaoRepository.findById(existing.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    return fermentacaoLoteRepository.updateById(loteId, {
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
    const existing = await fermentacaoLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }
    await fermentacaoLoteRepository.deleteById(loteId);
  }
}

export const fermentacaoLoteService = new FermentacaoLoteService();
