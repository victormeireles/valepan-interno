import { NextResponse } from 'next/server';
import {
  ordemProducaoMetaService,
  EstoqueResolverError,
} from '@/lib/services/ordem-producao-meta-service';
import { ordensProducaoPainelService } from '@/lib/services/ordens-producao-painel-service';
import { extractCalendarDate } from '@/lib/utils/date-utils';

type OrdemProducaoCreateBody = {
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

function normalizeCalendarDates(body: OrdemProducaoCreateBody): OrdemProducaoCreateBody | null {
  const dataProducao = extractCalendarDate(body.dataProducao);
  const dataEtiqueta = extractCalendarDate(body.dataEtiqueta);
  if (!dataProducao || !dataEtiqueta) return null;
  return { ...body, dataProducao, dataEtiqueta };
}

function validateCreateBody(body: OrdemProducaoCreateBody): string | null {
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

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get('date') ?? '';
    if (!isValidDateISO(date)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    const data = await ordensProducaoPainelService.getListForDate(date);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as OrdemProducaoCreateBody;
    const validationError = validateCreateBody(rawBody);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const body = normalizeCalendarDates(rawBody)!;
    const observacao = body.observacao?.trim() ?? '';

    try {
      if (body.modoQuantidade === 'unidades') {
        const record = await ordemProducaoMetaService.createSemAssadeira({
          dataProducao: body.dataProducao,
          dataEtiqueta: body.dataEtiqueta,
          tipoEstoque: body.tipoEstoque,
          produto: body.produto,
          observacao,
          unidades: body.unidades ?? 0,
        });
        return NextResponse.json({ id: record.id }, { status: 201 });
      }

      const record = await ordemProducaoMetaService.createFromLatas({
        dataProducao: body.dataProducao,
        dataEtiqueta: body.dataEtiqueta,
        tipoEstoque: body.tipoEstoque,
        produto: body.produto,
        observacao,
        latas: body.latas ?? 0,
        assadeiraNome: body.assadeiraNome,
      });
      return NextResponse.json({ id: record.id }, { status: 201 });
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      const message = e instanceof Error ? e.message : 'Erro ao criar ordem';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
