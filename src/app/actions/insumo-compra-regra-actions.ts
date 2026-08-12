'use server';

import { revalidatePath } from 'next/cache';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import {
  insumoCompraRegraManager,
  type SalvarInsumoCompraRegraInput,
} from '@/lib/services/insumo-compra-regra-manager';

const INSUMOS_PATH = '/config/insumos';
const SUGESTAO_PATH = '/sugestao-compras';

export async function listarRegrasParaConfig(
  options: { incluirInativos?: boolean } = {},
) {
  await requireInternoModulo('interno_config', 'ler');
  return insumoCompraRegraManager.listarRegrasParaConfig(options);
}

export async function salvarRegra(input: SalvarInsumoCompraRegraInput) {
  await requireInternoModulo('interno_config', 'administrar');
  const regra = await insumoCompraRegraManager.salvarRegra(input);
  revalidatePath(INSUMOS_PATH);
  revalidatePath(SUGESTAO_PATH);
  return regra;
}

export async function aplicarSeedPlanilha() {
  await requireInternoModulo('interno_config', 'administrar');
  const resultado = await insumoCompraRegraManager.aplicarSeedPlanilha();
  revalidatePath(INSUMOS_PATH);
  revalidatePath(SUGESTAO_PATH);
  return resultado;
}
