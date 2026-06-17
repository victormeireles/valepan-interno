import { NextRequest, NextResponse } from 'next/server';
import { parseSaidaId } from '@/domain/saidas/saida-id';
import { deleteSaidaPhoto, getSaidaPhoto } from '@/lib/saidas/saida-photo-handler';

type PhotoType = 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao' | 'saida';

function isValidPhotoType(value: string | null): value is PhotoType {
  return (
    value !== null &&
    ['pacote', 'etiqueta', 'pallet', 'forno', 'fermentacao', 'saida'].includes(value)
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const processType = searchParams.get('process');
    if (!processType || processType === 'embalagem') {
      return NextResponse.json(
        { error: 'Fotos de embalagem usam loteId via /api/upload/photo e PATCH no lote.' },
        { status: 400 },
      );
    }

    const { rowId } = await context.params;
    const photoType = searchParams.get('type');

    if (!isValidPhotoType(photoType)) {
      return NextResponse.json(
        {
          error:
            'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao ou saida',
        },
        { status: 400 },
      );
    }

    if (processType !== 'saidas') {
      return NextResponse.json(
        { error: 'Use as rotas de lote para fotos de forno e fermentação.' },
        { status: 400 },
      );
    }

    if (!parseSaidaId(rowId)) {
      return NextResponse.json({ error: 'ID de saída inválido' }, { status: 400 });
    }

    return NextResponse.json(await getSaidaPhoto());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const processType = searchParams.get('process');
    if (!processType || processType === 'embalagem') {
      return NextResponse.json(
        { error: 'Fotos de embalagem usam loteId via /api/upload/photo e PATCH no lote.' },
        { status: 400 },
      );
    }

    const { rowId } = await context.params;
    const photoType = searchParams.get('type');

    if (!isValidPhotoType(photoType)) {
      return NextResponse.json(
        {
          error:
            'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao ou saida',
        },
        { status: 400 },
      );
    }

    if (processType !== 'saidas') {
      return NextResponse.json(
        { error: 'Use as rotas de lote para fotos de forno e fermentação.' },
        { status: 400 },
      );
    }

    if (!parseSaidaId(rowId)) {
      return NextResponse.json({ error: 'ID de saída inválido' }, { status: 400 });
    }

    return NextResponse.json(await deleteSaidaPhoto());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
