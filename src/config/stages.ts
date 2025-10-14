// Configuração das etapas de produção baseada no PRD
export interface StageConfig {
  name: string;
  description: string;
  source: {
    spreadsheetId: string;
    tabName: string;
    column: string; // coluna para extrair opções (ex: "A" para coluna A)
    headerRow: number; // linha onde começam os dados (1 = linha 1, 2 = linha 2, etc.)
  };
  destination: {
    spreadsheetId: string;
    tabName: string;
    columns: string[]; // ordem das colunas para escrita
  };
  fields: {
    [key: string]: {
      type: 'date' | 'turno' | 'select' | 'number' | 'numberHalf';
      required: boolean;
      label: string;
      sourceColumn?: string; // para campos select
    };
  };
}

export const STAGES_CONFIG: Record<string, StageConfig> = {
  'pre-mistura': {
    name: 'Pré-Mistura',
    description: 'Registro de produção da etapa de pré-mistura',
    source: {
      spreadsheetId: '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
      tabName: 'Pré-Mistura',
      column: 'A',
      headerRow: 1 // Dados começam na linha 2
    },
    destination: {
      spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
      tabName: '1 - Pré Mistura',
      columns: ['Data', 'Turno', 'Pré-Mistura', 'Quantidade']
    },
    fields: {
      data: { type: 'date', required: true, label: 'Data' },
      turno: { type: 'turno', required: true, label: 'Turno' },
      preMistura: { type: 'select', required: true, label: 'Pré-Mistura', sourceColumn: 'A' },
      quantidade: { type: 'numberHalf', required: true, label: 'Quantidade' }
    }
  },
  'massa': {
    name: 'Massa',
    description: 'Registro de produção da etapa de massa',
    source: {
      spreadsheetId: '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
      tabName: 'Massa',
      column: 'A',
      headerRow: 1 // Dados começam na linha 2
    },
    destination: {
      spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
      tabName: '2 - Massa',
      columns: ['Data', 'Turno', 'Massa', 'Quantidade']
    },
    fields: {
      data: { type: 'date', required: true, label: 'Data' },
      turno: { type: 'turno', required: true, label: 'Turno' },
      massa: { type: 'select', required: true, label: 'Massa', sourceColumn: 'A' },
      quantidade: { type: 'numberHalf', required: true, label: 'Quantidade' }
    }
  },
};

export function getStageConfig(stage: string): StageConfig | null {
  return STAGES_CONFIG[stage] || null;
}

export function isValidStage(stage: string): boolean {
  return stage in STAGES_CONFIG;
}
