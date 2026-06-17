import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import {
  calcularSaldoEtapa,
  derivarEscalarEtapa,
  resolveModoQuantidadeEtapa,
  somarLotesEtapa,
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

function getPedidoQuantidade(ordem: OrdemProducaoRecord): EtapaQuantidade {
  return {
    assadeiras: ordem.assadeiras,
    unidades: ordem.quantidade.unidades,
  };
}

function getModo(ordem: OrdemProducaoRecord): ModoQuantidadeEtapa {
  return resolveModoQuantidadeEtapa(ordem.assadeiraId);
}

function validarQuantidadeDentroDoSaldo(
  pedido: EtapaQuantidade,
  produzido: EtapaQuantidade,
  quantidade: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): void {
  validarQuantidadeLote(quantidade, modo);
  const saldo = calcularSaldoEtapa(pedido, produzido, modo);
  const qty = modo === 'assadeiras' ? quantidade.assadeiras : quantidade.unidades;
  if (qty > saldo) {
    throw new Error(`Quantidade excede o saldo disponível (${saldo}).`);
  }
}

function validarTotalNaoExcedeMeta(
  pedido: EtapaQuantidade,
  produzido: EtapaQuantidade,
  quantidade: EtapaQuantidade,
  modo: ModoQuantidadeEtapa,
): void {
  validarQuantidadeLote(quantidade, modo);
  const total = somarLotesEtapa([produzido, quantidade]);
  const { aProduzir, produzido: totalProduzido } = derivarEscalarEtapa(pedido, total, modo);
  if (totalProduzido > aProduzir) {
    throw new Error('Quantidade excede o saldo disponível.');
  }
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

    const pedido = getPedidoQuantidade(ordem);
    const modo = getModo(ordem);
    const lotesMap = await fornoLoteRepository.listByOrdemProducaoIds([ordem.id]);
    const produzido = somarLotesEtapa(lotesMap.get(ordem.id) ?? []);

    validarQuantidadeDentroDoSaldo(pedido, produzido, input.quantidade, modo);

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

    const pedido = getPedidoQuantidade(ordem);
    const modo = getModo(ordem);
    const lotesMap = await fornoLoteRepository.listByOrdemProducaoIds([ordem.id]);
    const produzidoOutros = somarLotesEtapa(
      (lotesMap.get(ordem.id) ?? []).filter((l) => l.id !== loteId),
    );

    validarTotalNaoExcedeMeta(pedido, produzidoOutros, input.quantidade, modo);

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
