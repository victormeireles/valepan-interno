import { z } from 'zod';
import { loteFromDataFabricacaoEtiqueta } from '@/domain/embalagem/lote-from-data-fabricacao';

const REQUEST_SCHEMA = z.object({
  produtoId: z.uuid().optional(),
  produto: z.string().trim().min(1).optional(),
  nomeEtiqueta: z.string().trim().max(120).optional(),
  dataFabricacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
    (date) => loteFromDataFabricacaoEtiqueta(date) !== undefined,
  ),
  lote: z.number().int().positive(),
  diasValidade: z.number().int().min(1).max(365).optional(),
}).refine((request) => Boolean(request.produtoId || request.produto));

export class EtiquetaRequestParser {
  parse(input: unknown) { return REQUEST_SCHEMA.safeParse(input); }
}
