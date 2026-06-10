import { NextResponse } from 'next/server';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';

const productService = new SupabaseProductService();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cliente = searchParams.get('cliente');
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
  }

  try {
    const tipo = await tiposEstoqueService.findByName(cliente.trim());
    if (!tipo) {
      return NextResponse.json({ items: [], observacao: '' });
    }

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: latestRow, error: latestError } = await supabase
      .from('ordens_producao')
      .select('data_producao')
      .eq('tipo_estoque_id', tipo.id)
      .order('data_producao', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      throw new Error(latestError.message);
    }

    const lastDate = latestRow?.data_producao;
    if (!lastDate) {
      return NextResponse.json({ items: [], observacao: '' });
    }

    const pedidos = await ordemProducaoRepository.listByDataProducao(lastDate);
    const lastOrderItems = pedidos.filter((p) => p.tipoEstoqueId === tipo.id);
    if (lastOrderItems.length === 0) {
      return NextResponse.json({ items: [], observacao: '' });
    }

    const produtoIds = [...new Set(lastOrderItems.map((p) => p.produtoId))];
    const produtos = await productService.findByIds(produtoIds);
    const produtoNomeById = new Map(produtos.map((p) => [p.id, p.nome]));

    const congeladoLabel = tipo.congelado ? ('Sim' as const) : ('Não' as const);

    const items = lastOrderItems.map((pedido) => {
      const q = pedido.quantidade;
      let unidade = '' as 'cx' | 'pct' | 'un' | 'kg' | '';
      let quantidade = 0;
      if (q.caixas > 0) {
        unidade = 'cx';
        quantidade = q.caixas;
      } else if (q.pacotes > 0) {
        unidade = 'pct';
        quantidade = q.pacotes;
      } else if (q.unidades > 0) {
        unidade = 'un';
        quantidade = q.unidades;
      } else if (q.kg > 0) {
        unidade = 'kg';
        quantidade = q.kg;
      }
      return {
        produto: produtoNomeById.get(pedido.produtoId) ?? '',
        congelado: congeladoLabel,
        unidade,
        quantidade,
      };
    });

    const observacao = lastOrderItems[0]?.observacao ?? '';

    return NextResponse.json({ items, observacao });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
