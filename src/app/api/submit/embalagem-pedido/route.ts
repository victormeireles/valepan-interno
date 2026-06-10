import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { calculateLoteFromDataFabricacao } from '@/lib/googleSheets';
import { PedidoEmbalagemPayload } from '@/config/embalagem';
import {
  ordemProducaoMetaService,
  EstoqueResolverError,
} from '@/lib/services/ordem-producao-meta-service';

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

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
      for (const item of payload.itens) {
        const observacao = item.observacao?.trim() || payload.observacao?.trim() || '';

        if (item.assadeiras && item.assadeiras > 0) {
          await ordemProducaoMetaService.createFromLatas({
            dataProducao: payload.dataPedido,
            dataEtiqueta: payload.dataFabricacao,
            tipoEstoque: payload.cliente,
            produto: item.produto,
            latas: item.assadeiras,
            observacao,
          });
        } else {
          await ordemProducaoMetaService.createFromQuantidade({
            dataProducao: payload.dataPedido,
            dataEtiqueta: payload.dataFabricacao,
            tipoEstoque: payload.cliente,
            produto: item.produto,
            observacao,
            quantidade: {
              caixas: item.caixas || 0,
              pacotes: item.pacotes || 0,
              unidades: item.unidades || 0,
              kg: item.kg || 0,
            },
          });
        }
      }
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    revalidatePath('/api/painel/embalagem');

    const newLote = calculateLoteFromDataFabricacao(payload.dataFabricacao);
    return NextResponse.json({ message: 'Pedido salvo com sucesso', lote: newLote });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
