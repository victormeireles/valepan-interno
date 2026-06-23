import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { estoqueRepository } from '@/data/estoque/EstoqueRepository';
import { loteTemQuantidadeProduzida } from '@/domain/embalagem/embalagem-lote-exclusao';
import { derivarUnidadePrincipal } from '@/domain/embalagem/painel-quantidade';
import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import type {
  EmbalagemLoteFotos,
  EmbalagemLoteInsert,
  EmbalagemLoteRecord,
} from '@/domain/types/embalagem-lote';
import type { Quantidade } from '@/domain/types/inventario';
import type { EtapaProducaoSlug } from '@/domain/types/ordem-producao-etapa';
import { EstoqueResolverError } from '@/lib/services/estoque-resolver-service';
import { etapaFinalizacaoService } from '@/lib/services/etapa-finalizacao-service';
import { estoqueService } from '@/lib/services/estoque-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';

export { EstoqueResolverError };

const ETAPA: EtapaProducaoSlug = 'embalagem';

export type CriarLotePorPedidoInput = {
  pedidoEmbalagemId: string;
  clienteNome: string;
  produtoNome: string;
  quantidade: Quantidade;
  produzidoEm?: string;
  obsEmbalagem?: string;
  fotos?: EmbalagemLoteFotos;
  continuaProduzindo?: boolean;
};

async function totalProduzidoScalarEmbalagem(pedidoId: string): Promise<number> {
  const produzido = await embalagemLoteRepository.sumQuantidadeByPedidoId(pedidoId);
  return derivarUnidadePrincipal(produzido).valor;
}

async function aplicarFinalizacaoEmbalagemAposSalvar(
  pedidoId: string,
  continuaProduzindo: boolean | undefined,
): Promise<void> {
  const totalProduzidoEtapa = await totalProduzidoScalarEmbalagem(pedidoId);

  await etapaFinalizacaoService.aplicarAposSalvarLote({
    ordemId: pedidoId,
    etapa: ETAPA,
    continuaProduzindo: continuaProduzindo ?? true,
    totalProduzidoEtapa,
  });
}

function validarQuantidadePositiva(q: Quantidade): void {
  if (q.caixas + q.pacotes + q.unidades + Number(q.kg) <= 0) {
    throw new Error('Informe ao menos uma quantidade maior que zero (cx, pct, un ou kg).');
  }
}

export class EmbalagemLoteService {
  async criarLote(input: EmbalagemLoteInsert): Promise<EmbalagemLoteRecord> {
    return embalagemLoteRepository.insert(input);
  }

  async criarLotePorPedidoEmbalagem(
    input: CriarLotePorPedidoInput,
  ): Promise<EmbalagemLoteRecord> {
    const pedido = await pedidoEmbalagemRepository.findById(input.pedidoEmbalagemId);
    if (!pedido) {
      throw new Error('Pedido de embalagem não encontrado');
    }

    const q = {
      caixas: input.quantidade.caixas,
      pacotes: input.quantidade.pacotes,
      unidades: input.quantidade.unidades,
      kg: input.quantidade.kg,
    };

    validarQuantidadePositiva(q);

    etapaFinalizacaoService.assertEtapaNaoFinalizada(pedido, ETAPA);

    const produzidoEm = input.produzidoEm ?? new Date().toISOString();

    const lote = await this.criarLote({
      modo: 'parcial',
      pedidoEmbalagemId: pedido.id,
      dataPedido: pedido.dataProducao,
      dataFabricacao: pedido.dataFabricacaoEtiqueta,
      tipoEstoqueId: pedido.tipoEstoqueId,
      produtoId: pedido.produtoId,
      congelado: 'Não',
      lote: null,
      quantidade: q,
      produzidoEm,
      obsEmbalagem: input.obsEmbalagem ?? null,
      fotos: input.fotos,
    });

    await aplicarFinalizacaoEmbalagemAposSalvar(pedido.id, input.continuaProduzindo);

    return lote;
  }

  async atualizarLote(
    loteId: string,
    input: {
      quantidade: Quantidade;
      obsEmbalagem?: string;
      fotos?: EmbalagemLoteFotos;
      continuaProduzindo?: boolean;
    },
  ): Promise<EmbalagemLoteRecord> {
    const existing = await embalagemLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }

    if (!existing.pedidoEmbalagemId) {
      throw new Error('Pedido de embalagem não encontrado');
    }

    const pedido = await pedidoEmbalagemRepository.findById(existing.pedidoEmbalagemId);
    if (!pedido) {
      throw new Error('Pedido de embalagem não encontrado');
    }

    etapaFinalizacaoService.assertEtapaNaoFinalizada(pedido, ETAPA);

    const productService = new SupabaseProductService();
    validarQuantidadePositiva(input.quantidade);

    const [tipo, produto] = await Promise.all([
      tiposEstoqueService.findById(existing.tipoEstoqueId),
      productService.findById(existing.produtoId),
    ]);

    if (!tipo || !produto) {
      throw new Error('Cliente ou produto não encontrado');
    }

    const anterior = existing.quantidade;
    const novo = input.quantidade;
    const fotos = input.fotos
      ? { ...existing.fotos, ...input.fotos }
      : existing.fotos;

    const updated = await embalagemLoteRepository.updateById(loteId, {
      quantidade: novo,
      obsEmbalagem: input.obsEmbalagem ?? existing.obsEmbalagem ?? null,
      fotos,
      produzidoEm: new Date().toISOString(),
    });

    const delta = {
      caixas: novo.caixas - anterior.caixas,
      pacotes: novo.pacotes - anterior.pacotes,
      unidades: novo.unidades - anterior.unidades,
      kg: novo.kg - anterior.kg,
    };
    const houveMudanca =
      delta.caixas !== 0 ||
      delta.pacotes !== 0 ||
      delta.unidades !== 0 ||
      delta.kg !== 0;

    if (houveMudanca) {
      const clienteEstoque =
        (await estoqueService.obterTipoEstoqueCliente(tipo.nome)) ?? tipo.nome;
      await estoqueService.aplicarDelta({
        cliente: clienteEstoque,
        produto: produto.nome,
        delta,
        origem: 'embalagem',
        embalagemLoteId: loteId,
      });
    }

    await aplicarFinalizacaoEmbalagemAposSalvar(pedido.id, input.continuaProduzindo);

    return updated;
  }

  async syncFotosFromLoteId(loteId: string, fotos: EmbalagemLoteFotos): Promise<void> {
    const existing = await embalagemLoteRepository.findById(loteId);
    if (!existing) {
      throw new Error('Lote não encontrado');
    }
    await embalagemLoteRepository.updateFotosById(loteId, { ...existing.fotos, ...fotos });
  }

  async compensarLote(loteId: string): Promise<void> {
    await embalagemLoteRepository.deleteById(loteId);
  }

  async excluirLote(loteId: string): Promise<void> {
    const lote = await embalagemLoteRepository.findById(loteId);
    if (!lote) {
      throw new Error('Lote não encontrado');
    }

    const q = lote.quantidade;
    const productService = new SupabaseProductService();
    const [tipo, produto] = await Promise.all([
      tiposEstoqueService.findById(lote.tipoEstoqueId),
      productService.findById(lote.produtoId),
    ]);

    if (!tipo || !produto) {
      throw new Error('Cliente ou produto não encontrado');
    }

    if (loteTemQuantidadeProduzida(q)) {
      await saidaMovimentoService.registrarSaida({
        data: lote.dataPedido,
        cliente: tipo.nome,
        produto: produto.nome,
        quantidade: { ...q },
      });
    }

    await estoqueRepository.clearEmbalagemLoteId(loteId);
    await embalagemLoteRepository.deleteById(loteId);
  }
}

export const embalagemLoteService = new EmbalagemLoteService();
