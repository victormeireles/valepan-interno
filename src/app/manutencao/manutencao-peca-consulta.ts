'use server';

import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { CustoMedio } from '@/domain/manutencao/custo-medio';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type PecaItem = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  saldo: string;
  custoMedioCentavos: number | null;
  ativo: boolean;
  valorCentavos: number;
};

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type PecaRow = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  saldo: string | number;
  custo_medio_centavos: number | null;
  ativo: boolean;
};

export async function listarPecas(): Promise<PecaItem[]> {
  await requireInternoModulo('interno_manutencao', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const linhas = await lerPecas(client);
  return linhas.map(paraItem).sort(porNomePtBr);
}

async function lerPecas(client: Cliente): Promise<PecaRow[]> {
  const { data, error } = await client
    .from('manutencao_pecas' as never)
    .select('id, codigo, nome, unidade, saldo, custo_medio_centavos, ativo');
  if (error) throw new Error(error.message);
  return (data ?? []) as PecaRow[];
}

function paraItem(linha: PecaRow): PecaItem {
  const saldo = typeof linha.saldo === 'string' ? linha.saldo : String(linha.saldo);
  const custoMedioCentavos = linha.custo_medio_centavos ?? null;
  return {
    id: linha.id,
    codigo: linha.codigo,
    nome: linha.nome,
    unidade: linha.unidade,
    saldo,
    custoMedioCentavos,
    ativo: linha.ativo,
    valorCentavos: new CustoMedio().valorCentavos(
      new ConversorSaldo().emMilesimos(saldo),
      custoMedioCentavos,
    ),
  };
}

function porNomePtBr(esquerda: PecaItem, direita: PecaItem): number {
  return esquerda.nome.localeCompare(direita.nome, 'pt-BR');
}
