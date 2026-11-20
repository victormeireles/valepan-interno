'use server';

import { AfastamentoRotulo } from '@/domain/pessoas/afastamento';
import { QuadroAgrupamento, type HorarioDiaQuadro, type QuadroPessoa, type QuadroSetor } from '@/domain/pessoas/quadro-agrupamento';
import { QuadroAviso } from '@/domain/pessoas/quadro-aviso';
import { QuadroHorarioAnexo, type HorarioTurnoCarga } from '@/domain/pessoas/quadro-horario-anexo';
import { QuadroSetorCatalogo, type SetorCatalogoItem } from '@/domain/pessoas/quadro-setor-catalogo';
import { QuadroVisao } from '@/domain/pessoas/quadro-visao';
import type { Regime } from '@/domain/pessoas/regime-cadastro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const aviso = new QuadroAviso();

export async function listQuadro(): Promise<QuadroSetor[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const [posicoes, alocacoes, catalogo, avisos] = await Promise.all([
    client
      .from('pessoas_posicoes' as never)
      .select('codigo, pessoas_setores(nome, codigo), pessoas_turnos(nome, codigo, operacional)')
      .eq('ativa', true),
    client
      .from('pessoas_alocacoes' as never)
      .select('papel, pessoas_setores(nome), pessoas_turnos(nome, codigo), pessoas_colaboradores(codigo, nome, lider_setor, afastamento, regime, data_desligamento)')
      .is('fim', null),
    client
      .from('pessoas_setores' as never)
      .select('codigo, nome, ordem')
      .eq('ativo', true)
      .order('ordem'),
    client.from('pessoas_avisos' as never).select('pessoas_colaboradores(codigo)').eq('situacao', 'ativo'),
  ]);
  if (posicoes.error) throw new Error(posicoes.error.message);
  if (alocacoes.error) throw new Error(alocacoes.error.message);
  if (catalogo.error) throw new Error(catalogo.error.message);
  if (avisos.error) throw new Error(avisos.error.message);
  const comAviso = new Set(
    ((avisos.data ?? []) as { pessoas_colaboradores: { codigo: string } | { codigo: string }[] | null }[])
      .map((row) => codigoDe(row.pessoas_colaboradores))
      .filter(Boolean),
  );
  const pessoas = ((alocacoes.data ?? []) as AlocacaoRow[]).map((row) => paraPessoa(row, comAviso));
  const linhas = new QuadroVisao().montar(
    ((posicoes.data ?? []) as PosicaoRow[]).map((row) => ({
      setorNome: nomeDe(row.pessoas_setores),
      turnoNome: nomeDe(row.pessoas_turnos),
      turnoCodigo: codigoDe(row.pessoas_turnos),
      operacional: operacionalDe(row.pessoas_turnos),
    })),
    pessoas.map((pessoa) => ({
      setorNome: pessoa.setorNome,
      turnoNome: '',
      turnoCodigo: pessoa.turnoCodigo,
      papel: pessoa.papel,
      avisoAtivo: aviso.ocupaVaga(pessoa),
    })),
  );
  const anexo = new QuadroHorarioAnexo();
  const dados = await horarios(client);
  const agrupados = new QuadroAgrupamento().agrupar(anexo.completar(linhas, dados), pessoas);
  const comHorario = anexo.aplicar(agrupados, dados);
  return new QuadroSetorCatalogo().completar(comHorario, (catalogo.data ?? []) as SetorCatalogoItem[]);
}

async function horarios(
  client: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
): Promise<HorarioTurnoCarga[]> {
  const { data, error } = await client
    .from('pessoas_turnos' as never)
    .select('codigo, nome, operacional, pessoas_setores(nome, codigo), pessoas_turno_dias(dia, inicio, fim, termina_dia_seguinte, situacao)')
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as TurnoDiaRow[]).map(paraHorario);
}

type TurnoRef = { nome: string; codigo: string; operacional?: boolean };

type PosicaoRow = {
  pessoas_setores: { nome: string; codigo?: string } | { nome: string; codigo?: string }[] | null;
  pessoas_turnos: TurnoRef | TurnoRef[] | null;
};

type TurnoDiaRow = {
  codigo: string;
  nome: string;
  operacional: boolean | null;
  pessoas_setores: { nome: string; codigo: string } | { nome: string; codigo: string }[] | null;
  pessoas_turno_dias: DiaRow[] | DiaRow | null;
};

type DiaRow = {
  dia: number;
  inicio: string | null;
  fim: string | null;
  termina_dia_seguinte: boolean;
  situacao: HorarioDiaQuadro['situacao'];
};

type AlocacaoRow = {
  papel: QuadroPessoa['papel'];
  pessoas_setores: { nome: string } | { nome: string }[] | null;
  pessoas_turnos: { nome: string; codigo: string } | { nome: string; codigo: string }[] | null;
  pessoas_colaboradores: ColaboradorAlocadoRow | ColaboradorAlocadoRow[] | null;
};

type ColaboradorAlocadoRow = {
  codigo: string;
  nome: string;
  lider_setor: boolean;
  afastamento: string | null;
  regime: Regime | null;
  data_desligamento: string | null;
};

function paraPessoa(row: AlocacaoRow, comAviso: Set<string>): QuadroPessoa {
  const pessoa = Array.isArray(row.pessoas_colaboradores) ? row.pessoas_colaboradores[0] : row.pessoas_colaboradores;
  const codigo = pessoa?.codigo ?? '';
  return {
    codigo,
    nome: pessoa?.nome ?? '',
    papel: row.papel,
    afastamento: new AfastamentoRotulo().ler(pessoa?.afastamento),
    lider: pessoa?.lider_setor === true,
    regime: pessoa?.regime ?? 'clt',
    avisoAtivo: comAviso.has(codigo),
    dataDesligamento: pessoa?.data_desligamento ?? null,
    setorNome: nomeDe(row.pessoas_setores),
    turnoCodigo: codigoDe(row.pessoas_turnos),
  };
}

function paraHorario(row: TurnoDiaRow): HorarioTurnoCarga {
  const setor = Array.isArray(row.pessoas_setores) ? row.pessoas_setores[0] : row.pessoas_setores;
  const dias = Array.isArray(row.pessoas_turno_dias) ? row.pessoas_turno_dias : row.pessoas_turno_dias ? [row.pessoas_turno_dias] : [];
  return {
    turnoCodigo: row.codigo,
    turnoNome: row.nome,
    setorNome: setor?.nome ?? '',
    setorCodigo: setor?.codigo ?? '',
    operacional: row.operacional !== false,
    dias: [...dias]
      .sort((a, b) => a.dia - b.dia)
      .map((dia) => ({
        dia: dia.dia,
        inicio: dia.inicio,
        fim: dia.fim,
        terminaDiaSeguinte: dia.termina_dia_seguinte,
        situacao: dia.situacao,
      })),
  };
}

function nomeDe(valor: { nome: string } | { nome: string }[] | null): string {
  if (!valor) return '';
  return Array.isArray(valor) ? valor[0]?.nome ?? '' : valor.nome;
}

function codigoDe(valor: { codigo: string } | { codigo: string }[] | null): string {
  if (!valor) return '';
  return Array.isArray(valor) ? valor[0]?.codigo ?? '' : valor.codigo;
}

function operacionalDe(valor: TurnoRef | TurnoRef[] | null): boolean {
  if (!valor) return true;
  const turno = Array.isArray(valor) ? valor[0] : valor;
  return turno?.operacional !== false;
}
