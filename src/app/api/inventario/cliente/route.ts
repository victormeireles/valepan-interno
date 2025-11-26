import { NextRequest, NextResponse } from 'next/server';
import { estoqueService } from '@/lib/services/estoque-service';

const HTTP_BAD_REQUEST = 400;

export async function GET(request: NextRequest) {
  try {
    const cliente = request.nextUrl.searchParams.get('cliente');
    if (!cliente) {
      return NextResponse.json(
        { error: 'Tipo de estoque é obrigatório' },
        { status: HTTP_BAD_REQUEST },
      );
    }

    const estoque = await estoqueService.obterEstoqueCliente(cliente);
    return NextResponse.json({ estoque });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao carregar estoque';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


