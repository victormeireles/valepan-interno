import { NextRequest, NextResponse } from 'next/server';
import { listPhotosInPeriod, deletePhotoFromDrive } from '@/lib/googleDrive';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';

export async function POST(request: NextRequest) {
  try {
    const { daysToKeep = 30 } = await request.json();
    
    // Calcular data de corte (fotos mais antigas que esta data serão deletadas)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Listar fotos do período antigo
    const oldPhotos = await listPhotosInPeriod(
      new Date(2020, 0, 1), // Data muito antiga para pegar tudo
      cutoffDate
    );
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    // Deletar cada foto antiga
    for (const photo of oldPhotos) {
      try {
        await deletePhotoFromDrive(photo.photoId);
        deletedCount++;
      } catch (error) {
        const errorMsg = `Erro ao deletar foto ${photo.fileName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // Limpar dados das fotos deletadas da planilha
    if (deletedCount > 0) {
      await cleanupPhotoDataFromSheets(oldPhotos.slice(0, deletedCount));
    }
    
    return NextResponse.json({
      success: true,
      message: `Limpeza concluída: ${deletedCount} fotos deletadas`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('Erro na limpeza de fotos:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Remove dados de fotos deletadas da planilha
 */
async function cleanupPhotoDataFromSheets(deletedPhotos: { photoId: string; fileName: string }[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    
    // Buscar todas as linhas que têm dados de foto
    const range = `${tabName}!R:T`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    const rows = response.data.values || [];
    const photoIds = deletedPhotos.map(p => p.photoId);
    
    // Encontrar linhas que contêm fotos deletadas
    const rowsToClean = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length >= 2 && photoIds.includes(row[1])) {
        rowsToClean.push(i + 1); // +1 porque as linhas começam em 1
      }
    }
    
    // Limpar dados das linhas encontradas
    for (const rowNumber of rowsToClean) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!R${rowNumber}:T${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', '', '']]
        }
      });
    }
    
  } catch (error) {
    console.error('Erro ao limpar dados da planilha:', error);
    // Não falhar a operação principal por causa disso
  }
}
