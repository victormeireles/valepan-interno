'use server';

import { revalidatePath } from 'next/cache';
import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { insumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import { insumoEstoqueService } from '@/lib/services/insumo-estoque-service';

const REVALIDATE_PATH = '/estoque-insumos';

export type InsumoEstoqueDashboardData = {
  saldos: InsumoSaldoComDetalhes[];
  pendenciasCount: number;
  pendencias: InsumoPendenciaComEmpresa[];
};

export async function getInsumoEstoqueDashboard(): Promise<InsumoEstoqueDashboardData> {
  const [saldos, pendenciasCount, pendencias] = await Promise.all([
    insumoEstoqueRepository.listSaldosComDetalhes(),
    insumoPendenciaRepository.countPendentes(),
    insumoPendenciaRepository.listPendentes(),
  ]);

  return { saldos, pendenciasCount, pendencias };
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
