import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { appendRow, calculateLoteFromDataFabricacao } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG, PedidoEmbalagemPayload } from '@/config/embalagem';
import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import {
  pedidoEmbalagemService,
  EstoqueResolverError,
} from '@/lib/services/pedido-embalagem-service';

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

const productService = new SupabaseProductService();

type ProdutoAssadeiraFactorRow = {
  unidades_por_assadeira: number | null;
  assadeiras: { unidades_por_assadeira: number | null; ativo: boolean } | null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PedidoEmbalagemPayload;

    if (!payload || !isValidDateISO(payload.dataPedido) || !isValidDateISO(payload.dataFabricacao)) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    }
    if (!payload.cliente) {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
    }
    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      return NextResponse.json({ error: 'Inclua ao menos um item' }, { status: 400 });
    }

    try {
      await pedidoEmbalagemService.validatePayloadItems(
        payload.cliente,
        payload.itens.map((i) => i.produto),
      );
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // Calcular o lote baseado na data de fabricação
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const newLote = calculateLoteFromDataFabricacao(payload.dataFabricacao);

    // Persistir cada item como linha separada (regra 4: manter histórico)
    const now = new Date().toISOString();
    
    const supabase = supabaseClientFactory.createServiceRoleClient();
    for (const item of payload.itens) {
      let caixas = item.caixas || 0;
      let pacotes = item.pacotes || 0;
      let unidades = item.unidades || 0;

      if (item.assadeiras && item.assadeiras > 0 && item.assadeiraId) {
        const produto = await productService.findByName(item.produto);
        if (!produto) {
          return NextResponse.json(
            { error: `Produto não encontrado: ${item.produto}` },
            { status: 400 },
          );
        }

        const { data: factorRow, error: factorError } = await supabase
          .from('produto_assadeiras')
          .select('unidades_por_assadeira, assadeiras(unidades_por_assadeira, ativo)')
          .eq('produto_id', produto.id)
          .eq('assadeira_id', item.assadeiraId)
          .maybeSingle();

        if (factorError || !factorRow) {
          return NextResponse.json(
            { error: `Assadeira inválida para o produto ${item.produto}` },
            { status: 400 },
          );
        }

        const factorData = factorRow as ProdutoAssadeiraFactorRow;
        if (!factorData.assadeiras?.ativo) {
          return NextResponse.json(
            { error: `Assadeira inativa para o produto ${item.produto}` },
            { status: 400 },
          );
        }

        const unidadesPorAssadeira = resolveUnidadesPorAssadeiraEfetiva({
          produto: factorData.unidades_por_assadeira,
          assadeira: factorData.assadeiras?.unidades_por_assadeira,
        });

        if (!unidadesPorAssadeira) {
          return NextResponse.json(
            { error: `Fator de assadeira inválido para ${item.produto}` },
            { status: 400 },
          );
        }

        const derivado = deriveQuantidadesFromAssadeiras({
          assadeiras: item.assadeiras,
          unidadesPorAssadeira,
          boxUnits: produto.boxUnits,
        });
        caixas = derivado.caixas;
        pacotes = derivado.pacotes;
        unidades = derivado.unidades;
      }

      // Construir array de valores com todas as colunas até AB
      // A-J: dados básicos do pedido (0-9)
      // K-L: timestamps (10-11)
      // M-P: produção (12-15) - inicialmente vazio
      // Q: vazio ou outro (16)
      // R-Z: fotos (17-25) - inicialmente vazio
      // AA: Lote (26)
      // AB: Etiqueta Gerada (27) - inicialmente vazio
      
      const values = [
        payload.dataPedido,      // A (0)
        payload.dataFabricacao,  // B (1)
        payload.cliente,         // C (2)
        payload.observacao || '', // D (3)
        item.produto,            // E (4)
        item.congelado === true || item.congelado === 'Sim' ? 'Sim' : 'Não', // F (5)
        caixas,                  // G (6)
        pacotes,                 // H (7)
        unidades,                // I (8)
        item.kg || 0,            // J (9)
        now,                     // K (10) - created_at
        now,                     // L (11) - updated_at
        '',                      // M (12) - producao caixas
        '',                      // N (13) - producao pacotes
        '',                      // O (14) - producao unidades
        '',                      // P (15) - producao kg
        '',                      // Q (16) - vazio
        '', '', '', '', '', '', '', '', '', // R-Z (17-25) - fotos (vazio inicialmente)
        newLote,                 // AA (26) - Lote
        '',                      // AB (27) - Etiqueta Gerada (inicialmente vazio)
      ];
      await appendRow(spreadsheetId, tabName, values);
    }

    try {
      await pedidoEmbalagemService.reconcileForDate(payload.dataPedido);
    } catch (reconcileError) {
      const message =
        reconcileError instanceof Error
          ? reconcileError.message
          : 'Erro ao sincronizar pedido no banco';
      console.error('[embalagem-pedido] reconcile falhou:', message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    revalidatePath('/api/painel/embalagem');

    return NextResponse.json({ message: 'Pedido salvo com sucesso', lote: newLote });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


