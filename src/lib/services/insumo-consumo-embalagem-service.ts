import {
  insumoReceitaMassaRepository,
  InsumoReceitaMassaRepository,
} from '@/data/insumos/InsumoReceitaMassaRepository';
import { derivarDimensoesEmbalagem } from '@/domain/insumos/insumo-consumo-embalagem-dimensoes';
import { calcularConsumoMultiReceitas } from '@/domain/insumos/insumo-consumo-producao-multi-calculator';
import { formatarObservacaoConsumoEmbalagem } from '@/domain/insumos/insumo-consumo-observacao';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { InsumoConsumoResultado } from '@/domain/types/insumo-estoque';
import {
  insumoConsumoAplicador,
  InsumoConsumoAplicador,
} from '@/lib/services/insumo-consumo-aplicador';

const TIPOS_EMBALAGEM: TipoReceita[] = ['antimofo', 'embalagem', 'caixa'];
const COLUNA = 'embalagem_lote_id' as const;
const ORIGEM = 'producao_embalagem' as const;

export class InsumoConsumoEmbalagemService {
  constructor(
    private readonly receitaRepository: InsumoReceitaMassaRepository = insumoReceitaMassaRepository,
    private readonly aplicador: InsumoConsumoAplicador = insumoConsumoAplicador,
  ) {}

  async sincronizar(lote: EmbalagemLoteRecord): Promise<InsumoConsumoResultado> {
    try {
      const contexto = await this.receitaRepository.loadContextoProducaoPorProduto(
        lote.produtoId,
        TIPOS_EMBALAGEM,
      );
      if (!contexto) {
        return {
          aplicado: false,
          avisos: ['Estoque não atualizado: produto sem receita de embalagem vinculada'],
        };
      }

      const dimensoes = derivarDimensoesEmbalagem(lote.quantidade, contexto.receitas);
      const calculo = calcularConsumoMultiReceitas({
        unidadesProduzidas: dimensoes.unidades ?? 0,
        pacotesProduzidos: dimensoes.pacotes,
        receitas: contexto.receitas,
      });

      const avisos = [...dimensoes.avisos, ...calculo.avisos];

      if (calculo.consumos.length === 0) {
        return {
          aplicado: false,
          avisos: avisos.length
            ? avisos
            : ['Estoque não atualizado: nenhum insumo com consumo calculável'],
        };
      }

      const observacao = formatarObservacaoConsumoEmbalagem({
        produtoNome: contexto.produtoNome,
        unidades: dimensoes.unidades,
        pacotes: dimensoes.pacotes,
        loteId: lote.id,
      });

      await this.aplicador.reconciliar({
        vinculo: { coluna: COLUNA, loteId: lote.id },
        origem: ORIGEM,
        consumosAlvo: calculo.consumos,
        observacao,
      });

      return { aplicado: true, avisos };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return {
        aplicado: false,
        avisos: [`Estoque de insumos não atualizado: ${message}`],
      };
    }
  }

  async estornar(lote: EmbalagemLoteRecord): Promise<InsumoConsumoResultado> {
    try {
      await this.aplicador.estornar({
        vinculo: { coluna: COLUNA, loteId: lote.id },
        origem: ORIGEM,
        observacao: `Estorno — produção embalagem lote ${lote.id.slice(0, 8)}`,
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

export const insumoConsumoEmbalagemService = new InsumoConsumoEmbalagemService();
