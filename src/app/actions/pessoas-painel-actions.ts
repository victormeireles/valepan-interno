'use server';

import { ColaboradorCsv } from '@/domain/pessoas/colaborador-csv';
import type { Regime } from '@/domain/pessoas/regime-cadastro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type PainelPessoas = {
  ativos: number;
  afastados: number;
  admissoes: number;
  avisos: number;
  livres: number;
  faltas: number;
};

export async function painelPessoas(inicio: string, fim: string): Promise<PainelPessoas> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const [ativos, afastados, admissoes, avisos, posicoes, ocupadas, faltas] = await Promise.all([
    client.from('pessoas_colaboradores' as never).select('id', { count: 'exact', head: true }).eq('situacao', 'ativo'),
    client.from('pessoas_colaboradores' as never).select('id', { count: 'exact', head: true }).eq('situacao', 'afastado'),
    client.from('pessoas_colaboradores' as never).select('id', { count: 'exact', head: true }).eq('situacao', 'admissao_prevista').is('previsao_encerrada_em', null),
    client.from('pessoas_avisos' as never).select('id', { count: 'exact', head: true }).eq('situacao', 'ativo'),
    client.from('pessoas_posicoes' as never).select('id', { count: 'exact', head: true }).eq('ativa', true),
    client.from('pessoas_alocacoes' as never).select('id', { count: 'exact', head: true }).is('fim', null).not('posicao_id', 'is', null),
    client.from('pessoas_faltas' as never).select('id', { count: 'exact', head: true }).gte('data', inicio).lte('data', fim).is('cancelada_em', null),
  ]);
  const erro = [ativos, afastados, admissoes, avisos, posicoes, ocupadas, faltas].find((item) => item.error);
  if (erro?.error) throw new Error(erro.error.message);
  return {
    ativos: ativos.count ?? 0,
    afastados: afastados.count ?? 0,
    admissoes: admissoes.count ?? 0,
    avisos: avisos.count ?? 0,
    livres: (posicoes.count ?? 0) - (ocupadas.count ?? 0),
    faltas: faltas.count ?? 0,
  };
}

export async function exportarColaboradoresCsv(): Promise<string> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select('codigo, nome, cpf, situacao, regime, cnpj, razao_social')
    .order('nome');
  if (error) throw new Error(error.message);
  const linhas = ((data ?? []) as LinhaExportacao[]).map((row) => ({
    codigo: row.codigo,
    nome: row.nome,
    cpf: row.cpf,
    situacao: row.situacao,
    regime: row.regime ?? 'clt',
    cnpj: row.cnpj,
    razaoSocial: row.razao_social,
  }));
  return new ColaboradorCsv().gerar(linhas);
}

type LinhaExportacao = {
  codigo: string;
  nome: string;
  cpf: string | null;
  situacao: string;
  regime: Regime | null;
  cnpj: string | null;
  razao_social: string | null;
};
