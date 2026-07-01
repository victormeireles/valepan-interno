import {
  insumoReceitaMassaRepository,
  InsumoReceitaMassaRepository,
} from '@/data/insumos/InsumoReceitaMassaRepository';
import { calcularConsumoInsumosProducao } from '@/domain/insumos/insumo-consumo-producao-calculator';
import { formatarObservacaoConsumoFermentacao } from '@/domain/insumos/insumo-consumo-observacao';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { InsumoConsumoResultado } from '@/domain/types/insumo-estoque';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import {
  insumoConsumoAplicador,
  InsumoConsumoAplicador,
} from '@/lib/services/insumo-consumo-aplicador';

const COLUNA = 'fermentacao_lote_id' as const;
const ORIGEM = 'producao_fermentacao' as const;

export class InsumoConsumoProducaoService {
  constructor(
    private readonly receitaRepository: InsumoReceitaMassaRepository = insumoReceitaMassaRepository,
    private readonly aplicador: InsumoConsumoAplicador = insumoConsumoAplicador,
  ) {}

  private async aplicarLote(
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
        return { aplicado: false, avisos: [`Estoque não atualizado: ${calculo.motivo}`] };
      }

      const observacao = formatarObservacaoConsumoFermentacao({
        produtoNome: contexto.produtoNome,
        modo,
        lote: { assadeiras: lote.assadeiras, unidades: lote.unidades },
        unidadesPorAssadeira: contexto.unidadesPorAssadeira,
        loteId: lote.id,
      });

      await this.aplicador.reconciliar({
        vinculo: { coluna: COLUNA, loteId: lote.id },
        origem: ORIGEM,
        consumosAlvo: calculo.consumos,
        observacao,
      });

      return { aplicado: true, avisos: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estoque de insumos não atualizado: ${message}`],
      };
    }
  }

  async sincronizarFermentacaoLote(
    lote: FermentacaoLoteRecord,
    ordem: OrdemProducaoRecord,
  ): Promise<InsumoConsumoResultado> {
    return this.aplicarLote(lote, ordem);
  }

  async ajustarFermentacaoLote(
    _loteAntes: FermentacaoLoteRecord,
    loteDepois: FermentacaoLoteRecord,
    ordem: OrdemProducaoRecord,
  ): Promise<InsumoConsumoResultado> {
    return this.aplicarLote(loteDepois, ordem);
  }

  async estornarFermentacaoLote(
    lote: FermentacaoLoteRecord,
  ): Promise<InsumoConsumoResultado> {
    try {
      await this.aplicador.estornar({
        vinculo: { coluna: COLUNA, loteId: lote.id },
        origem: ORIGEM,
        observacao: `Estorno — produção fermentação lote ${lote.id.slice(0, 8)}`,
      });
      return { aplicado: true, avisos: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estorno de insumos não concluído: ${message}`],
      };
    }
  }
}

export const insumoConsumoProducaoService = new InsumoConsumoProducaoService();
