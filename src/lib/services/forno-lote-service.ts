import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import {
  resolveModoQuantidadeEtapa,
  somarLotesEtapa,
  validarQuantidadeLote,
  type EtapaQuantidade,
  type ModoQuantidadeEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type { EtapaLoteFotos, FornoLoteRecord } from '@/domain/types/forno-lote';
import type { InsumoConsumoResultado } from '@/domain/types/insumo-estoque';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { etapaFinalizacaoService } from '@/lib/services/etapa-finalizacao-service';
import { insumoConsumoFornoService } from '@/lib/services/insumo-consumo-forno-service';

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

export type FornoLoteOperacaoResultado = {
  lote: FornoLoteRecord;
  insumoConsumo: InsumoConsumoResultado;
};

const ETAPA: EtapaProducaoSlug = 'forno';

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
  lotes: FornoLoteRecord[],
): number {
  const modo = getModo(ordem);
  const produzido = somarLotesEtapa(lotes);
  return modo === 'assadeiras' ? produzido.assadeiras : produzido.unidades;
}

async function aplicarFinalizacaoAposSalvar(
  ordem: OrdemProducaoRecord,
  continuaProduzindo: boolean | undefined,
): Promise<void> {
  const lotesMap = await fornoLoteRepository.listByOrdemProducaoIds([ordem.id]);
  const lotes = lotesMap.get(ordem.id) ?? [];
  const totalProduzidoEtapa = totalProduzidoScalar(ordem, lotes);

  await etapaFinalizacaoService.aplicarAposSalvarLote({
    ordemId: ordem.id,
    etapa: ETAPA,
    continuaProduzindo: continuaProduzindo ?? true,
    totalProduzidoEtapa,
  });
}

export class FornoLoteService {
  async criarLotePorOrdem(
    input: CriarLotePorOrdemInput,
  ): Promise<FornoLoteOperacaoResultado> {
    const ordem = await ordemProducaoRepository.findById(input.ordemProducaoId);
    if (!ordem) {
      throw new Error('Ordem de produção não encontrada');
    }

    etapaFinalizacaoService.assertEtapaNaoFinalizada(ordem, ETAPA);

    const modo = getModo(ordem);

    validarQuantidadeRealizada(input.quantidade, modo);

    const lote = await fornoLoteRepository.insert({
      modo: 'parcial',
      ordemProducaoId: ordem.id,
      assadeiras: input.quantidade.assadeiras,
      unidades: input.quantidade.unidades,
      produzidoEm: new Date().toISOString(),
      fotos: input.fotos,
    });

    await aplicarFinalizacaoAposSalvar(ordem, input.continuaProduzindo);

    const insumoConsumo = await sincronizarConsumoInsumos(() =>
      insumoConsumoFornoService.sincronizar(lote, ordem),
    );

    return { lote, insumoConsumo };
  }

  async atualizarLote(
    loteId: string,
    input: AtualizarLoteInput,
  ): Promise<FornoLoteOperacaoResultado> {
    const existing = await fornoLoteRepository.findById(loteId);
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

    const lote = await fornoLoteRepository.updateById(loteId, {
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
      insumoConsumoFornoService.sincronizar(lote, ordem),
    );

    return { lote, insumoConsumo };
  }

  async excluirLote(loteId: string): Promise<InsumoConsumoResultado> {
    const existing = await fornoLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }

    const insumoConsumo = await sincronizarConsumoInsumos(() =>
      insumoConsumoFornoService.estornar(existing),
    );

    await fornoLoteRepository.deleteById(loteId);

    return insumoConsumo;
  }
}

export const fornoLoteService = new FornoLoteService();

