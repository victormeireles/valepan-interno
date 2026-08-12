'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import {
  insumoCompraSugestaoService,
  type InsumoCompraSugestaoPageData,
} from '@/lib/services/insumo-compra-sugestao-service';

export async function getInsumoCompraSugestaoPageData(
  dataReferencia?: string,
): Promise<InsumoCompraSugestaoPageData> {
  await requireInternoModulo('interno_insumos', 'ler');
  return insumoCompraSugestaoService.buildPageData(dataReferencia);
}
