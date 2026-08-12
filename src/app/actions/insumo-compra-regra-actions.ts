'use server';

import { revalidatePath } from 'next/cache';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import {
  insumoCompraRegraManager,
  type SalvarInsumoCompraRegraInput,
} from '@/lib/services/insumo-compra-regra-manager';

const CONFIG_PATH = '/config/regras-compra-insumos';
const SUGESTAO_PATH = '/sugestao-compras';

export async function listarRegrasParaConfig() {
  await requireInternoModulo('interno_config', 'ler');
  return insumoCompraRegraManager.listarRegrasParaConfig();
}

export async function salvarRegra(input: SalvarInsumoCompraRegraInput) {
  await requireInternoModulo('interno_config', 'administrar');
  const regra = await insumoCompraRegraManager.salvarRegra(input);
  revalidatePath(CONFIG_PATH);
  revalidatePath(SUGESTAO_PATH);
  return regra;
}

export async function aplicarSeedPlanilha() {
  await requireInternoModulo('interno_config', 'administrar');
  const resultado = await insumoCompraRegraManager.aplicarSeedPlanilha();
  revalidatePath(CONFIG_PATH);
  revalidatePath(SUGESTAO_PATH);
  return resultado;
}
