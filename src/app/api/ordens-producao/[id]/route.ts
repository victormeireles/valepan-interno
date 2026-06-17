import { NextResponse } from 'next/server';
import {
  ordemProducaoMetaService,
  EstoqueResolverError,
} from '@/lib/services/ordem-producao-meta-service';
import { extractCalendarDate } from '@/lib/utils/date-utils';

type OrdemProducaoUpdateBody = {
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao?: string;
  modoQuantidade: 'latas' | 'unidades';
  latas?: number;
  unidades?: number;
  assadeiraNome?: string;
};

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function normalizeCalendarDates(body: OrdemProducaoUpdateBody): OrdemProducaoUpdateBody | null {
  const dataProducao = extractCalendarDate(body.dataProducao);
  const dataEtiqueta = extractCalendarDate(body.dataEtiqueta);
  if (!dataProducao || !dataEtiqueta) return null;
  return { ...body, dataProducao, dataEtiqueta };
}

function validateUpdateBody(body: OrdemProducaoUpdateBody): string | null {
  if (!body) return 'Corpo da requisição inválido';
  const normalized = normalizeCalendarDates(body);
  if (!normalized || !isValidDateISO(normalized.dataProducao) || !isValidDateISO(normalized.dataEtiqueta)) {
    return 'Datas inválidas';
  }
  if (!body.tipoEstoque?.trim()) return 'Tipo de estoque é obrigatório';
  if (!body.produto?.trim()) return 'Produto é obrigatório';
  if (body.modoQuantidade !== 'latas' && body.modoQuantidade !== 'unidades') {
    return 'modoQuantidade inválido';
  }
  return null;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rawBody = (await request.json()) as OrdemProducaoUpdateBody;
    const validationError = validateUpdateBody(rawBody);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const body = normalizeCalendarDates(rawBody)!;

    try {
      await ordemProducaoMetaService.updateFromForm(id, {
        dataProducao: body.dataProducao,
        dataEtiqueta: body.dataEtiqueta,
        tipoEstoque: body.tipoEstoque,
        produto: body.produto,
        observacao: body.observacao?.trim() ?? '',
        modoQuantidade: body.modoQuantidade,
        latas: body.latas,
        unidades: body.unidades,
        assadeiraNome: body.assadeiraNome,
      });
      return NextResponse.json({ message: 'Ordem atualizada' });
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      const message = e instanceof Error ? e.message : 'Erro ao atualizar ordem';
      const status = message.includes('produzido') || message.includes('encontrado') ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    try {
      await ordemProducaoMetaService.delete(id);
      return new NextResponse(null, { status: 204 });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao excluir ordem';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
