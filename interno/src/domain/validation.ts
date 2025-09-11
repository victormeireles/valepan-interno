import { z } from 'zod';

// Schema para data (formato YYYY-MM-DD)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD');

// Schema para turno (1 ou 2)
const turnoSchema = z.union([z.literal(1), z.literal(2)]);

// Schema para números que podem ser inteiros ou inteiros + 0.5
const halfStepNumberSchema = z.number()
  .min(0, 'Valor deve ser maior ou igual a zero')
  .refine(
    (val) => {
      // Verificar se é um número inteiro ou inteiro + 0.5
      return Number.isInteger(val) || Number.isInteger(val * 2);
    },
    'Valor deve ser um número inteiro ou inteiro + 1/2'
  );

// Schema para números inteiros
const integerSchema = z.number()
  .int('Valor deve ser um número inteiro')
  .min(0, 'Valor deve ser maior ou igual a zero');

// Schema para string não vazia
const nonEmptyStringSchema = z.string()
  .min(1, 'Campo é obrigatório')
  .trim();

// Schema base para todas as etapas
const baseStageSchema = z.object({
  data: dateSchema,
  turno: turnoSchema,
});

// Schema para Pré-Mistura
export const preMisturaSchema = baseStageSchema.extend({
  preMistura: nonEmptyStringSchema,
  quantidade: halfStepNumberSchema,
});

// Schema para Massa
export const massaSchema = baseStageSchema.extend({
  massa: nonEmptyStringSchema,
  quantidade: halfStepNumberSchema,
});

// Schema para Fermentação
export const fermentacaoSchema = baseStageSchema.extend({
  fermentacao: nonEmptyStringSchema,
  carrinhos: halfStepNumberSchema,
  assadeiras: integerSchema,
  unidades: integerSchema,
});

// Schema para Resfriamento
export const resfriamentoSchema = baseStageSchema.extend({
  produto: nonEmptyStringSchema,
  carrinhos: halfStepNumberSchema,
  assadeiras: integerSchema,
  unidades: integerSchema,
});

// Schema para Forno
export const fornoSchema = baseStageSchema.extend({
  produto: nonEmptyStringSchema,
  carrinhos: halfStepNumberSchema,
  assadeiras: integerSchema,
  unidades: integerSchema,
});

// Mapeamento de schemas por etapa
export const stageSchemas = {
  'pre-mistura': preMisturaSchema,
  'massa': massaSchema,
  'fermentacao': fermentacaoSchema,
  'resfriamento': resfriamentoSchema,
  'forno': fornoSchema,
} as const;

// Função para obter schema por etapa
export function getStageSchema(stage: string) {
  const schema = stageSchemas[stage as keyof typeof stageSchemas];
  if (!schema) {
    throw new Error(`Etapa '${stage}' não é válida`);
  }
  return schema;
}

// Função para validar dados de uma etapa
export function validateStageData(stage: string, data: unknown) {
  const schema = getStageSchema(stage);
  return schema.parse(data);
}

// Função para formatar data para hoje (YYYY-MM-DD)
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função para converter string de número com 1/2 para decimal
export function parseHalfStepNumber(value: string): number {
  const trimmed = value.trim();
  
  // Se contém "1/2", converter para decimal
  if (trimmed.includes('1/2')) {
    const base = trimmed.replace(/\s*1\/2\s*$/, '').trim();
    const baseNum = parseFloat(base);
    if (isNaN(baseNum)) {
      throw new Error('Formato inválido para número com 1/2');
    }
    return baseNum + 0.5;
  }
  
  // Caso contrário, converter normalmente
  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    throw new Error('Formato inválido para número');
  }
  return num;
}

// Função para formatar número decimal para exibição (3.5 -> "3 1/2")
export function formatHalfStepNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  
  const integerPart = Math.floor(value);
  const decimalPart = value - integerPart;
  
  if (Math.abs(decimalPart - 0.5) < 0.001) {
    return `${integerPart} 1/2`;
  }
  
  return value.toString();
}
