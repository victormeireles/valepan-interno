import { NextResponse } from 'next/server';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';

type ReorderPayload = {
  dataProducao: string;
  orderedIds: string[];
};

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as ReorderPayload;
    if (!payload || !isValidDateISO(payload.dataProducao)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }
    if (!Array.isArray(payload.orderedIds) || payload.orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds é obrigatório' }, { status: 400 });
    }

    const existing = await ordemProducaoRepository.listByDataProducao(payload.dataProducao);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma ordem encontrada para a data informada' },
        { status: 404 },
      );
    }

    const existingIds = new Set(existing.map((row) => row.id));
    const incomingIds = new Set(payload.orderedIds);
    const hasUnknownIds = payload.orderedIds.some((id) => !existingIds.has(id));

    if (hasUnknownIds || incomingIds.size !== existingIds.size) {
      return NextResponse.json(
        { error: 'orderedIds deve conter exatamente as ordens da data informada' },
        { status: 400 },
      );
    }

    await ordemProducaoRepository.reorderForDate(
      payload.dataProducao,
      payload.orderedIds,
    );

    return NextResponse.json({ message: 'Ordem de planejamento atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
