import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { deletePhotoFromDrive, getPhotoInfo } from '@/lib/googleDrive';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';
import { PEDIDOS_FERMENTACAO_CONFIG } from '@/config/fermentacao';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const { searchParams } = new URL(request.url);
    const photoType = searchParams.get('type') as 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao' | null;
    const processType = (searchParams.get('process') as string) || 'embalagem';
    
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    if (!photoType || !['pacote', 'etiqueta', 'pallet', 'forno', 'fermentacao'].includes(photoType)) {
      return NextResponse.json({ error: 'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno ou fermentacao' }, { status: 400 });
    }

    // Buscar dados da foto na planilha
    let config;
    if (processType === 'forno') {
      config = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    } else if (processType === 'fermentacao') {
      config = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    } else {
      config = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    }
    const { spreadsheetId, tabName } = config;
    const sheets = await getGoogleSheetsClient();
    
    // Determinar as colunas baseado no tipo de foto
    let startColumn: string;
    if (processType === 'forno') {
      startColumn = 'L'; // L, M, N
    } else if (processType === 'fermentacao') {
      startColumn = 'S'; // S, T, U
    } else {
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
    }
    
    const endColumn = String.fromCharCode(startColumn.charCodeAt(0) + 2);
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
        message: `Nenhuma foto ${photoType} encontrada` 
      });
    }

    const photoData = {
      photoUrl: values[0] || '',
      photoId: values[1] || '',
      photoUploadedAt: values[2] || '',
      photoType: photoType,
    };

    // Verificar se a foto ainda existe no Drive
    if (photoData.photoId) {
      const photoInfo = await getPhotoInfo(photoData.photoId);
      if (!photoInfo) {
        // Foto não existe mais no Drive, limpar dados da planilha
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['', '', '']]
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          photo: null,
          message: `Foto ${photoType} não encontrada no Drive` 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      photo: photoData,
      message: `Foto ${photoType} encontrada` 
    });

  } catch (error) {
    console.error('Erro ao buscar foto:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const { searchParams } = new URL(request.url);
    const photoType = searchParams.get('type') as 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao' | null;
    const processType = (searchParams.get('process') as string) || 'embalagem';
    
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    if (!photoType || !['pacote', 'etiqueta', 'pallet', 'forno', 'fermentacao'].includes(photoType)) {
      return NextResponse.json({ error: 'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno ou fermentacao' }, { status: 400 });
    }

    // Buscar dados da foto na planilha
    let config;
    if (processType === 'forno') {
      config = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    } else if (processType === 'fermentacao') {
      config = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    } else {
      config = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    }
    const { spreadsheetId, tabName } = config;
    const sheets = await getGoogleSheetsClient();
    
    // Determinar as colunas baseado no tipo de foto
    let startColumn: string;
    if (processType === 'forno') {
      startColumn = 'L';
    } else {
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
    }
    
    const endColumn = String.fromCharCode(startColumn.charCodeAt(0) + 2);
    const range = `${tabName}!${startColumn}${rowNumber}:${endColumn}${rowNumber}`;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values?.[0] || [];
    
    if (values.length === 0 || !values[0]) {
      return NextResponse.json({ 
        success: true, 
        message: `Nenhuma foto ${photoType} encontrada para deletar` 
      });
    }

    const photoId = values[1];
    
    // Deletar foto do Google Drive
    if (photoId) {
      try {
        await deletePhotoFromDrive(photoId);
      } catch (error) {
        console.warn('Erro ao deletar foto do Drive (pode já ter sido deletada):', error);
        // Continuar mesmo se falhar, pois a foto pode já ter sido deletada
      }
    }

    // Limpar dados da foto na planilha
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', '', '']]
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Foto ${photoType} deletada com sucesso` 
    });

  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
