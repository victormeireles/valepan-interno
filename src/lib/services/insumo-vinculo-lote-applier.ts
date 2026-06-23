import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import type {
  InsumoVinculoLoteItem,
  InsumoVinculoLoteResultado,
} from '@/domain/insumos/insumo-vinculo-sugestao';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import { insumoEstoqueService } from '@/lib/services/insumo-estoque-service';

export class InsumoVinculoLoteApplier {
  async aplicar(itens: InsumoVinculoLoteItem[]): Promise<InsumoVinculoLoteResultado> {
    let aplicados = 0;
    let pendenciasResolvidas = 0;
    const erros: InsumoVinculoLoteResultado['erros'] = [];

    for (const item of itens) {
      try {
        if (item.acao === 'ignorar') {
          for (const pendenciaId of item.pendenciaIds) {
            const pendencia = await insumoPendenciaRepository.findById(pendenciaId);
            if (!pendencia || pendencia.status !== 'pendente') continue;
            await insumoPendenciaRepository.marcarIgnorado(pendenciaId);
            pendenciasResolvidas += 1;
          }
          aplicados += 1;
          continue;
        }

        if (!item.insumoId || !item.fatorConversao || item.fatorConversao <= 0) {
          throw new Error('Insumo e fator de conversão são obrigatórios para vincular');
        }

        let integracao = await insumoMapeamentoRepository.findByEmpresaProduto(
          item.empresaId,
          item.omieIdProduto,
        );

        if (!integracao) {
          const primeiraPendencia = await insumoPendenciaRepository.findById(item.pendenciaIds[0]);
          integracao = await insumoMapeamentoRepository.create({
            empresaId: item.empresaId,
            omieIdProduto: item.omieIdProduto,
            omieCodigoProduto: primeiraPendencia?.omie_codigo_produto ?? null,
            insumoId: item.insumoId,
            fatorConversao: item.fatorConversao,
            descricaoOmie: primeiraPendencia?.descricao_produto,
          });
        }

        for (const pendenciaId of item.pendenciaIds) {
          const pendencia = await insumoPendenciaRepository.findById(pendenciaId);
          if (!pendencia || pendencia.status !== 'pendente') continue;

          const quantidadeEntrada = calcularQuantidadeEntrada(
            Number(pendencia.quantidade_nf),
            item.fatorConversao,
          );
          const custoUnitario = calcularCustoUnitarioEntrada(
            Number(pendencia.valor_total_item),
            quantidadeEntrada,
          );

          await insumoEstoqueService.registrarEntrada({
            insumoId: item.insumoId,
            empresaId: pendencia.empresa_id,
            quantidadeEntrada,
            custoUnitario,
            origem: 'resolucao_pendencia',
            omieNIdReceb: pendencia.omie_n_id_receb,
            omieNIdItem: pendencia.omie_n_id_item,
            omieWebhookEventoId: pendencia.omie_webhook_evento_id ?? undefined,
            pendenciaId: pendencia.id,
          });

          await insumoPendenciaRepository.marcarResolvido(pendencia.id, integracao.id);
          pendenciasResolvidas += 1;
        }

        aplicados += 1;
      } catch (error) {
        erros.push({
          omieIdProduto: item.omieIdProduto,
          mensagem: error instanceof Error ? error.message : 'Erro ao aplicar vínculo',
        });
      }
    }

    return { aplicados, pendenciasResolvidas, erros };
  }
}

export const insumoVinculoLoteApplier = new InsumoVinculoLoteApplier();
