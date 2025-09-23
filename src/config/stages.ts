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
  'fermentacao': {
    name: 'Fermentação',
    description: 'Registro de produção da etapa de fermentação',
    source: {
      spreadsheetId: '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
      tabName: 'Fermentação',
      column: 'A',
      headerRow: 1 // Dados começam na linha 2
    },
    destination: {
      spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
      tabName: '3 - Fermentação',
      columns: ['Data', 'Turno', 'Fermentação', 'Carrinhos', 'Assadeiras', 'Unidades']
    },
    fields: {
      data: { type: 'date', required: true, label: 'Data' },
      turno: { type: 'turno', required: true, label: 'Turno' },
      fermentacao: { type: 'select', required: true, label: 'Fermentação', sourceColumn: 'A' },
      carrinhos: { type: 'numberHalf', required: true, label: 'Carrinhos' },
      assadeiras: { type: 'number', required: true, label: 'Assadeiras' },
      unidades: { type: 'number', required: true, label: 'Unidades' }
    }
  },
  'resfriamento': {
    name: 'Resfriamento',
    description: 'Registro de produção da etapa de resfriamento',
    source: {
      spreadsheetId: '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
      tabName: 'Produtos',
      column: 'A',
      headerRow: 2 // Dados começam na linha 3
    },
    destination: {
      spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
      tabName: '4 - Resfriamento',
      columns: ['Data', 'Turno', 'Produto', 'Carrinhos', 'Assadeiras', 'Unidades']
    },
    fields: {
      data: { type: 'date', required: true, label: 'Data' },
      turno: { type: 'turno', required: true, label: 'Turno' },
      produto: { type: 'select', required: true, label: 'Produto', sourceColumn: 'A' },
      carrinhos: { type: 'numberHalf', required: true, label: 'Carrinhos' },
      assadeiras: { type: 'number', required: true, label: 'Assadeiras' },
      unidades: { type: 'number', required: true, label: 'Unidades' }
    }
  },
  'forno': {
    name: 'Forno',
    description: 'Registro de produção da etapa de forno',
    source: {
      spreadsheetId: '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
      tabName: 'Produtos',
      column: 'A',
      headerRow: 2 // Dados começam na linha 3
    },
    destination: {
      spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
      tabName: '5 - Forno',
      columns: ['Data', 'Turno', 'Produto', 'Carrinhos', 'Assadeiras', 'Unidades']
    },
    fields: {
      data: { type: 'date', required: true, label: 'Data' },
      turno: { type: 'turno', required: true, label: 'Turno' },
      produto: { type: 'select', required: true, label: 'Produto', sourceColumn: 'A' },
      carrinhos: { type: 'numberHalf', required: true, label: 'Carrinhos' },
      assadeiras: { type: 'number', required: true, label: 'Assadeiras' },
      unidades: { type: 'number', required: true, label: 'Unidades' }
    }
  }
  ,
  'embalagem-producao': {
    name: 'Embalagem (Produção)',
    description: 'Registro de produção na etapa de embalagem',
    source: {
      spreadsheetId: '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
      tabName: 'Produtos',
      column: 'A',
      headerRow: 2 // Dados começam na linha 3, igual ao forno
    },
    destination: {
      spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
      tabName: '6 - Embalagem',
      columns: ['Data', 'Turno', 'Cliente', 'Produto', 'Caixas', 'Pacotes', 'Unidades', 'Kg']
    },
    fields: {
      data: { type: 'date', required: true, label: 'Data' },
      turno: { type: 'turno', required: true, label: 'Turno' },
      cliente: { type: 'select', required: true, label: 'Cliente', sourceColumn: 'G' },
      produto: { type: 'select', required: true, label: 'Produto', sourceColumn: 'A' },
      caixas: { type: 'number', required: false, label: 'Caixas' },
      pacotes: { type: 'number', required: false, label: 'Pacotes' },
      unidades: { type: 'number', required: false, label: 'Unidades' },
      kg: { type: 'number', required: false, label: 'Kg' },
    }
  }
};

export function getStageConfig(stage: string): StageConfig | null {
  return STAGES_CONFIG[stage] || null;
}

export function isValidStage(stage: string): boolean {
  return stage in STAGES_CONFIG;
}
