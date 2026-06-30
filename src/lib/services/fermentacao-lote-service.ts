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
import type { InsumoConsumoResultado } from '@/domain/types/insumo-estoque';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { etapaFinalizacaoService } from '@/lib/services/etapa-finalizacao-service';
import { insumoConsumoProducaoService } from '@/lib/services/insumo-consumo-producao-service';

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

export type FermentacaoLoteOperacaoResultado = {
  lote: FermentacaoLoteRecord;
  insumoConsumo: InsumoConsumoResultado;
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

async function sincronizarConsumoInsumos(
  operacao: () => Promise<InsumoConsumoResultado>,
): Promise<InsumoConsumoResultado> {
  try {
    return await operacao();
  } catch (error) {
    return {
      aplicado: false,
      avisos: [
        error instanceof Error
          ? `Estoque de insumos não atualizado: ${error.message}`
          : 'Estoque de insumos não atualizado',
      ],
    };
  }
}

export class FermentacaoLoteService {
  async criarLotePorOrdem(
    input: CriarLotePorOrdemInput,
  ): Promise<FermentacaoLoteOperacaoResultado> {
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

    const insumoConsumo = await sincronizarConsumoInsumos(() =>
      insumoConsumoProducaoService.sincronizarFermentacaoLote(lote, ordem),
    );

    return { lote, insumoConsumo };
  }

  async atualizarLote(
    loteId: string,
    input: AtualizarLoteInput,
  ): Promise<FermentacaoLoteOperacaoResultado> {
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

    const insumoConsumo = await sincronizarConsumoInsumos(() =>
      insumoConsumoProducaoService.ajustarFermentacaoLote(existing, lote, ordem),
    );

    return { lote, insumoConsumo };
  }

  async excluirLote(loteId: string): Promise<InsumoConsumoResultado> {
    const existing = await fermentacaoLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }

    const ordem = await ordemProducaoRepository.findById(existing.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    const insumoConsumo = await sincronizarConsumoInsumos(() =>
      insumoConsumoProducaoService.estornarFermentacaoLote(existing, ordem),
    );

    await fermentacaoLoteRepository.deleteById(loteId);

    return insumoConsumo;
  }
}

export const fermentacaoLoteService = new FermentacaoLoteService();
