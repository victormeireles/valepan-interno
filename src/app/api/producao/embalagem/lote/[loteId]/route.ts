import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { pedidoEmbalagemRepository } from '@/data/embalagem/PedidoEmbalagemRepository';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import type { EmbalagemLoteFotos } from '@/domain/types/embalagem-lote';
import {
  embalagemLoteService,
  EstoqueResolverError,
} from '@/lib/services/embalagem-lote-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;
    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    const lote = await embalagemLoteRepository.findById(loteId);
    if (!lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    let pedidoMeta = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
    if (lote.pedidoEmbalagemId) {
      const pedido = await pedidoEmbalagemRepository.findById(lote.pedidoEmbalagemId);
      if (pedido) {
        pedidoMeta = { ...pedido.quantidade };
      }
    }

    return NextResponse.json({
      loteId: lote.id,
      pedidoEmbalagemId: lote.pedidoEmbalagemId,
      data: {
        caixas: lote.quantidade.caixas,
        pacotes: lote.quantidade.pacotes,
        unidades: lote.quantidade.unidades,
        kg: lote.quantidade.kg,
        pedidoCaixas: pedidoMeta.caixas,
        pedidoPacotes: pedidoMeta.pacotes,
        pedidoUnidades: pedidoMeta.unidades,
        pedidoKg: pedidoMeta.kg,
        obsEmbalagem: lote.obsEmbalagem ?? '',
        pacoteFotoUrl: lote.fotos?.pacoteFotoUrl,
        pacoteFotoId: lote.fotos?.pacoteFotoId,
        pacoteFotoUploadedAt: lote.fotos?.pacoteFotoUploadedAt,
        etiquetaFotoUrl: lote.fotos?.etiquetaFotoUrl,
        etiquetaFotoId: lote.fotos?.etiquetaFotoId,
        etiquetaFotoUploadedAt: lote.fotos?.etiquetaFotoUploadedAt,
        palletFotoUrl: lote.fotos?.palletFotoUrl,
        palletFotoId: lote.fotos?.palletFotoId,
        palletFotoUploadedAt: lote.fotos?.palletFotoUploadedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;
    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    const body = await request.json();
    const {
      caixas,
      pacotes,
      unidades,
      kg,
      obsEmbalagem,
      pacoteFotoUrl,
      pacoteFotoId,
      pacoteFotoUploadedAt,
      etiquetaFotoUrl,
      etiquetaFotoId,
      etiquetaFotoUploadedAt,
      palletFotoUrl,
      palletFotoId,
      palletFotoUploadedAt,
    } = body;

    const c = Number(caixas) || 0;
    const p = Number(pacotes) || 0;
    const u = Number(unidades) || 0;
    const k = Number(kg) || 0;

    if (c < 0 || p < 0 || u < 0 || k < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const fotos: EmbalagemLoteFotos = {
      pacoteFotoUrl: pacoteFotoUrl || undefined,
      pacoteFotoId: pacoteFotoId || undefined,
      pacoteFotoUploadedAt: pacoteFotoUploadedAt || undefined,
      etiquetaFotoUrl: etiquetaFotoUrl || undefined,
      etiquetaFotoId: etiquetaFotoId || undefined,
      etiquetaFotoUploadedAt: etiquetaFotoUploadedAt || undefined,
      palletFotoUrl: palletFotoUrl || undefined,
      palletFotoId: palletFotoId || undefined,
      palletFotoUploadedAt: palletFotoUploadedAt || undefined,
    };

    try {
      await embalagemLoteService.atualizarLote(loteId, {
        quantidade: { caixas: c, pacotes: p, unidades: u, kg: k },
        obsEmbalagem: obsEmbalagem || '',
        fotos,
      });
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    revalidatePath('/api/painel/embalagem');
    revalidatePath('/api/painel/estoque');

    return NextResponse.json({ message: 'Lote atualizado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;
    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    const body = (await request.json()) as EmbalagemLoteFotos;
    await embalagemLoteService.syncFotosFromLoteId(loteId, body);

    return NextResponse.json({ message: 'Fotos sincronizadas' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ loteId: string }> },
) {
  try {
    const { loteId } = await context.params;

    if (!loteId?.trim()) {
      return NextResponse.json({ error: 'ID do lote inválido' }, { status: 400 });
    }

    await embalagemLoteService.excluirLote(loteId);

    revalidatePath('/api/painel/embalagem');
    revalidatePath('/api/painel/estoque');

    return NextResponse.json({ message: 'Lote excluído com sucesso' });
  } catch (error) {
    if (error instanceof EstoqueResolverError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
