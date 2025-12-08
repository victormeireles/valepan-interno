'use server';

import { z } from 'zod';
import { estoqueService } from '@/lib/services/estoque-service';
import { clientesService } from '@/lib/services/clientes-service';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { Quantidade } from '@/domain/types/inventario';

const quantidadeSchema = z.object({
  caixas: z.coerce.number().min(0),
  pacotes: z.coerce.number().min(0),
  unidades: z.coerce.number().min(0),
  kg: z.coerce.number().min(0),
});

const adjustStockSchema = z.object({
  estoqueNome: z.string().min(1),
  produto: z.string().min(1),
  quantidade: quantidadeSchema,
});

const registerOutflowSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clienteDestino: z.string().min(1),
  produto: z.string().min(1),
  quantidade: quantidadeSchema.refine(
    (value) =>
      value.caixas > 0 ||
      value.pacotes > 0 ||
      value.unidades > 0 ||
      value.kg > 0,
    'Informe ao menos uma quantidade',
  ),
  observacao: z.string().optional(),
  estoqueOrigem: z.string().optional(),
  skipNotification: z.boolean().optional(),
});

const stockLocationSchema = z.object({
  estoqueNome: z.string().min(1),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type RegisterOutflowInput = z.infer<typeof registerOutflowSchema>;

export async function adjustStockAction(input: AdjustStockInput) {
  const payload = adjustStockSchema.parse(input);
  const estoqueAtual = await estoqueService.obterEstoqueCliente(
    payload.estoqueNome,
  );
  const produtoNormalizado = payload.produto.trim();
  const registroAtual = estoqueAtual.find(
    (record) => record.produto.trim() === produtoNormalizado,
  );
  const quantidadeAtual = registroAtual?.quantidade ?? criarQuantidadeZerada();

  const delta = calcularDelta(quantidadeAtual, payload.quantidade);
  const atualizado = await estoqueService.aplicarDelta({
    cliente: payload.estoqueNome,
    produto: produtoNormalizado,
    delta,
  });

  return { success: true, record: atualizado };
}

export async function registerOutflowAction(input: RegisterOutflowInput) {
  const payload = registerOutflowSchema.parse(input);

  await saidasSheetManager.appendNovaSaida({
    data: payload.data,
    cliente: payload.clienteDestino,
    produto: payload.produto,
    observacao: payload.observacao,
    meta: payload.quantidade,
    skipNotification: payload.skipNotification,
  });

  const estoqueDoCliente = await estoqueService.obterTipoEstoqueCliente(
    payload.clienteDestino,
  );
  const estoqueOrigem =
    payload.estoqueOrigem ??
    estoqueDoCliente ??
    payload.clienteDestino;

  await estoqueService.aplicarDelta({
    cliente: estoqueOrigem,
    produto: payload.produto,
    delta: {
      caixas: -(payload.quantidade.caixas || 0),
      pacotes: -(payload.quantidade.pacotes || 0),
      unidades: -(payload.quantidade.unidades || 0),
      kg: -(payload.quantidade.kg || 0),
    },
    allowNegative: true, // Permitir estoque negativo para saídas do dashboard
  });

  if (!payload.skipNotification) {
    await whatsAppNotificationService.notifySaidasProduction({
      produto: payload.produto,
      cliente: payload.clienteDestino,
      meta: payload.quantidade,
      realizado: payload.quantidade,
      data: payload.data,
      observacao: payload.observacao,
      origem: 'criada',
    });
  }

  return { success: true };
}

export async function getClientsForStockLocationAction(
  estoqueNome: string,
) {
  const { estoqueNome: nomeValidado } = stockLocationSchema.parse({
    estoqueNome,
  });
  const clientes = await clientesService.findByStockTypeNameWithAddresses(nomeValidado);
  return clientes;
}

const createStockSchema = z.object({
  estoqueNome: z.string().min(1),
  produto: z.string().min(1),
  quantidade: quantidadeSchema.refine(
    (value) =>
      value.caixas > 0 ||
      value.pacotes > 0 ||
      value.unidades > 0 ||
      value.kg > 0,
    'Informe ao menos uma quantidade',
  ),
  action: z.enum(['add', 'replace']),
});

export type CreateStockInput = z.infer<typeof createStockSchema>;

export async function checkStockExistsAction(
  estoqueNome: string,
  produto: string,
) {
  const estoqueAtual = await estoqueService.obterEstoqueCliente(estoqueNome);
  const produtoNormalizado = produto.trim();
  const registroAtual = estoqueAtual.find(
    (record) => record.produto.trim() === produtoNormalizado,
  );

  return {
    exists: !!registroAtual,
    currentQuantity: registroAtual?.quantidade ?? null,
  };
}

export async function createStockAction(input: CreateStockInput) {
  const payload = createStockSchema.parse(input);
  const estoqueAtual = await estoqueService.obterEstoqueCliente(
    payload.estoqueNome,
  );
  const produtoNormalizado = payload.produto.trim();
  const registroAtual = estoqueAtual.find(
    (record) => record.produto.trim() === produtoNormalizado,
  );

  let novaQuantidade: Quantidade;

  if (payload.action === 'add' && registroAtual) {
    // Somar com o estoque existente
    const quantidadeAtual = registroAtual.quantidade;
    novaQuantidade = {
      caixas: quantidadeAtual.caixas + payload.quantidade.caixas,
      pacotes: quantidadeAtual.pacotes + payload.quantidade.pacotes,
      unidades: quantidadeAtual.unidades + payload.quantidade.unidades,
      kg: parseFloat(
        (quantidadeAtual.kg + payload.quantidade.kg).toFixed(3),
      ),
    };
  } else {
    // Substituir ou criar novo
    novaQuantidade = payload.quantidade;
  }

  const atualizado = await estoqueService.aplicarDelta({
    cliente: payload.estoqueNome,
    produto: produtoNormalizado,
    delta:
      payload.action === 'add' && registroAtual
        ? {
            caixas: payload.quantidade.caixas,
            pacotes: payload.quantidade.pacotes,
            unidades: payload.quantidade.unidades,
            kg: payload.quantidade.kg,
          }
        : {
            caixas: novaQuantidade.caixas - (registroAtual?.quantidade.caixas ?? 0),
            pacotes: novaQuantidade.pacotes - (registroAtual?.quantidade.pacotes ?? 0),
            unidades: novaQuantidade.unidades - (registroAtual?.quantidade.unidades ?? 0),
            kg: parseFloat(
              (novaQuantidade.kg - (registroAtual?.quantidade.kg ?? 0)).toFixed(3),
            ),
          },
  });

  return { success: true, record: atualizado };
}

function criarQuantidadeZerada(): Quantidade {
  return { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
}

function calcularDelta(
  atual: Quantidade,
  novo: Quantidade,
): Quantidade {
  const deltaKg = parseFloat((novo.kg - (atual.kg || 0)).toFixed(3));
  return {
    caixas: novo.caixas - (atual.caixas || 0),
    pacotes: novo.pacotes - (atual.pacotes || 0),
    unidades: novo.unidades - (atual.unidades || 0),
    kg: deltaKg,
  };
}

export async function getStockTypesAction() {
  try {
    const tipos = await tiposEstoqueService.listTiposEstoque();
    return tipos.map((t) => ({ nome: t.nome }));
  } catch (error) {
    throw error;
  }
}

export async function getProductsAction() {
  const productService = new SupabaseProductService();
  try {
    const produtos = await productService.listProducts();
    return produtos.map((p) => ({ nome: p.nome }));
  } catch (error) {
    throw error;
  }
}


