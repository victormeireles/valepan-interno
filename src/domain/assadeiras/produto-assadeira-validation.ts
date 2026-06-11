import { z } from 'zod';

const uuidSchema = z.string().uuid('ID inválido');

export const produtoAssadeiraLinkFormSchema = z
  .object({
    produto_id: uuidSchema,
    assadeira_id: uuidSchema,
    usar_padrao: z.boolean().default(true),
    unidades_por_assadeira: z
      .number()
      .int('Deve ser um número inteiro')
      .min(1, 'Mínimo 1 pão por assadeira')
      .nullable()
      .optional(),
  })
  .transform((data) => ({
    produto_id: data.produto_id,
    assadeira_id: data.assadeira_id,
    unidades_por_assadeira: data.usar_padrao
      ? null
      : (data.unidades_por_assadeira ?? null),
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

export type ProdutoAssadeiraLinkFormInput = z.input<
  typeof produtoAssadeiraLinkFormSchema
>;
export type ProdutoAssadeiraLinkFormData = z.output<
  typeof produtoAssadeiraLinkFormSchema
>;

export function parseProdutoAssadeiraLinkForm(input: unknown) {
  return produtoAssadeiraLinkFormSchema.safeParse(input);
}
