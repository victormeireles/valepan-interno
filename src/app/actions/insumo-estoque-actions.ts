'use server';

import { revalidatePath } from 'next/cache';
import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import { insumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import { insumoEstoqueService } from '@/lib/services/insumo-estoque-service';
import { insumoVinculoLoteApplier } from '@/lib/services/insumo-vinculo-lote-applier';

const REVALIDATE_PATH = '/estoque-insumos';

export type InsumoEstoqueDashboardData = {
  saldos: InsumoSaldoComDetalhes[];
  pendenciasCount: number;
  pendencias: InsumoPendenciaComEmpresa[];
  vinculos: IntegracaoInsumoListItem[];
  vinculosCount: number;
};

export async function getInsumoEstoqueDashboard(): Promise<InsumoEstoqueDashboardData> {
  const [saldos, pendenciasCount, pendencias, vinculos, vinculosCount] = await Promise.all([
    insumoEstoqueRepository.listSaldosComDetalhes(),
    insumoPendenciaRepository.countPendentes(),
    insumoPendenciaRepository.listPendentes(),
    insumoMapeamentoRepository.listAtivosComDetalhes(),
    insumoMapeamentoRepository.countAtivos(),
  ]);

  return { saldos, pendenciasCount, pendencias, vinculos, vinculosCount };
}

export async function getInsumoMovimentos(insumoId: string) {
  return insumoEstoqueRepository.listMovimentos(insumoId);
}

export async function getInsumoPendencias() {
  return insumoPendenciaRepository.listPendentes();
}

export async function ajustarInsumoSaldo(
  insumoId: string,
  novoSaldo: number,
  observacao: string,
) {
  try {
    if (!observacao.trim()) {
      return { success: false as const, error: 'Observação é obrigatória' };
    }

    if (novoSaldo < 0) {
      return { success: false as const, error: 'Saldo não pode ser negativo' };
    }

    await insumoEstoqueService.ajustarSaldo({
      insumoId,
      novoSaldo,
      observacao: observacao.trim(),
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao ajustar saldo';
    console.error('Erro ao ajustar saldo de insumo:', error);
    return { success: false as const, error: message };
  }
}

export async function resolverInsumoPendencia(
  pendenciaId: string,
  insumoId: string,
  fatorConversao: number,
) {
  try {
    if (!insumoId) {
      return { success: false as const, error: 'Insumo é obrigatório' };
    }

    if (fatorConversao <= 0) {
      return {
        success: false as const,
        error: 'Fator de conversão deve ser maior que zero',
      };
    }

    const pendencia = await insumoPendenciaRepository.findById(pendenciaId);
    if (!pendencia) {
      return { success: false as const, error: 'Pendência não encontrada' };
    }

    if (pendencia.status !== 'pendente') {
      return { success: false as const, error: 'Pendência já foi tratada' };
    }

    const integracao = await insumoMapeamentoRepository.create({
      empresaId: pendencia.empresa_id,
      omieIdProduto: pendencia.omie_id_produto,
      omieCodigoProduto: pendencia.omie_codigo_produto,
      insumoId,
      fatorConversao,
      descricaoOmie: pendencia.descricao_produto,
    });

    const quantidadeEntrada = calcularQuantidadeEntrada(
      Number(pendencia.quantidade_nf),
      fatorConversao,
    );
    const custoUnitario = calcularCustoUnitarioEntrada(
      Number(pendencia.valor_total_item),
      quantidadeEntrada,
    );

    await insumoEstoqueService.registrarEntrada({
      insumoId,
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
    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao resolver pendência';
    console.error('Erro ao resolver pendência de insumo:', error);
    return { success: false as const, error: message };
  }
}

export async function resolverInsumoPendenciaGrupo(
  pendenciaIds: string[],
  insumoId: string,
  fatorConversao: number,
) {
  try {
    const ids = [...new Set(pendenciaIds.filter(Boolean))];
    if (ids.length === 0) {
      return { success: false as const, error: 'Nenhuma pendência selecionada' };
    }

    if (!insumoId) {
      return { success: false as const, error: 'Insumo é obrigatório' };
    }

    if (fatorConversao <= 0) {
      return {
        success: false as const,
        error: 'Fator de conversão deve ser maior que zero',
      };
    }

    const primeira = await insumoPendenciaRepository.findById(ids[0]);
    if (!primeira) {
      return { success: false as const, error: 'Pendência não encontrada' };
    }

    const resultado = await insumoVinculoLoteApplier.aplicar([
      {
        empresaId: primeira.empresa_id,
        omieIdProduto: primeira.omie_id_produto,
        acao: 'vincular',
        insumoId,
        fatorConversao,
        pendenciaIds: ids,
      },
    ]);

    if (resultado.erros.length > 0) {
      return { success: false as const, error: resultado.erros[0]?.mensagem ?? 'Erro ao vincular' };
    }

    revalidatePath(REVALIDATE_PATH);
    return {
      success: true as const,
      resolvidas: resultado.pendenciasResolvidas,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao resolver pendências do produto';
    console.error('Erro ao resolver grupo de pendências:', error);
    return { success: false as const, error: message };
  }
}

export async function ignorarInsumoPendencia(pendenciaId: string) {
  try {
    await insumoPendenciaRepository.marcarIgnorado(pendenciaId);
    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao ignorar pendência';
    console.error('Erro ao ignorar pendência de insumo:', error);
    return { success: false as const, error: message };
  }
}

export async function ignorarInsumoPendenciasEmLote(pendenciaIds: string[]) {
  try {
    const ids = [...new Set(pendenciaIds.filter(Boolean))];
    if (ids.length === 0) {
      return { success: false as const, error: 'Nenhuma pendência selecionada' };
    }

    let ignoradas = 0;
    const erros: string[] = [];

    for (const id of ids) {
      try {
        const pendencia = await insumoPendenciaRepository.findById(id);
        if (!pendencia || pendencia.status !== 'pendente') continue;
        await insumoPendenciaRepository.marcarIgnorado(id);
        ignoradas += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao ignorar';
        erros.push(message);
      }
    }

    if (ignoradas === 0) {
      return {
        success: false as const,
        error: erros[0] ?? 'Nenhuma pendência pôde ser ignorada',
      };
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const, ignoradas, erros };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao ignorar pendências';
    console.error('Erro ao ignorar pendências em lote:', error);
    return { success: false as const, error: message };
  }
}

export async function atualizarIntegracaoInsumoVinculo(
  integracaoId: string,
  insumoId: string,
  fatorConversao: number,
) {
  try {
    if (!integracaoId) {
      return { success: false as const, error: 'Vínculo não informado' };
    }

    if (!insumoId) {
      return { success: false as const, error: 'Insumo é obrigatório' };
    }

    if (fatorConversao <= 0) {
      return {
        success: false as const,
        error: 'Fator de conversão deve ser maior que zero',
      };
    }

    const integracao = await insumoMapeamentoRepository.findById(integracaoId);
    if (!integracao || !integracao.ativo) {
      return { success: false as const, error: 'Vínculo não encontrado' };
    }

    await insumoMapeamentoRepository.update(integracaoId, {
      insumoId,
      fatorConversao,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao atualizar vínculo';
    console.error('Erro ao atualizar vínculo de insumo:', error);
    return { success: false as const, error: message };
  }
}

export async function excluirIntegracaoInsumoVinculo(integracaoId: string) {
  try {
    if (!integracaoId) {
      return { success: false as const, error: 'Vínculo não informado' };
    }

    const integracao = await insumoMapeamentoRepository.findById(integracaoId);
    if (!integracao || !integracao.ativo) {
      return { success: false as const, error: 'Vínculo não encontrado' };
    }

    await insumoMapeamentoRepository.desativar(integracaoId);
    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao excluir vínculo';
    console.error('Erro ao excluir vínculo de insumo:', error);
    return { success: false as const, error: message };
  }
}
