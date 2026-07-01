import {
  insumoReceitaMassaRepository,
  InsumoReceitaMassaRepository,
} from '@/data/insumos/InsumoReceitaMassaRepository';
import { calcularConsumoMultiReceitas } from '@/domain/insumos/insumo-consumo-producao-multi-calculator';
import { formatarObservacaoConsumoForno } from '@/domain/insumos/insumo-consumo-observacao';
import type { InsumoReceitaProducaoContexto } from '@/domain/insumos/insumo-consumo-producao-types';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';
import type { FornoLoteRecord } from '@/domain/types/forno-lote';
import type { InsumoConsumoResultado } from '@/domain/types/insumo-estoque';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import {
  insumoConsumoAplicador,
  InsumoConsumoAplicador,
} from '@/lib/services/insumo-consumo-aplicador';

const TIPOS_FORNO: TipoReceita[] = ['brilho', 'confeito'];
const COLUNA = 'forno_lote_id' as const;
const ORIGEM = 'producao_forno' as const;

function resolverUnidadesProduzidas(
  lote: FornoLoteRecord,
  ordem: OrdemProducaoRecord,
  contexto: InsumoReceitaProducaoContexto,
): number | null {
  const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
  if (modo === 'assadeiras') {
    if (!contexto.unidadesPorAssadeira || contexto.unidadesPorAssadeira <= 0) return null;
    if (lote.assadeiras <= 0) return null;
    return lote.assadeiras * contexto.unidadesPorAssadeira;
  }
  if (lote.unidades <= 0) return null;
  return lote.unidades;
}

export class InsumoConsumoFornoService {
  constructor(
    private readonly receitaRepository: InsumoReceitaMassaRepository = insumoReceitaMassaRepository,
    private readonly aplicador: InsumoConsumoAplicador = insumoConsumoAplicador,
  ) {}

  async sincronizar(
    lote: FornoLoteRecord,
    ordem: OrdemProducaoRecord,
  ): Promise<InsumoConsumoResultado> {
    try {
      const contexto = await this.receitaRepository.loadContextoProducao(ordem, TIPOS_FORNO);
      if (!contexto) {
        return {
          aplicado: false,
          avisos: ['Estoque não atualizado: produto sem receita de brilho/confeito vinculada'],
        };
      }

      const unidadesProduzidas = resolverUnidadesProduzidas(lote, ordem, contexto);
      const calculo = calcularConsumoMultiReceitas({
        unidadesProduzidas: unidadesProduzidas ?? 0,
        pacotesProduzidos: null,
        receitas: contexto.receitas,
      });

      if (calculo.consumos.length === 0) {
        return {
          aplicado: false,
          avisos: calculo.avisos.length
            ? calculo.avisos
            : ['Estoque não atualizado: nenhum insumo com consumo calculável'],
        };
      }

      const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
      const observacao = formatarObservacaoConsumoForno({
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

      return { aplicado: true, avisos: calculo.avisos };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estoque de insumos não atualizado: ${message}`],
      };
    }
  }

  async estornar(lote: FornoLoteRecord): Promise<InsumoConsumoResultado> {
    try {
      await this.aplicador.estornar({
        vinculo: { coluna: COLUNA, loteId: lote.id },
        origem: ORIGEM,
        observacao: `Estorno — produção forno lote ${lote.id.slice(0, 8)}`,
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

export const insumoConsumoFornoService = new InsumoConsumoFornoService();
