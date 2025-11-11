import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { SaidaSubmitPayload } from '@/domain/types/saidas';

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasQuantidadeValida(meta: SaidaSubmitPayload['itens'][number]['meta']): boolean {
  return (
    meta.caixas > 0 ||
    meta.pacotes > 0 ||
    meta.unidades > 0 ||
    meta.kg > 0
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SaidaSubmitPayload;

    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    if (!payload.cliente) {
      return NextResponse.json(
        { error: 'Cliente é obrigatório' },
        { status: 400 },
      );
    }

    if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
      return NextResponse.json(
        { error: 'Informe ao menos um produto' },
        { status: 400 },
      );
    }

    for (const item of payload.itens) {
      if (!item.produto) {
        return NextResponse.json(
          { error: 'Produto é obrigatório' },
          { status: 400 },
        );
      }

      if (!hasQuantidadeValida(item.meta)) {
        return NextResponse.json(
          { error: `Defina quantidades para ${item.produto}` },
          { status: 400 },
        );
      }
    }

    for (const item of payload.itens) {
      await saidasSheetManager.appendMeta({
        data: payload.data,
        cliente: payload.cliente,
        observacao: payload.observacao ?? '',
        produto: item.produto,
        meta: item.meta,
      });
    }

    return NextResponse.json({ message: 'Saídas registradas com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


