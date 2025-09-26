import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { deletePhotoFromDrive, getPhotoInfo } from '@/lib/googleDrive';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    // Buscar dados da foto na planilha (colunas R, S, T)
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    
    const range = `${tabName}!R${rowNumber}:T${rowNumber}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values?.[0] || [];
    
    if (values.length === 0 || !values[0]) {
      return NextResponse.json({ 
        success: true, 
        photo: null,
        message: 'Nenhuma foto encontrada' 
      });
    }

    const photoData = {
      photoUrl: values[0] || '',
      photoId: values[1] || '',
      photoUploadedAt: values[2] || '',
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
          message: 'Foto não encontrada no Drive' 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      photo: photoData,
      message: 'Foto encontrada' 
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
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    // Buscar dados da foto na planilha
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    
    const range = `${tabName}!R${rowNumber}:T${rowNumber}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values?.[0] || [];
    
    if (values.length === 0 || !values[0]) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhuma foto encontrada para deletar' 
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
      message: 'Foto deletada com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
