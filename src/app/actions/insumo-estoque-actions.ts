'use server';

import { revalidatePath } from 'next/cache';
import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import { resolverFatorConversaoEntrada } from '@/domain/insumos/insumo-entrada-fator';
import {
  isPendenciaIgnoravel,
  isPendenciaRestauravel,
  isPendenciaVinculavel,
} from '@/domain/insumos/insumo-pendencia-acao';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import { enrichIntegracaoInsumosComFornecedor } from '@/domain/insumos/insumo-vinculo-fornecedor';
import {
  groupPendenciasPorProduto,
  prepararGruposParaCliente,
  type InsumoPendenciaProdutoGrupo,
} from '@/domain/insumos/insumo-pendencia-grupo';
import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';
import { insumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import { insumoEstoqueService } from '@/lib/services/insumo-estoque-service';
import { insumoVinculoLoteApplier } from '@/lib/services/insumo-vinculo-lote-applier';
import { insumoEntradaFatorRecalcIntegracaoService } from '@/lib/services/insumo-entrada-fator-recalc-integracao-service';

const REVALIDATE_PATHS = ['/estoque-insumos', '/mapeamento-insumos'] as const;

function revalidateInsumoPages() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export type InsumoSaldosPageData = {
  saldos: InsumoSaldoComDetalhes[];
  pendenciasCount: number;
};

export type InsumoMapeamentoPageData = {
  pendenciaGrupos: InsumoPendenciaProdutoGrupo[];
  ignoradaGrupos: InsumoPendenciaProdutoGrupo[];
  pendenciasCount: number;
  ignoradasCount: number;
  vinculos: IntegracaoInsumoListItem[];
};

export type InsumoEstoqueDashboardData = InsumoSaldosPageData & InsumoMapeamentoPageData;

export async function getInsumoSaldosPageData(): Promise<InsumoSaldosPageData> {
  const [saldos, pendenciasCount] = await Promise.all([
    insumoEstoqueRepository.listSaldosComDetalhes(),
    insumoPendenciaRepository.countPendentes(),
  ]);

  return { saldos, pendenciasCount };
}

export async function getInsumoMapeamentoPageData(): Promise<InsumoMapeamentoPageData> {
  const [pendencias, ignoradas, vinculosBase, pendenciasParaVinculos] = await Promise.all([
    insumoPendenciaRepository.listPendentes(),
    insumoPendenciaRepository.listIgnoradas(),
    insumoMapeamentoRepository.listAtivosComDetalhes(),
    insumoPendenciaRepository.listComFornecedorParaVinculos(),
  ]);

  const pendenciaGrupos = prepararGruposParaCliente(groupPendenciasPorProduto(pendencias));
  const ignoradaGrupos = prepararGruposParaCliente(groupPendenciasPorProduto(ignoradas));
  const vinculos = enrichIntegracaoInsumosComFornecedor(vinculosBase, pendenciasParaVinculos);

  return {
    pendenciaGrupos,
    ignoradaGrupos,
    pendenciasCount: pendencias.length,
    ignoradasCount: ignoradas.length,
    vinculos,
  };
}

export async function getIntegracaoInsumoPorProdutoOmie(input: {
  empresaId: string;
  omieIdProduto: number;
}) {
  const integracao = await insumoMapeamentoRepository.findByEmpresaProduto(
    input.empresaId,
    input.omieIdProduto,
  );

  if (!integracao) {
    return null;
  }

  return {
    insumoId: integracao.insumo_id,
    fatorConversao: Number(integracao.fator_conversao),
  };
}

export async function getInsumoPendenciasPorProdutoOmie(input: {
  empresaId: string;
  omieIdProduto: number;
  statuses: InsumoPendenciaStatus[];
}): Promise<InsumoPendenciaComEmpresa[]> {
  return insumoPendenciaRepository.listPorProdutoOmie(input);
}

export async function getInsumoEstoqueDashboard(): Promise<InsumoEstoqueDashboardData> {
  const [saldosPage, mapeamentoPage] = await Promise.all([
    getInsumoSaldosPageData(),
    getInsumoMapeamentoPageData(),
  ]);

  return { ...saldosPage, ...mapeamentoPage };
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

    revalidateInsumoPages();
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

    if (!isPendenciaVinculavel(pendencia.status)) {
      return { success: false as const, error: 'Pendência já foi tratada' };
    }

    const integracaoExistente = await insumoMapeamentoRepository.findByEmpresaProduto(
      pendencia.empresa_id,
      pendencia.omie_id_produto,
    );

    const integracao =
      integracaoExistente ??
      (await insumoMapeamentoRepository.create({
        empresaId: pendencia.empresa_id,
        omieIdProduto: pendencia.omie_id_produto,
        omieCodigoProduto: pendencia.omie_codigo_produto,
        insumoId,
        fatorConversao,
        descricaoOmie: pendencia.descricao_produto,
      }));

    const fatorEfetivo = resolverFatorConversaoEntrada(
      fatorConversao,
      Number(integracao.fator_conversao),
    );

    const quantidadeEntrada = calcularQuantidadeEntrada(
      Number(pendencia.quantidade_nf),
      fatorEfetivo,
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
      numeroNf: pendencia.numero_nf,
    });

    await insumoPendenciaRepository.marcarResolvido(pendencia.id, integracao.id);
    revalidateInsumoPages();
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

    revalidateInsumoPages();
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
    revalidateInsumoPages();
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
        if (!pendencia || !isPendenciaIgnoravel(pendencia.status)) continue;
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

    revalidateInsumoPages();
    return { success: true as const, ignoradas, erros };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao ignorar pendências';
    console.error('Erro ao ignorar pendências em lote:', error);
    return { success: false as const, error: message };
  }
}

export async function restaurarInsumoPendenciasEmLote(pendenciaIds: string[]) {
  try {
    const ids = [...new Set(pendenciaIds.filter(Boolean))];
    if (ids.length === 0) {
      return { success: false as const, error: 'Nenhuma pendência selecionada' };
    }

    let restauradas = 0;
    const erros: string[] = [];

    for (const id of ids) {
      try {
        const pendencia = await insumoPendenciaRepository.findById(id);
        if (!pendencia || !isPendenciaRestauravel(pendencia.status)) continue;
        await insumoPendenciaRepository.marcarPendente(id);
        restauradas += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao restaurar';
        erros.push(message);
      }
    }

    if (restauradas === 0) {
      return {
        success: false as const,
        error: erros[0] ?? 'Nenhuma pendência pôde ser restaurada',
      };
    }

    revalidateInsumoPages();
    return { success: true as const, restauradas, erros };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao restaurar pendências';
    console.error('Erro ao restaurar pendências em lote:', error);
    return { success: false as const, error: message };
  }
}

export async function previewRecalcEntradasVinculo(
  integracaoId: string,
  fatorConversao: number,
) {
  try {
    if (!integracaoId) {
      return { success: false as const, error: 'Vínculo não informado' };
    }

    if (fatorConversao <= 0) {
      return {
        success: false as const,
        error: 'Fator de conversão deve ser maior que zero',
      };
    }

    const preview = await insumoEntradaFatorRecalcIntegracaoService.previewPorIntegracao(
      integracaoId,
      fatorConversao,
    );

    return { success: true as const, preview };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao simular recálculo';
    console.error('Erro ao simular recálculo de entradas:', error);
    return { success: false as const, error: message };
  }
}

export async function atualizarIntegracaoInsumoVinculo(
  integracaoId: string,
  insumoId: string,
  fatorConversao: number,
  options?: { recalcularEntradasAnteriores?: boolean },
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

    const insumoMudou = integracao.insumo_id !== insumoId;
    const fatorMudou = Number(integracao.fator_conversao) !== fatorConversao;
    const recalcular =
      Boolean(options?.recalcularEntradasAnteriores) && fatorMudou && !insumoMudou;

    await insumoMapeamentoRepository.update(integracaoId, {
      insumoId,
      fatorConversao,
    });

    let recalcResult = null;
    if (recalcular) {
      recalcResult = await insumoEntradaFatorRecalcIntegracaoService.executarPorIntegracao(
        integracaoId,
        fatorConversao,
      );
    }

    revalidateInsumoPages();
    return { success: true as const, recalcResult };
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
    revalidateInsumoPages();
    return { success: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao excluir vínculo';
    console.error('Erro ao excluir vínculo de insumo:', error);
    return { success: false as const, error: message };
  }
}
