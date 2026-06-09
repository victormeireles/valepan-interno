import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { appendRow } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG, PedidoFornoPayload } from '@/config/forno';
import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

const productService = new SupabaseProductService();

type ProdutoAssadeiraFactorRow = {
  unidades_por_assadeira: number | null;
  assadeiras: { quantidade_latas: number | null } | null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PedidoFornoPayload;

    if (!payload || !isValidDateISO(payload.dataProducao)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }
    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      return NextResponse.json({ error: 'Inclua ao menos um item' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const now = new Date().toISOString();

    const supabase = supabaseClientFactory.createServiceRoleClient();
    for (const item of payload.itens) {
      if (!item.produto) continue;

      let latas = item.latas || 0;
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
          .select('unidades_por_assadeira, assadeiras(quantidade_latas)')
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
        const unidadesPorAssadeira = resolveUnidadesPorAssadeiraEfetiva({
          produto: factorData.unidades_por_assadeira,
          assadeira: factorData.assadeiras?.quantidade_latas,
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

        latas = item.assadeiras;
        unidades = derivado.unidades;
      }

      // Criar array com 29 elementos (A até AC), preenchendo com valores vazios onde necessário
      const values: (string | number)[] = new Array(29).fill('');
      values[0] = payload.dataProducao;  // A
      values[1] = item.produto;          // B
      values[2] = latas;                 // C
      values[3] = unidades;              // D
      values[4] = item.kg || 0;           // E
      values[5] = now;                    // F created_at
      values[6] = now;                    // G updated_at
      values[28] = item.observacao || ''; // AC observação
      await appendRow(spreadsheetId, tabName, values);
    }

    revalidatePath('/api/painel/forno');

    return NextResponse.json({ message: 'Pedido de produção salvo com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


