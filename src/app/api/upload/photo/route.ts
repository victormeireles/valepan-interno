import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDrive } from '@/lib/googleDrive';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_RESFRIAMENTO_CONFIG } from '@/config/resfriamento';
import { parseSaidaId, saidaIdToDriveRowNumber } from '@/domain/saidas/saida-id';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const rowId = formData.get('rowId') as string;
    const loteId = formData.get('loteId') as string;
    const photoType = formData.get('photoType') as string;
    const processType = formData.get('process') as string | null;

    if (!photo) {
      return NextResponse.json({ error: 'Nenhuma foto foi enviada' }, { status: 400 });
    }

    if (!processType) {
      return NextResponse.json({ error: 'Processo é obrigatório' }, { status: 400 });
    }

    if (processType === 'embalagem' || processType === 'fermentacao' || processType === 'forno') {
      if (!loteId) {
        return NextResponse.json(
          { error: 'loteId é obrigatório para este processo.' },
          { status: 400 },
        );
      }
    } else if (!rowId) {
      return NextResponse.json({ error: 'ID da linha é obrigatório' }, { status: 400 });
    }

    if (
      !photoType ||
      ![
        'pacote',
        'etiqueta',
        'pallet',
        'forno',
        'fermentacao',
        'resfriamento',
        'saida',
      ].includes(photoType)
    ) {
      return NextResponse.json(
        {
          error:
            'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao, resfriamento ou saida',
        },
        { status: 400 },
      );
    }

    const isSaidasProcess = processType === 'saidas';
    const saidaId = rowId ? parseSaidaId(rowId) : null;
    const rowNumber = isSaidasProcess
      ? saidaId
        ? saidaIdToDriveRowNumber(saidaId)
        : NaN
      : rowId
        ? parseInt(rowId)
        : parseInt(loteId.replace(/-/g, '').slice(0, 8), 16) % 1_000_000 || 1;

    if (rowId && (isNaN(rowNumber) || rowNumber < 2)) {
      return NextResponse.json(
        { error: isSaidasProcess ? 'ID de saída inválido' : 'ID de linha inválido' },
        { status: 400 },
      );
    }

    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    if (photo.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            'Imagem deve ter no máximo 4MB. A imagem deveria ter sido comprimida automaticamente.',
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadPhotoToDrive(
      buffer,
      photo.name,
      photo.type,
      rowNumber,
      photoType as
        | 'pacote'
        | 'etiqueta'
        | 'pallet'
        | 'forno'
        | 'fermentacao'
        | 'resfriamento'
        | 'saida',
    );

    if (processType === 'embalagem') {
      const prefix =
        photoType === 'pacote' ? 'pacote' : photoType === 'etiqueta' ? 'etiqueta' : 'pallet';
      const { embalagemLoteService } = await import('@/lib/services/embalagem-lote-service');
      await embalagemLoteService.syncFotosFromLoteId(loteId, {
        [`${prefix}FotoUrl`]: uploadResult.photoUrl,
        [`${prefix}FotoId`]: uploadResult.photoId,
        [`${prefix}FotoUploadedAt`]: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        photoUrl: uploadResult.photoUrl,
        photoId: uploadResult.photoId,
        photoType,
        message: 'Foto enviada com sucesso',
      });
    }

    if (processType === 'fermentacao') {
      const { fermentacaoLoteRepository } = await import(
        '@/data/producao-etapa/FermentacaoLoteRepository'
      );
      await fermentacaoLoteRepository.updateById(loteId, {
        fotos: {
          fotoUrl: uploadResult.photoUrl,
          fotoId: uploadResult.photoId,
          fotoUploadedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        photoUrl: uploadResult.photoUrl,
        photoId: uploadResult.photoId,
        photoType,
        message: 'Foto enviada com sucesso',
      });
    }

    if (processType === 'forno') {
      const { fornoLoteRepository } = await import('@/data/producao-etapa/FornoLoteRepository');
      await fornoLoteRepository.updateById(loteId, {
        fotos: {
          fotoUrl: uploadResult.photoUrl,
          fotoId: uploadResult.photoId,
          fotoUploadedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        photoUrl: uploadResult.photoUrl,
        photoId: uploadResult.photoId,
        photoType,
        message: 'Foto enviada com sucesso',
      });
    }

    if (processType === 'saidas') {
      return NextResponse.json({
        success: true,
        photoUrl: uploadResult.photoUrl,
        photoId: uploadResult.photoId,
        photoType,
        message: 'Foto enviada ao Drive (não persistida no movimento de estoque)',
      });
    }

    const sheets = await getGoogleSheetsClient();
    if (processType !== 'resfriamento') {
      return NextResponse.json({ error: 'Processo inválido' }, { status: 400 });
    }
    const config = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    const { spreadsheetId, tabName } = config;

    const columnsCount = 3;
    const startColumn = 'Z';

    const endColumn = String.fromCharCode(startColumn.charCodeAt(0) + columnsCount - 1);
    const range = `${tabName}!${startColumn}${rowNumber}:${endColumn}${rowNumber}`;
    const values =
      columnsCount === 3
        ? [uploadResult.photoUrl, uploadResult.photoId, new Date().toISOString()]
        : [uploadResult.photoUrl, uploadResult.photoId];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    return NextResponse.json({
      success: true,
      photoUrl: uploadResult.photoUrl,
      photoId: uploadResult.photoId,
      photoType,
      message: 'Foto enviada com sucesso',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
