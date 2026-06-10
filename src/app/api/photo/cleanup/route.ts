import { NextRequest, NextResponse } from 'next/server';
import { listPhotosInPeriod, deletePhotoFromDrive } from '@/lib/googleDrive';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';

export async function POST(request: NextRequest) {
  try {
    const { daysToKeep = 30 } = await request.json();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldPhotos = await listPhotosInPeriod(new Date(2020, 0, 1), cutoffDate);

    let deletedCount = 0;
    const errors: string[] = [];
    const deletedPhotoIds: string[] = [];

    for (const photo of oldPhotos) {
      try {
        await deletePhotoFromDrive(photo.photoId);
        deletedCount++;
        deletedPhotoIds.push(photo.photoId);
      } catch (error) {
        const errorMsg = `Erro ao deletar foto ${photo.fileName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        errors.push(errorMsg);
      }
    }

    let clearedLoteFields = 0;
    if (deletedPhotoIds.length > 0) {
      try {
        clearedLoteFields =
          await embalagemLoteRepository.clearPhotoReferences(deletedPhotoIds);
      } catch {
        // não falhar a operação principal
      }
    }

    return NextResponse.json({
      success: true,
      message: `Limpeza concluída: ${deletedCount} fotos deletadas`,
      deletedCount,
      clearedLoteFields,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
