'use server';

import { FolhaAprovados } from '@/domain/pessoas/folha-aprovados';
import { FolhaLeitura } from '@/domain/pessoas/folha-leitura';
import type { FolhaPacote } from '@/domain/pessoas/folha-balde';
import { PlanoSaudeFaixaLeitura } from '@/domain/pessoas/plano-saude-faixa';
import {
  FolhaResumo,
  type FolhaGrupoFiltro,
  type FolhaPessoa,
  type FolhaRegimeFiltro,
  type FolhaResumoVista,
} from '@/domain/pessoas/folha-resumo';
import { FolhaVigente } from '@/domain/pessoas/folha-vigente';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export type FolhaCarregada = { hoje: string; vista: FolhaResumoVista };

export async function resumirFolha(regime: FolhaRegimeFiltro, grupo: FolhaGrupoFiltro = ''): Promise<FolhaCarregada> {
  await requireInternoModulo('interno_pessoas', 'administrar');
  const hoje = getTodayISOInBrazilTimezone();
  const bruto = await carregar(hoje);
  const leitura = new FolhaLeitura();
  const vigentes = new FolhaVigente().porPessoa(leitura.vigencias(bruto.vigencias), hoje);
  const pessoas = leitura.colaboradores(bruto.colaboradores).map((pessoa) => paraPessoa(pessoa, vigentes));
  const aprovados = new FolhaAprovados().montar(leitura.setores(bruto.setores), leitura.posicoes(bruto.posicoes));
  const faixas = new PlanoSaudeFaixaLeitura().parseAll(bruto.faixas);
  return { hoje, vista: new FolhaResumo().montar(pessoas, aprovados, regime, grupo, { faixas, hoje }) };
}

function paraPessoa(
  pessoa: ReturnType<FolhaLeitura['colaboradores']>[number],
  vigentes: Map<string, FolhaPacote>,
): FolhaPessoa {
  return {
    nome: pessoa.nome,
    situacao: pessoa.situacao,
    setorNome: pessoa.setorNome,
    regime: pessoa.regime,
    nascimento: pessoa.nascimento,
    pacote: vigentes.get(pessoa.id) ?? null,
  };
}

async function carregar(hoje: string) {
  const client = supabaseClientFactory.createServiceRoleClient();
  const [colaboradores, vigencias, setores, posicoes, faixas] = await Promise.all([
    client
      .from('pessoas_colaboradores' as never)
      .select('id, nome, situacao, regime, nascimento, pessoas_setores(nome)')
      .in('situacao', ['ativo', 'afastado', 'admissao_prevista']),
    client
      .from('pessoas_remuneracao_vigencias' as never)
      .select('colaborador_id, inicio, salario_centavos, vale_transporte_centavos, vale_alimentacao_centavos, plano_saude')
      .lte('inicio', hoje),
    client.from('pessoas_setores' as never).select('nome, ordem').eq('ativo', true),
    client.from('pessoas_posicoes' as never).select('pessoas_setores(nome)').eq('ativa', true),
    client.from('pessoas_plano_saude_faixas' as never).select('id, idade_min, idade_max, valor_centavos, ordem'),
  ]);
  return {
    colaboradores: dado(colaboradores, 'colaboradores'),
    vigencias: dado(vigencias, 'vigências'),
    setores: dado(setores, 'setores'),
    posicoes: dado(posicoes, 'vagas'),
    faixas: dado(faixas, 'plano de saúde'),
  };
}

function dado(resultado: { data: unknown; error: { message: string } | null }, origem: string): unknown {
  if (resultado.error) throw new Error(`Erro ao ler a folha (${origem}): ${resultado.error.message}`);
  return resultado.data;
}
