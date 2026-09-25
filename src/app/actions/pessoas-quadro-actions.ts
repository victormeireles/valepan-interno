'use server';

import { QuadroAgrupamento, type HorarioDiaQuadro, type QuadroPessoa, type QuadroSetor } from '@/domain/pessoas/quadro-agrupamento';
import { QuadroHorarioAnexo, type HorarioTurnoCarga } from '@/domain/pessoas/quadro-horario-anexo';
import { QuadroVisao } from '@/domain/pessoas/quadro-visao';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export async function listQuadro(): Promise<QuadroSetor[]> {
  await requireInternoModulo('interno_pessoas', 'ler');
  const client = supabaseClientFactory.createServiceRoleClient();
  const posicoes = await client
    .from('pessoas_posicoes' as never)
    .select('codigo, pessoas_setores(nome, codigo), pessoas_turnos(nome, codigo)')
    .eq('ativa', true);
  const alocacoes = await client
    .from('pessoas_alocacoes' as never)
    .select('papel, pessoas_setores(nome), pessoas_turnos(nome, codigo), pessoas_colaboradores(codigo, nome, lider_setor)')
    .is('fim', null);
  if (posicoes.error) throw new Error(posicoes.error.message);
  if (alocacoes.error) throw new Error(alocacoes.error.message);
  const pessoas = ((alocacoes.data ?? []) as AlocacaoRow[]).map(paraPessoa);
  const linhas = new QuadroVisao().montar(
    ((posicoes.data ?? []) as PosicaoRow[]).map((row) => ({
      setorNome: nomeDe(row.pessoas_setores),
      turnoNome: nomeDe(row.pessoas_turnos),
      turnoCodigo: codigoDe(row.pessoas_turnos),
    })),
    pessoas.map((pessoa) => ({
      setorNome: pessoa.setorNome,
      turnoNome: '',
      turnoCodigo: pessoa.turnoCodigo,
      papel: pessoa.papel,
    })),
  );
  const anexo = new QuadroHorarioAnexo();
  const cargas = await horarios(client);
  const setores = new QuadroAgrupamento().agrupar(anexo.completar(linhas, cargas), pessoas);
  return anexo.aplicar(setores, cargas);
}

async function horarios(
  client: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
): Promise<HorarioTurnoCarga[]> {
  const { data, error } = await client
    .from('pessoas_turnos' as never)
    .select('codigo, nome, pessoas_setores(nome, codigo), pessoas_turno_dias(dia, inicio, fim, termina_dia_seguinte, situacao)')
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as TurnoDiaRow[]).map(paraHorario);
}

type PosicaoRow = {
  pessoas_setores: { nome: string; codigo?: string } | { nome: string; codigo?: string }[] | null;
  pessoas_turnos: { nome: string; codigo: string } | { nome: string; codigo: string }[] | null;
};

type TurnoDiaRow = {
  codigo: string;
  nome: string;
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
  pessoas_colaboradores: { codigo: string; nome: string; lider_setor: boolean } | { codigo: string; nome: string; lider_setor: boolean }[] | null;
};

function paraPessoa(row: AlocacaoRow): QuadroPessoa {
  const pessoa = Array.isArray(row.pessoas_colaboradores) ? row.pessoas_colaboradores[0] : row.pessoas_colaboradores;
  return {
    codigo: pessoa?.codigo ?? '',
    nome: pessoa?.nome ?? '',
    papel: row.papel,
    lider: pessoa?.lider_setor === true,
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
