import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDrive } from '@/lib/googleDrive';

export const maxDuration = 30;

/**
 * Upload de fotos para etapas de produção
 * Diferente do upload normal, este não salva em planilha, apenas retorna a URL
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const etapa = formData.get('etapa') as string; // massa, fermentacao, forno, embalagem
    const ordemProducaoId = formData.get('ordemProducaoId') as string;

    if (!photo) {
      return NextResponse.json({ error: 'Nenhuma foto foi enviada' }, { status: 400 });
    }

    if (!etapa || !['massa', 'fermentacao', 'forno', 'embalagem'].includes(etapa)) {
      return NextResponse.json(
        { error: 'Etapa inválida. Use: massa, fermentacao, forno ou embalagem' },
        { status: 400 },
      );
    }

    if (!ordemProducaoId) {
      return NextResponse.json(
        { error: 'ID da ordem de produção é obrigatório' },
        { status: 400 },
      );
    }

    // Validar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    // Validar tamanho (4MB máximo)
    if (photo.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Imagem deve ter no máximo 4MB' },
        { status: 400 },
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gerar nome do arquivo: producao-{etapa}-{ordemProducaoId}-{timestamp}
    const timestamp = Date.now();
    const fileName = `producao-${etapa}-${ordemProducaoId}-${timestamp}.jpg`;

    // Fazer upload para Google Drive
    // Usamos um rowId fictício baseado no timestamp para organização
    const rowId = Math.floor(timestamp / 1000);
    const photoType = etapa === 'fermentacao' ? 'fermentacao' : etapa === 'forno' ? 'forno' : 'pacote';

    const uploadResult = await uploadPhotoToDrive(
      buffer,
      fileName,
      photo.type,
      rowId,
      photoType as 'pacote' | 'forno' | 'fermentacao',
    );

    return NextResponse.json({
      success: true,
      photoUrl: uploadResult.photoUrl,
      photoId: uploadResult.photoId,
    });
  } catch (error) {
    console.error('Erro ao fazer upload de foto de produção:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload da foto' },
      { status: 500 },
    );
  }
}









