import {
  insumoReceitaMassaRepository,
  InsumoReceitaMassaRepository,
} from '@/data/insumos/InsumoReceitaMassaRepository';
import {
  insumoEstoqueRepository,
  InsumoEstoqueRepository,
} from '@/data/insumos/InsumoEstoqueRepository';
import { calcularConsumoInsumosProducao } from '@/domain/insumos/insumo-consumo-producao-calculator';
import { formatarObservacaoConsumoFermentacao } from '@/domain/insumos/insumo-consumo-observacao';
import type { InsumoConsumoCalculado } from '@/domain/insumos/insumo-consumo-producao-types';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { InsumoConsumoResultado } from '@/domain/types/insumo-estoque';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import {
  insumoEstoqueService,
  InsumoEstoqueService,
} from '@/lib/services/insumo-estoque-service';

export class InsumoConsumoProducaoService {
  constructor(
    private readonly receitaRepository: InsumoReceitaMassaRepository = insumoReceitaMassaRepository,
    private readonly estoqueRepository: InsumoEstoqueRepository = insumoEstoqueRepository,
    private readonly estoqueService: InsumoEstoqueService = insumoEstoqueService,
  ) {}

  async sincronizarFermentacaoLote(
    lote: FermentacaoLoteRecord,
    ordem: OrdemProducaoRecord,
  ): Promise<InsumoConsumoResultado> {
    try {
      const contexto = await this.receitaRepository.loadContexto(ordem);
      if (!contexto) {
        return {
          aplicado: false,
          avisos: ['Estoque não atualizado: produto sem receita de massa vinculada'],
        };
      }

      const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
      const calculo = calcularConsumoInsumosProducao({
        lote: { assadeiras: lote.assadeiras, unidades: lote.unidades },
        modo,
        contexto,
      });

      if (!calculo.ok) {
        return {
          aplicado: false,
          avisos: [`Estoque não atualizado: ${calculo.motivo}`],
        };
      }

      const observacao = formatarObservacaoConsumoFermentacao({
        produtoNome: contexto.produtoNome,
        modo,
        lote: { assadeiras: lote.assadeiras, unidades: lote.unidades },
        unidadesPorAssadeira: contexto.unidadesPorAssadeira,
        loteId: lote.id,
      });

      await this.aplicarConsumos(lote.id, calculo.consumos, observacao);
      return { aplicado: true, avisos: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estoque de insumos não atualizado: ${message}`],
      };
    }
  }

  async ajustarFermentacaoLote(
    loteAntes: FermentacaoLoteRecord,
    loteDepois: FermentacaoLoteRecord,
    ordem: OrdemProducaoRecord,
  ): Promise<InsumoConsumoResultado> {
    try {
      const contexto = await this.receitaRepository.loadContexto(ordem);
      if (!contexto) {
        return {
          aplicado: false,
          avisos: ['Estoque não atualizado: produto sem receita de massa vinculada'],
        };
      }

      const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
      const calculo = calcularConsumoInsumosProducao({
        lote: { assadeiras: loteDepois.assadeiras, unidades: loteDepois.unidades },
        modo,
        contexto,
      });

      if (!calculo.ok) {
        return {
          aplicado: false,
          avisos: [`Estoque não atualizado: ${calculo.motivo}`],
        };
      }

      const observacao = formatarObservacaoConsumoFermentacao({
        produtoNome: contexto.produtoNome,
        modo,
        lote: { assadeiras: loteDepois.assadeiras, unidades: loteDepois.unidades },
        unidadesPorAssadeira: contexto.unidadesPorAssadeira,
        loteId: loteDepois.id,
      });

      await this.aplicarConsumos(loteDepois.id, calculo.consumos, observacao);

      if (
        loteAntes.assadeiras === loteDepois.assadeiras &&
        loteAntes.unidades === loteDepois.unidades
      ) {
        return { aplicado: true, avisos: [] };
      }

      return { aplicado: true, avisos: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estoque de insumos não atualizado: ${message}`],
      };
    }
  }

  async estornarFermentacaoLote(
    lote: FermentacaoLoteRecord,
    ordem: OrdemProducaoRecord,
  ): Promise<InsumoConsumoResultado> {
    try {
      const deltas = await this.estoqueRepository.sumDeltaByFermentacaoLoteInsumo(lote.id);
      if (deltas.size === 0) {
        return { aplicado: true, avisos: [] };
      }

      const contexto = await this.receitaRepository.loadContexto(ordem);
      const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
      const observacaoBase = contexto
        ? `Estorno — ${formatarObservacaoConsumoFermentacao({
            produtoNome: contexto.produtoNome,
            modo,
            lote: { assadeiras: lote.assadeiras, unidades: lote.unidades },
            unidadesPorAssadeira: contexto.unidadesPorAssadeira,
            loteId: lote.id,
          })}`
        : `Estorno — lote fermentação ${lote.id.slice(0, 8)}`;

      for (const [insumoId, deltaTotal] of deltas) {
        if (deltaTotal >= 0) continue;
        await this.estoqueService.aplicarDelta({
          insumoId,
          delta: -deltaTotal,
          origem: 'producao_fermentacao',
          fermentacaoLoteId: lote.id,
          observacao: observacaoBase,
        });
      }

      await this.estoqueRepository.clearFermentacaoLoteId(lote.id);
      return { aplicado: true, avisos: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estorno de insumos não concluído: ${message}`],
      };
    }
  }

  private async aplicarConsumos(
    fermentacaoLoteId: string,
    consumosAlvo: InsumoConsumoCalculado[],
    observacao: string,
  ): Promise<void> {
    const deltasAtuais =
      await this.estoqueRepository.sumDeltaByFermentacaoLoteInsumo(fermentacaoLoteId);
    const alvoMap = new Map(consumosAlvo.map((c) => [c.insumoId, c.quantidade]));
    const insumoIds = new Set([...deltasAtuais.keys(), ...alvoMap.keys()]);

    for (const insumoId of insumoIds) {
      const consumoAlvo = alvoMap.get(insumoId) ?? 0;
      const deltaJaRegistrado = deltasAtuais.get(insumoId) ?? 0;
      const deltaNecessario = -consumoAlvo - deltaJaRegistrado;
      if (deltaNecessario === 0) continue;

      await this.estoqueService.aplicarDelta({
        insumoId,
        delta: deltaNecessario,
        origem: 'producao_fermentacao',
        fermentacaoLoteId,
        observacao,
      });
    }
  }
}

export const insumoConsumoProducaoService = new InsumoConsumoProducaoService();
