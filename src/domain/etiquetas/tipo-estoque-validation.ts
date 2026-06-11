import { z } from 'zod';

export const tipoEstoqueFormSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  ativo: z.boolean().default(true),
  possui_etiqueta: z.boolean().default(false),
  congelado: z.boolean().default(false),
  mostrar_texto_congelado: z.boolean().default(false),
});

export type TipoEstoqueFormInput = z.input<typeof tipoEstoqueFormSchema>;
export type TipoEstoqueFormData = z.output<typeof tipoEstoqueFormSchema>;

export function parseTipoEstoqueForm(input: unknown) {
  return tipoEstoqueFormSchema.safeParse(input);
}
