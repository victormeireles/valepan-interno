import { NextResponse } from 'next/server';
import { getStageConfig, isValidStage } from '@/config/stages';
import { appendRow } from '@/lib/googleSheets';
import { validateStageData, getTodayString } from '@/domain/validation';
import { AccessDeniedError } from '@/lib/googleSheets';
import type { StageData, SubmitResponse } from '@/domain/types';

export async function POST(
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

    // Parse e validação dos dados
    const body = await request.json();
    
    // Se data não fornecida, usar hoje
    if (!body.data) {
      body.data = getTodayString();
    }

    const validatedData = validateStageData(stage, body) as StageData;

    // Preparar dados para escrita na planilha
    const values = prepareValuesForSheet(config, validatedData);

    // Escrever na planilha
    await appendRow(
      config.destination.spreadsheetId,
      config.destination.tabName,
      values
    );

    const response: SubmitResponse = {
      success: true,
      message: 'Dados salvos com sucesso!',
      data: validatedData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(`Erro ao salvar dados para ${stage}:`, error);

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

    // Erro de validação
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Falha ao salvar dados',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

// Função para converter data de YYYY-MM-DD para DD/MM/YYYY
function formatDateForSheet(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

// Função para preparar valores na ordem correta para a planilha
function prepareValuesForSheet(config: { destination: { columns: string[] } }, data: StageData): (string | number)[] {
  const values: (string | number)[] = [];
  
  // Sempre começar com data e turno (converter data para formato brasileiro)
  values.push(formatDateForSheet(data.data));
  values.push(data.turno);

  // Adicionar campos específicos da etapa
  if ('preMistura' in data) {
    values.push(data.preMistura);
    values.push(data.quantidade);
  } else if ('massa' in data) {
    values.push(data.massa);
    values.push(data.quantidade);
  } else if ('fermentacao' in data) {
    values.push(data.fermentacao);
    values.push(data.carrinhos);
    values.push(data.assadeiras);
    values.push(data.unidades);
  } else if ('produto' in data && 'carrinhos' in data) {
    values.push(data.produto);
    values.push(data.carrinhos);
    values.push(data.assadeiras);
    values.push(data.unidades);
  }

  return values;
}
