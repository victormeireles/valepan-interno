'use server';

import { ColaboradorPlanilhaExcel } from '@/domain/pessoas/colaborador-planilha-excel';
import type { ColaboradorPlanilhaOrigem } from '@/domain/pessoas/colaborador-planilha';
import { ColaboradorPlanilhaRowParser } from '@/domain/pessoas/colaborador-planilha-row-parser';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

const SELECT =
  'codigo, nome, situacao, afastamento, lider_setor, data_admissao, pessoas_setores(nome), pessoas_turnos(nome)';

export async function exportarColaboradoresExcel(): Promise<string> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const bytes = new ColaboradorPlanilhaExcel().gerar(await listarParaPlanilha(), getTodayISOInBrazilTimezone());
  return Buffer.from(bytes).toString('base64');
}

async function listarParaPlanilha(): Promise<ColaboradorPlanilhaOrigem[]> {
  const client = supabaseClientFactory.createServiceRoleClient();
  const [colaboradores, avisos] = await Promise.all([
    client.from('pessoas_colaboradores' as never).select(SELECT).neq('situacao', 'desligado').order('nome'),
    client.from('pessoas_avisos' as never).select('pessoas_colaboradores(codigo)').eq('situacao', 'ativo'),
  ]);
  if (colaboradores.error) throw new Error(`Erro ao exportar colaboradores: ${colaboradores.error.message}`);
  if (avisos.error) throw new Error(`Erro ao exportar colaboradores: ${avisos.error.message}`);
  const comAviso = codigosComAviso(avisos.data);
  return new ColaboradorPlanilhaRowParser().parseAll(colaboradores.data).map((item) => ({
    ...item,
    avisoAtivo: comAviso.has(item.codigo),
  }));
}

function codigosComAviso(data: unknown): Set<string> {
  if (!Array.isArray(data)) return new Set();
  return new Set(data.map((row) => codigoDe(row)).filter((codigo) => codigo.length > 0));
}

function codigoDe(row: unknown): string {
  if (!registro(row)) return '';
  const relacao = row.pessoas_colaboradores;
  const pessoa = Array.isArray(relacao) ? relacao[0] : relacao;
  if (!registro(pessoa) || typeof pessoa.codigo !== 'string') return '';
  return pessoa.codigo;
}

function registro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
