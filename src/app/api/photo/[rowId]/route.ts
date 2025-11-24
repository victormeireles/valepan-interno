import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { deletePhotoFromDrive, getPhotoInfo } from '@/lib/googleDrive';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';
import { PEDIDOS_FERMENTACAO_CONFIG } from '@/config/fermentacao';
import { PEDIDOS_RESFRIAMENTO_CONFIG } from '@/config/resfriamento';
import { SAIDAS_SHEET_CONFIG } from '@/config/saidas';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const { searchParams } = new URL(request.url);
    const photoType = searchParams.get('type') as 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao' | 'resfriamento' | 'saida' | null;
    const processType = (searchParams.get('process') as string) || 'embalagem';
    
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    if (!photoType || !['pacote', 'etiqueta', 'pallet', 'forno', 'fermentacao', 'resfriamento', 'saida'].includes(photoType)) {
      return NextResponse.json({ error: 'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao, resfriamento ou saida' }, { status: 400 });
    }

    // Buscar dados da foto na planilha
    let config;
    if (processType === 'saidas') {
      config = SAIDAS_SHEET_CONFIG.destino;
    } else if (processType === 'forno') {
      config = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    } else if (processType === 'fermentacao') {
      config = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    } else if (processType === 'resfriamento') {
      config = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    } else {
      config = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    }
    const { spreadsheetId, tabName } = config;
    const sheets = await getGoogleSheetsClient();
    
    // Determinar as colunas baseado no tipo de foto
    let startColumn: string;
    let columnsCount = 3;
    if (processType === 'saidas') {
      startColumn = 'P';
      columnsCount = 2;
    } else if (processType === 'forno') {
      startColumn = 'L'; // L, M, N
    } else if (processType === 'fermentacao') {
      startColumn = 'S'; // S, T, U
    } else if (processType === 'resfriamento') {
      startColumn = 'Z'; // Z, AA, AB
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
        case 'saida':
          throw new Error('Processo inválido para tipo saida');
        default:
          throw new Error('Tipo de foto inválido');
      }
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
        message: `Nenhuma foto ${photoType} encontrada` 
      });
    }

    const photoData = {
      photoUrl: values[0] || '',
      photoId: values[1] || '',
      photoUploadedAt: columnsCount === 3 ? values[2] || '' : '',
      photoType: photoType,
    };

    // Verificar se a foto ainda existe no Drive
    if (photoData.photoId) {
      const photoInfo = await getPhotoInfo(photoData.photoId);
      if (!photoInfo) {
        // Foto não existe mais no Drive, limpar dados da planilha
        const emptyRow = columnsCount === 3 ? ['', '', ''] : ['', ''];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [emptyRow]
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
    const photoType = searchParams.get('type') as 'pacote' | 'etiqueta' | 'pallet' | 'forno' | 'fermentacao' | 'resfriamento' | 'saida' | null;
    const processType = (searchParams.get('process') as string) || 'embalagem';
    
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    if (!photoType || !['pacote', 'etiqueta', 'pallet', 'forno', 'fermentacao', 'resfriamento', 'saida'].includes(photoType)) {
      return NextResponse.json({ error: 'Tipo de foto inválido. Use: pacote, etiqueta, pallet, forno, fermentacao, resfriamento ou saida' }, { status: 400 });
    }

    // Buscar dados da foto na planilha
    let config;
    if (processType === 'saidas') {
      config = SAIDAS_SHEET_CONFIG.destino;
    } else if (processType === 'forno') {
      config = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    } else if (processType === 'fermentacao') {
      config = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    } else if (processType === 'resfriamento') {
      config = PEDIDOS_RESFRIAMENTO_CONFIG.destinoPedidos;
    } else {
      config = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    }
    const { spreadsheetId, tabName } = config;
    const sheets = await getGoogleSheetsClient();
    
    // Determinar as colunas baseado no tipo de foto
    let startColumn: string;
    let columnsCount = 3;
    if (processType === 'saidas') {
      startColumn = 'P';
      columnsCount = 2;
    } else if (processType === 'forno') {
      startColumn = 'L';
    } else if (processType === 'fermentacao') {
      startColumn = 'S';
    } else if (processType === 'resfriamento') {
      startColumn = 'Z';
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
        case 'saida':
          throw new Error('Processo inválido para tipo saida');
        default:
          throw new Error('Tipo de foto inválido');
      }
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
        message: `Nenhuma foto ${photoType} encontrada para deletar` 
      });
    }

    const photoId = values[1];
    
    // Deletar foto do Google Drive
    if (photoId) {
      try {
        await deletePhotoFromDrive(photoId);
      } catch {
        // Continuar mesmo se falhar, pois a foto pode já ter sido deletada
      }
    }

    // Limpar dados da foto na planilha
    const emptyRow = columnsCount === 3 ? ['', '', ''] : ['', ''];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [emptyRow]
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Foto ${photoType} deletada com sucesso` 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
