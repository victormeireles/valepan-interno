import { z } from 'zod';
import { AssadeiraCor } from './assadeira-cor';

const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? null : v;

const normalizeCorHex = (value: unknown) => {
  if (value == null) return AssadeiraCor.FALLBACK;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return AssadeiraCor.FALLBACK;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
};

export const assadeiraFormSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  descricao: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable().optional(),
  ),
  unidades_por_assadeira: z
    .number({ error: 'Pães por assadeira é obrigatório' })
    .int('Deve ser um número inteiro')
    .min(1, 'Mínimo 1 pão por assadeira'),
  quantidade: z
    .number({ error: 'Quantidade de assadeiras é obrigatória' })
    .int('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo'),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
  diametro_buracos_mm: z
    .number()
    .positive('Diâmetro deve ser positivo')
    .nullable()
    .optional(),
  cor_hex: z.preprocess(
    normalizeCorHex,
    z
      .string()
      .regex(AssadeiraCor.HEX_PATTERN, 'Use um hexadecimal no formato #RRGGBB'),
  ),
});

export type AssadeiraFormData = z.infer<typeof assadeiraFormSchema>;

export function parseAssadeiraForm(input: unknown) {
  return assadeiraFormSchema.safeParse(input);
}
