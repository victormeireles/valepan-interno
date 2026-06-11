import { z } from 'zod';

const uuidSchema = z.string().uuid('ID inválido');

export const categoriaAssadeiraRegraFormSchema = z
  .object({
    categoria_id: uuidSchema,
    peso_g: z
      .number({ error: 'Peso é obrigatório' })
      .int('Peso deve ser um número inteiro')
      .min(1, 'Peso deve ser ao menos 1 g'),
    assadeira_id: uuidSchema,
    usar_padrao: z.boolean().default(true),
    unidades_por_assadeira: z
      .number()
      .int('Deve ser um número inteiro')
      .min(1, 'Mínimo 1 pão por assadeira')
      .nullable()
      .optional(),
    ordem: z.number().int().min(0).default(0),
    ativo: z.boolean().default(true),
  })
  .transform((data) => ({
    categoria_id: data.categoria_id,
    peso_g: data.peso_g,
    assadeira_id: data.assadeira_id,
    unidades_por_assadeira: data.usar_padrao
      ? null
      : (data.unidades_por_assadeira ?? null),
    ordem: data.ordem ?? 0,
    ativo: data.ativo ?? true,
  }))
  .superRefine((data, ctx) => {
    if (data.unidades_por_assadeira != null && data.unidades_por_assadeira < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mínimo 1 pão por assadeira',
        path: ['unidades_por_assadeira'],
      });
    }
  });

export type CategoriaAssadeiraRegraFormInput = z.input<
  typeof categoriaAssadeiraRegraFormSchema
>;
export type CategoriaAssadeiraRegraFormData = z.output<
  typeof categoriaAssadeiraRegraFormSchema
>;

export function parseCategoriaAssadeiraRegraForm(input: unknown) {
  return categoriaAssadeiraRegraFormSchema.safeParse(input);
}
