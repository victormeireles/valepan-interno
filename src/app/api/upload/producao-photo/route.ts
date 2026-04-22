import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDrive } from '@/lib/googleDrive';

export const maxDuration = 30;

/**
 * Upload de fotos para etapas de produÃ§Ã£o
 * Diferente do upload normal, este nÃ£o salva em planilha, apenas retorna a URL
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const etapaRaw = formData.get('etapa') as string;
    const ordemProducaoId = formData.get('ordemProducaoId') as string;

    if (!photo) {
      return NextResponse.json({ error: 'Nenhuma foto foi enviada' }, { status: 400 });
    }

    const etapa =
      etapaRaw === 'forno'
        ? 'entrada_forno'
        : etapaRaw === 'embalagem'
          ? 'entrada_embalagem'
          : etapaRaw;

    const etapasValidas = [
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    if (!etapa || !etapasValidas.includes(etapa)) {
      return NextResponse.json(
        {
          error:
            'Etapa invÃ¡lida. Use: massa, fermentacao, entrada_forno, saida_forno, entrada_embalagem ou saida_embalagem (forno/embalagem ainda aceitos como alias).',
        },
        { status: 400 },
      );
    }

    if (!ordemProducaoId) {
      return NextResponse.json(
        { error: 'ID da ordem de produÃ§Ã£o Ã© obrigatÃ³rio' },
        { status: 400 },
      );
    }

    // Validar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    // Validar tamanho (4MB mÃ¡ximo)
    if (photo.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Imagem deve ter no mÃ¡ximo 4MB' },
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
    // Usamos um rowId fictÃ­cio baseado no timestamp para organizaÃ§Ã£o
    const rowId = Math.floor(timestamp / 1000);
    const photoType =
      etapa === 'fermentacao'
        ? 'fermentacao'
        : etapa === 'entrada_forno' || etapa === 'saida_forno'
          ? 'forno'
          : 'pacote';

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
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload da foto';
    console.error('Erro ao fazer upload de foto de produção:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}










