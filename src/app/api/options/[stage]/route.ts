import { NextResponse } from 'next/server';
import { getStageConfig, isValidStage } from '@/config/stages';
import { getColumnOptions } from '@/lib/googleSheets';
import { AccessDeniedError } from '@/lib/googleSheets';

// Cache simples em memória para opções
const optionsCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET(
  request: Request,
  context: { params: Promise<{ stage: string }> }
) {
  const { stage } = await context.params;
  
  try {
    // Validar etapa
    if (!isValidStage(stage)) {
      return NextResponse.json(
        { error: `Etapa '${stage}' não é válida` },
        { status: 400 }
      );
    }

    const config = getStageConfig(stage);
    if (!config) {
      return NextResponse.json(
        { error: 'Configuração da etapa não encontrada' },
        { status: 404 }
      );
    }

    // Verificar cache
    const cacheKey = `${stage}-${config.source.spreadsheetId}-${config.source.tabName}-${config.source.column}`;
    const cached = optionsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({ options: cached.data });
    }

    // Buscar opções da planilha
    const options = await getColumnOptions(
      config.source.spreadsheetId,
      config.source.tabName,
      config.source.column,
      config.source.headerRow
    );

    // Atualizar cache
    optionsCache.set(cacheKey, { data: options, timestamp: Date.now() });

    return NextResponse.json({ options });
  } catch (error) {
    console.error(`Erro ao buscar opções para ${stage}:`, error);

    if (error instanceof AccessDeniedError) {
      return NextResponse.json(
        {
          error: 'Acesso à planilha necessário',
          details: `A Service Account (${error.email}) precisa ter acesso à planilha`,
          email: error.email,
          sheetUrl: error.sheetUrl,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Falha ao carregar opções da planilha',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
