import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDrive } from '@/lib/googleDrive';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

// Aumentar tempo máximo de execução para upload de fotos
export const maxDuration = 30; // 30 segundos

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const rowId = formData.get('rowId') as string;
    const photoType = formData.get('photoType') as string;

    if (!photo) {
      return NextResponse.json({ error: 'Nenhuma foto foi enviada' }, { status: 400 });
    }

    if (!rowId) {
      return NextResponse.json({ error: 'ID da linha é obrigatório' }, { status: 400 });
    }

    if (!photoType || !['pacote', 'etiqueta', 'pallet'].includes(photoType)) {
      return NextResponse.json({ error: 'Tipo de foto inválido. Use: pacote, etiqueta ou pallet' }, { status: 400 });
    }

    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    // Validar tamanho (4MB máximo - limite seguro para Vercel)
    if (photo.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem deve ter no máximo 4MB. A imagem deveria ter sido comprimida automaticamente.' }, { status: 400 });
    }

    // Converter File para Buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fazer upload para Google Drive
    const uploadResult = await uploadPhotoToDrive(
      buffer,
      photo.name,
      photo.type,
      rowNumber,
      photoType as 'pacote' | 'etiqueta' | 'pallet'
    );

    // Salvar dados da foto na planilha
    const sheets = await getGoogleSheetsClient();
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    
    // Determinar as colunas baseado no tipo de foto
    let startColumn: string;
    switch (photoType) {
      case 'pacote':
        startColumn = 'R'; // R, S, T
        break;
      case 'etiqueta':
        startColumn = 'U'; // U, V, W
        break;
      case 'pallet':
        startColumn = 'X'; // X, Y, Z
        break;
      default:
        throw new Error('Tipo de foto inválido');
    }
    
    const endColumn = String.fromCharCode(startColumn.charCodeAt(0) + 2);
    const range = `${tabName}!${startColumn}${rowNumber}:${endColumn}${rowNumber}`;
    const values = [
      uploadResult.photoUrl,           // URL da foto
      uploadResult.photoId,            // ID do arquivo no Drive
      new Date().toISOString(),        // Timestamp do upload
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
      photoType: photoType,
      message: 'Foto enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro no upload da foto:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
