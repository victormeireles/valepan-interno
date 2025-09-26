import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDrive } from '@/lib/googleDrive';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const rowId = formData.get('rowId') as string;

    if (!photo) {
      return NextResponse.json({ error: 'Nenhuma foto foi enviada' }, { status: 400 });
    }

    if (!rowId) {
      return NextResponse.json({ error: 'ID da linha é obrigatório' }, { status: 400 });
    }

    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    // Validar tamanho (5MB máximo)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem deve ter no máximo 5MB' }, { status: 400 });
    }

    // Converter File para Buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fazer upload para Google Drive
    const uploadResult = await uploadPhotoToDrive(
      buffer,
      photo.name,
      photo.type,
      rowNumber
    );

    // Salvar dados da foto na planilha (colunas R, S, T)
    const sheets = await getGoogleSheetsClient();
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    
    const range = `${tabName}!R${rowNumber}:T${rowNumber}`;
    const values = [
      uploadResult.photoUrl,           // R - URL da foto
      uploadResult.photoId,            // S - ID do arquivo no Drive
      new Date().toISOString(),        // T - Timestamp do upload
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values]
      }
    });

    return NextResponse.json({
      success: true,
      photoUrl: uploadResult.photoUrl,
      photoId: uploadResult.photoId,
      message: 'Foto enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro no upload da foto:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
