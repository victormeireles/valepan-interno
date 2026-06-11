import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { apiKeyAuthService } from '@/lib/services/api-key-auth-service';
import { SaidaQuantidade } from '@/domain/types/saidas';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasQuantidadeValida(quantidade: SaidaQuantidade): boolean {
  return (
    (quantidade.caixas || 0) > 0 ||
    (quantidade.pacotes || 0) > 0 ||
    (quantidade.unidades || 0) > 0 ||
    (quantidade.kg || 0) > 0
  );
}

interface DeleteSaidaPayload {
  data: string;
  cliente: string;
  produto: string;
  quantidade: SaidaQuantidade;
}

export async function DELETE(request: Request) {
  try {
    if (!apiKeyAuthService.validateRequest(request)) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça uma API key válida no header Authorization ou X-API-Key' },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as DeleteSaidaPayload;

    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json(
        { error: 'Data inválida. Use o formato YYYY-MM-DD' },
        { status: 400 },
      );
    }

    if (!payload.cliente || !payload.produto) {
      return NextResponse.json(
        { error: 'Cliente e produto são obrigatórios' },
        { status: 400 },
      );
    }

    if (!payload.quantidade || !hasQuantidadeValida(payload.quantidade)) {
      return NextResponse.json(
        { error: 'Quantidade é obrigatória e deve ter ao menos um valor > 0' },
        { status: 400 },
      );
    }

    const matches = await saidaMovimentoService.findMatching({
      data: payload.data,
      cliente: payload.cliente,
      produto: payload.produto,
      quantidade: payload.quantidade,
    });

    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'Saída não encontrada com os critérios fornecidos' },
        { status: 404 },
      );
    }

    if (matches.length > 1) {
      return NextResponse.json(
        {
          error: 'Múltiplas saídas encontradas com os critérios fornecidos. Use critérios mais específicos ou forneça o id.',
          encontradas: matches.length,
        },
        { status: 409 },
      );
    }

    await saidaMovimentoService.estornarSaida(matches[0].id);

    revalidatePath('/api/painel/estoque');

    return NextResponse.json(
      {
        success: true,
        message: 'Saída estornada com sucesso',
        data: {
          id: matches[0].id,
          cliente: matches[0].cliente,
          produto: matches[0].produto,
          data: matches[0].data,
          estoqueCreditado: true,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API Public Saidas Delete] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
