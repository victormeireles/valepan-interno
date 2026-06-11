import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { deletePhotoFromDrive, getPhotoInfo } from '@/lib/googleDrive';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';
import { PEDIDOS_FERMENTACAO_CONFIG } from '@/config/fermentacao';
import { PEDIDOS_RESFRIAMENTO_CONFIG } from '@/config/resfriamento';
import { parseSaidaId } from '@/domain/saidas/saida-id';
import { deleteSaidaPhoto, getSaidaPhoto } from '@/lib/saidas/saida-photo-handler';

type PhotoType =
  | 'pacote'
  | 'etiqueta'
  | 'pallet'
  | 'forno'
  | 'fermentacao'
  | 'resfriamento'
  | 'saida';

function isValidPhotoType(value: string | null): value is PhotoType {
  return (
    value !== null &&
    ['pacote', 'etiqueta', 'pallet', 'forno', 'fermentacao', 'resfriamento', 'saida'].includes(
      value,
    )
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
            'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao, resfriamento ou saida',
        },
        { status: 400 },
      );
    }

    if (processType === 'saidas') {
      if (!parseSaidaId(rowId)) {
        return NextResponse.json({ error: 'ID de saída inválido' }, { status: 400 });
      }
      return NextResponse.json(await getSaidaPhoto());
    }

    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    let config;
    if (processType === 'forno') {
      config = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    } else if (processType === 'fermentacao') {
      config = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    } else if (processType === 'resfriamento') {
      config = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    } else {
      return NextResponse.json({ error: 'Processo inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = config;
    const sheets = await getGoogleSheetsClient();

    let startColumn: string;
    const columnsCount = 3;
    if (processType === 'forno') {
      startColumn = 'L';
    } else if (processType === 'fermentacao') {
      startColumn = 'S';
    } else {
      startColumn = 'Z';
    }

    const endColumn = String.fromCharCode(startColumn.charCodeAt(0) + columnsCount - 1);
    const range = `${tabName}!${startColumn}${rowNumber}:${endColumn}${rowNumber}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values?.[0] || [];

    if (values.length === 0 || !values[0]) {
      return NextResponse.json({
        success: true,
        photo: null,
        message: `Nenhuma foto ${photoType} encontrada`,
      });
    }

    const photoData = {
      photoUrl: values[0] || '',
      photoId: values[1] || '',
      photoUploadedAt: values[2] || '',
      photoType,
    };

    if (photoData.photoId) {
      const photoInfo = await getPhotoInfo(photoData.photoId);
      if (!photoInfo) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['', '', '']] },
        });

        return NextResponse.json({
          success: true,
          photo: null,
          message: `Foto ${photoType} não encontrada no Drive`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      photo: photoData,
      message: `Foto ${photoType} encontrada`,
    });
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
            'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao, resfriamento ou saida',
        },
        { status: 400 },
      );
    }

    if (processType === 'saidas') {
      if (!parseSaidaId(rowId)) {
        return NextResponse.json({ error: 'ID de saída inválido' }, { status: 400 });
      }
      return NextResponse.json(await deleteSaidaPhoto());
    }

    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    let config;
    if (processType === 'forno') {
      config = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    } else if (processType === 'fermentacao') {
      config = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    } else if (processType === 'resfriamento') {
      config = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    } else {
      return NextResponse.json({ error: 'Processo inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = config;
    const sheets = await getGoogleSheetsClient();

    let startColumn: string;
    const columnsCount = 3;
    if (processType === 'forno') {
      startColumn = 'L';
    } else if (processType === 'fermentacao') {
      startColumn = 'S';
    } else {
      startColumn = 'Z';
    }

    const endColumn = String.fromCharCode(startColumn.charCodeAt(0) + columnsCount - 1);
    const range = `${tabName}!${startColumn}${rowNumber}:${endColumn}${rowNumber}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values?.[0] || [];

    if (values.length === 0 || !values[0]) {
      return NextResponse.json({
        success: true,
        message: `Nenhuma foto ${photoType} encontrada para deletar`,
      });
    }

    const photoId = values[1];

    if (photoId) {
      try {
        await deletePhotoFromDrive(photoId);
      } catch {
        // foto pode já ter sido removida
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['', '', '']] },
    });

    return NextResponse.json({
      success: true,
      message: `Foto ${photoType} deletada com sucesso`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
