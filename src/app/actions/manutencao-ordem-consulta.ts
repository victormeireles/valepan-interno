'use server';

import { FilaFundacao } from '@/domain/manutencao/fila-fundacao';
import { FilaOrdem, type FilaItem } from '@/domain/manutencao/fila-ordem';
import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import { OrdemCancelamento } from '@/domain/manutencao/ordem-cancelamento';
import { OrdemPermissao } from '@/domain/manutencao/ordem-permissao';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import {
  OrdemLeitura,
  type ClienteOrdem,
  type PecaOrdemVista,
} from './manutencao-ordem-leitura';

export type { PecaOrdemVista } from './manutencao-ordem-leitura';

const MODULOS_ORDEM: readonly InternoModuloId[] = [
  'interno_manutencao',
  'interno_manutencao_solicitacao',
];

const MOTIVO_SONDA = 'motivo';

export type LinhaFila = {
  numero: number;
  maquinaNome: string;
  setorNome: string;
  urgencia: string | null;
  tipoProblema: string | null;
  tipo: 'corretiva' | 'preventiva';
  status: 'aberta' | 'recebida';
  recebidaPorNome: string | null;
  abertaEm: string;
};

export type FilaListada = { mensagem?: string; itens: LinhaFila[] };

export type OrdemCarregada = {
  numero: number;
  tipo: 'corretiva' | 'preventiva';
  status: 'aberta' | 'recebida' | 'finalizada' | 'cancelada';
  maquinaNome: string;
  setorNome: string;
  urgencia: string | null;
  tipoProblema: string | null;
  descricao: string;
  abertaEm: string;
  abertaPorNome: string | null;
  recebidaEm: string | null;
  recebidaPorNome: string | null;
  inicioEm: string | null;
  fimEm: string | null;
  servicos: string | null;
  canceladaEm: string | null;
  canceladaPorNome: string | null;
  cancelamentoMotivo: string | null;
  custoPecasCentavos: number | null;
  pecas: PecaOrdemVista[];
  ajudantes: { nome: string }[];
  podeReceber: boolean;
  podeDevolver: boolean;
  podeFinalizar: boolean;
  podeCancelar: boolean;
  exigeMotivo: boolean;
};

type FilaBruta = {
  numero: number;
  maquina_id: string;
  setor_id: string;
  urgencia: string | null;
  tipo_problema: string | null;
  tipo: string;
  status: string;
  recebida_por: string | null;
  aberta_em: string;
};
type OrdemBruta = {
  id: string;
  numero: number;
  tipo: string;
  status: string;
  maquina_id: string;
  setor_id: string;
  urgencia: string | null;
  tipo_problema: string | null;
  descricao: string;
  aberta_em: string;
  aberta_por: string | null;
  recebida_em: string | null;
  recebida_por: string | null;
  inicio_em: string | null;
  fim_em: string | null;
  servicos: string | null;
  cancelada_em: string | null;
  cancelada_por: string | null;
  cancelamento_motivo: string | null;
  custo_pecas_centavos: number;
};
type NomesOrdem = {
  pessoas: Map<string, string>;
  maquinas: Map<string, string>;
  setores: Map<string, string>;
};
type CorpoOrdem = Omit<
  OrdemCarregada,
  | 'pecas'
  | 'ajudantes'
  | 'podeReceber'
  | 'podeDevolver'
  | 'podeFinalizar'
  | 'podeCancelar'
  | 'exigeMotivo'
>;

export async function listarFila(): Promise<FilaListada> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(MODULOS_ORDEM, 'ler');
  const veTodas = new ManutencaoAcesso().veTodas(snap);
  const client = supabaseClientFactory.createServiceRoleClient();
  const leitura = new OrdemLeitura(client);
  const setores = veTodas ? [] : await leitura.setoresElegiveis(usuarioId);
  if (!veTodas && setores.length === 0) return filaVazia(false, 0);
  const itens = await montarFila(leitura, await lerFila(client, veTodas ? null : setores));
  if (itens.length === 0) return filaVazia(veTodas, setores.length);
  return { itens };
}

export async function carregarOrdem(numero: number): Promise<OrdemCarregada | null> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(MODULOS_ORDEM, 'ler');
  if (!Number.isInteger(numero) || numero <= 0) return null;
  const client = supabaseClientFactory.createServiceRoleClient();
  const leitura = new OrdemLeitura(client);
  const ordem = await lerOrdem(client, numero);
  if (!ordem || !(await podeVer(leitura, snap, usuarioId, ordem.setor_id))) return null;
  return comporOrdem(leitura, ordem, snap, usuarioId);
}

function filaVazia(veTodas: boolean, setoresValidos: number): FilaListada {
  return { mensagem: new FilaFundacao().mensagem(veTodas, setoresValidos), itens: [] };
}

async function lerFila(client: ClienteOrdem, setores: string[] | null): Promise<FilaBruta[]> {
  const consulta = client
    .from('manutencao_ordens' as never)
    .select(
      'numero, maquina_id, setor_id, urgencia, tipo_problema, tipo, status, recebida_por, aberta_em',
    )
    .in('status', ['aberta', 'recebida']);
  const filtrada = setores ? consulta.in('setor_id', setores) : consulta;
  const { data, error } = await filtrada;
  if (error) throw new Error(error.message);
  return (data ?? []) as FilaBruta[];
}

async function montarFila(leitura: OrdemLeitura, brutas: FilaBruta[]): Promise<LinhaFila[]> {
  const [maquinas, setores, pessoas] = await Promise.all([
    leitura.nomesPorId('manutencao_maquinas', brutas.map((linha) => linha.maquina_id)),
    leitura.nomesPorId('pessoas_setores', brutas.map((linha) => linha.setor_id)),
    leitura.nomesPorId(
      'usuarios',
      brutas.flatMap((linha) => (linha.recebida_por ? [linha.recebida_por] : [])),
    ),
  ]);
  const linhas = brutas.flatMap((linha) => {
    const pronta = paraLinhaFila(linha, maquinas, setores, pessoas);
    return pronta ? [pronta] : [];
  });
  return ordenarFila(linhas);
}

function paraLinhaFila(
  linha: FilaBruta,
  maquinas: Map<string, string>,
  setores: Map<string, string>,
  pessoas: Map<string, string>,
): LinhaFila | null {
  const tipo = tipoOrdem(linha.tipo);
  const status = statusFila(linha.status);
  if (!tipo || !status) return null;
  return {
    numero: linha.numero,
    maquinaNome: maquinas.get(linha.maquina_id) ?? '',
    setorNome: setores.get(linha.setor_id) ?? '',
    urgencia: linha.urgencia,
    tipoProblema: linha.tipo_problema,
    tipo,
    status,
    recebidaPorNome: linha.recebida_por ? (pessoas.get(linha.recebida_por) ?? null) : null,
    abertaEm: linha.aberta_em,
  };
}

function ordenarFila(linhas: LinhaFila[]): LinhaFila[] {
  const porNumero = new Map(linhas.map((linha) => [linha.numero, linha]));
  return new FilaOrdem().ordenar(linhas.map(paraItemFila)).flatMap((item) => {
    const linha = porNumero.get(item.numero);
    return linha ? [linha] : [];
  });
}

function paraItemFila(linha: LinhaFila): FilaItem {
  return {
    numero: linha.numero,
    tipo: linha.tipo,
    urgencia: linha.urgencia,
    status: linha.status,
    abertaEm: linha.abertaEm,
  };
}

async function lerOrdem(client: ClienteOrdem, numero: number): Promise<OrdemBruta | null> {
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select(
      'id, numero, tipo, status, maquina_id, setor_id, urgencia, tipo_problema, descricao, aberta_em, aberta_por, recebida_em, recebida_por, inicio_em, fim_em, servicos, cancelada_em, cancelada_por, cancelamento_motivo, custo_pecas_centavos',
    )
    .eq('numero', numero)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrdemBruta | null) ?? null;
}

async function podeVer(
  leitura: OrdemLeitura,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
  setorId: string,
): Promise<boolean> {
  const acesso = new ManutencaoAcesso();
  const setores = acesso.veTodas(snap) ? [] : await leitura.setoresElegiveis(usuarioId);
  return new OrdemPermissao().veDetalhe(acesso.veTodas(snap), setores, setorId);
}

async function comporOrdem(
  leitura: OrdemLeitura,
  ordem: OrdemBruta,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
): Promise<OrdemCarregada | null> {
  const tipo = tipoOrdem(ordem.tipo);
  const status = statusOrdem(ordem.status);
  if (!tipo || !status) return null;
  const veValores = new ManutencaoAcesso().veTodas(snap);
  const nomes = await nomesDaOrdem(leitura, ordem);
  return {
    ...camposOrdem(ordem, tipo, status, nomes, veValores),
    pecas: await leitura.pecas(ordem.id, veValores),
    ajudantes: await leitura.ajudantes(ordem.id),
    ...flagsDaOrdem(ordem, snap, usuarioId),
  };
}

async function nomesDaOrdem(leitura: OrdemLeitura, ordem: OrdemBruta): Promise<NomesOrdem> {
  const pessoasIds = [ordem.aberta_por, ordem.recebida_por, ordem.cancelada_por].filter(
    (id): id is string => Boolean(id),
  );
  const [pessoas, maquinas, setores] = await Promise.all([
    leitura.nomesPorId('usuarios', pessoasIds),
    leitura.nomesPorId('manutencao_maquinas', [ordem.maquina_id]),
    leitura.nomesPorId('pessoas_setores', [ordem.setor_id]),
  ]);
  return { pessoas, maquinas, setores };
}

function camposOrdem(
  ordem: OrdemBruta,
  tipo: 'corretiva' | 'preventiva',
  status: OrdemCarregada['status'],
  nomes: NomesOrdem,
  veValores: boolean,
): CorpoOrdem {
  return {
    numero: ordem.numero,
    tipo,
    status,
    maquinaNome: nomes.maquinas.get(ordem.maquina_id) ?? '',
    setorNome: nomes.setores.get(ordem.setor_id) ?? '',
    urgencia: ordem.urgencia,
    tipoProblema: ordem.tipo_problema,
    descricao: ordem.descricao,
    abertaEm: ordem.aberta_em,
    abertaPorNome: nomeDe(nomes.pessoas, ordem.aberta_por),
    recebidaEm: ordem.recebida_em,
    recebidaPorNome: nomeDe(nomes.pessoas, ordem.recebida_por),
    inicioEm: ordem.inicio_em,
    fimEm: ordem.fim_em,
    servicos: ordem.servicos,
    canceladaEm: ordem.cancelada_em,
    canceladaPorNome: nomeDe(nomes.pessoas, ordem.cancelada_por),
    cancelamentoMotivo: ordem.cancelamento_motivo,
    custoPecasCentavos: veValores ? ordem.custo_pecas_centavos : null,
  };
}

function flagsDaOrdem(ordem: OrdemBruta, snap: UsuarioAuthzSnapshot, usuarioId: string) {
  const acesso = new ManutencaoAcesso();
  const podeConcluir = podeDevolverOuFinalizar(ordem, snap, usuarioId);
  const cancelamento = decisaoCancelamento(ordem, snap);
  return {
    podeReceber: ordem.status === 'aberta' && acesso.executaOficina(snap),
    podeDevolver: podeConcluir,
    podeFinalizar: podeConcluir,
    podeCancelar: cancelamento?.ok === true,
    exigeMotivo: cancelamento?.ok === true && cancelamento.exigeMotivo,
  };
}

function podeDevolverOuFinalizar(
  ordem: OrdemBruta,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
): boolean {
  if (ordem.status !== 'recebida' || !ordem.recebida_por) return false;
  return new OrdemPermissao().devolveOuFinaliza({
    status: 'recebida',
    recebidoPor: ordem.recebida_por,
    usuarioId,
    administra: new ManutencaoAcesso().administra(snap),
  });
}

function decisaoCancelamento(ordem: OrdemBruta, snap: UsuarioAuthzSnapshot) {
  const tipo = tipoOrdem(ordem.tipo);
  if (!tipo) return null;
  const acesso = new ManutencaoAcesso();
  return new OrdemCancelamento().permite({
    status: ordem.status,
    tipo,
    solicitacaoEditar: new InternoAccessManager().temModulo(
      snap,
      'interno_manutencao_solicitacao',
      'editar',
    ),
    manutencaoEditar: acesso.executaOficina(snap),
    manutencaoAdministrar: acesso.administra(snap),
    motivo: MOTIVO_SONDA,
  });
}

function nomeDe(nomes: Map<string, string>, id: string | null): string | null {
  if (!id) return null;
  return nomes.get(id) ?? null;
}

function tipoOrdem(valor: string): 'corretiva' | 'preventiva' | null {
  if (valor === 'corretiva' || valor === 'preventiva') return valor;
  return null;
}

function statusFila(valor: string): 'aberta' | 'recebida' | null {
  if (valor === 'aberta' || valor === 'recebida') return valor;
  return null;
}

function statusOrdem(valor: string): OrdemCarregada['status'] | null {
  if (valor === 'aberta' || valor === 'recebida' || valor === 'finalizada' || valor === 'cancelada') {
    return valor;
  }
  return null;
}
