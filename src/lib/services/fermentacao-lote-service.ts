import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import {
  resolveModoQuantidadeEtapa,
  somarLotesEtapa,
  validarQuantidadeLote,
  type EtapaQuantidade,
  type ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type {
  EtapaLoteFotos,
  FermentacaoLoteRecord,
} from '@/domain/types/fermentacao-lote';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { etapaFinalizacaoService } from '@/lib/services/etapa-finalizacao-service';

export type CriarLotePorOrdemInput = {
  ordemProducaoId: string;
  quantidade: EtapaQuantidade;
  fotos?: EtapaLoteFotos;
  continuaProduzindo?: boolean;
};

export type AtualizarLoteInput = {
  quantidade: EtapaQuantidade;
  fotos?: EtapaLoteFotos;
  continuaProduzindo?: boolean;
};

const ETAPA: EtapaProducaoSlug = 'fermentacao';

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

function totalProduzidoScalar(
  ordem: OrdemProducaoRecord,
  lotes: FermentacaoLoteRecord[],
): number {
  const modo = getModo(ordem);
  const produzido = somarLotesEtapa(lotes);
  return modo === 'assadeiras' ? produzido.assadeiras : produzido.unidades;
}

async function aplicarFinalizacaoAposSalvar(
  ordem: OrdemProducaoRecord,
  continuaProduzindo: boolean | undefined,
): Promise<void> {
  const lotesMap = await fermentacaoLoteRepository.listByOrdemProducaoIds([ordem.id]);
  const lotes = lotesMap.get(ordem.id) ?? [];
  const totalProduzidoEtapa = totalProduzidoScalar(ordem, lotes);

  await etapaFinalizacaoService.aplicarAposSalvarLote({
    ordemId: ordem.id,
    etapa: ETAPA,
    continuaProduzindo: continuaProduzindo ?? true,
    totalProduzidoEtapa,
  });
}

export class FermentacaoLoteService {
  async criarLotePorOrdem(input: CriarLotePorOrdemInput): Promise<FermentacaoLoteRecord> {
    const ordem = await ordemProducaoRepository.findById(input.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    etapaFinalizacaoService.assertEtapaNaoFinalizada(ordem, ETAPA);

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    const lote = await fermentacaoLoteRepository.insert({
      modo: 'parcial',
      ordemProducaoId: ordem.id,
      assadeiras: input.quantidade.assadeiras,
      unidades: input.quantidade.unidades,
      produzidoEm: new Date().toISOString(),
      fotos: input.fotos,
    });

    await aplicarFinalizacaoAposSalvar(ordem, input.continuaProduzindo);

    return lote;
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

    etapaFinalizacaoService.assertEtapaNaoFinalizada(ordem, ETAPA);

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    const lote = await fermentacaoLoteRepository.updateById(loteId, {
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

    await aplicarFinalizacaoAposSalvar(ordem, input.continuaProduzindo);

    return lote;
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
