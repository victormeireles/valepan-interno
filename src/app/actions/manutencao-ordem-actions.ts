'use server';

import {
  ManutencaoAcesso,
  MODULOS_MANUTENCAO_ENTRADA,
} from '@/domain/manutencao/manutencao-acesso';
import { ManutencaoSetoresPorModulo } from '@/domain/manutencao/manutencao-setores-por-modulo';
import { OrdemAbertura, type AberturaEntrada } from '@/domain/manutencao/ordem-abertura';
import { OrdemCancelamento } from '@/domain/manutencao/ordem-cancelamento';
import { OrdemPermissao } from '@/domain/manutencao/ordem-permissao';
import {
  OrdemRemocao,
  type AvaliacaoRemocaoOrdem,
} from '@/domain/manutencao/ordem-remocao';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import {
  requireInternoModulo,
  requireInternoQualquerModulo,
} from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { FlagsDaOrdem } from './manutencao-ordem-flags';
import { OrdemLeitura, type ClienteOrdem } from './manutencao-ordem-leitura';

const MENSAGEM_ABERTA = 'Ordem aberta.';
const MENSAGEM_RECEBIDA = 'Ordem recebida.';
const MENSAGEM_DEVOLVIDA = 'Ordem devolvida.';
const MENSAGEM_CANCELADA = 'Ordem cancelada.';
const MENSAGEM_NAO_ABERTA = 'Ordem não está aberta.';
const MENSAGEM_NAO_RECEBIDA = 'Ordem não está recebida.';
const MENSAGEM_NAO_ENCONTRADA = 'Ordem não encontrada.';
const MENSAGEM_SEM_PERMISSAO = 'Sem permissão.';
const MENSAGEM_MUDOU = 'A ordem mudou. Tente de novo.';
const MENSAGEM_NAO_DEVOLVE = 'Só quem recebeu ou quem administra devolve.';
const MENSAGEM_FALHA_ABERTURA = 'Não foi possível abrir a ordem.';

type Cliente = ClienteOrdem;
type Resultado = { ok: false; mensagem: string };
type ResultadoAbertura = { ok: true; numero: number; mensagem: string } | Resultado;
type ResultadoAcao = { ok: true; mensagem: string } | Resultado;
type MaquinaLinha = { id: string; ativo: boolean; setor_id: string };
type OrdemAcao = {
  status: string;
  tipo: string;
  setor_id: string;
  recebida_por: string | null;
};

export async function abrirCorretiva(entrada: AberturaEntrada): Promise<ResultadoAbertura> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(
    MODULOS_MANUTENCAO_ENTRADA,
    'editar',
  );
  const client = supabaseClientFactory.createServiceRoleClient();
  const leitura = new OrdemLeitura(client);
  const maquina = await lerMaquina(client, entrada.maquinaId);
  const setores = await setoresParaAbrir(leitura, snap);
  const validacao = new OrdemAbertura().validar(entrada, maquina, setores);
  if (!validacao.ok) return validacao;
  return inserirCorretiva(client, entrada, validacao.setorId, validacao.descricao, usuarioId);
}

export async function receberOrdem(numero: number): Promise<ResultadoAcao> {
  const { usuarioId } = await requireInternoQualquerModulo(['interno_manutencao'], 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const gravou = await atualizarOrdem(client, numero, 'aberta', camposRecebimento(usuarioId));
  if (gravou) return { ok: true, mensagem: MENSAGEM_RECEBIDA };
  const leitura = new OrdemLeitura(client);
  return { ok: false, mensagem: await mensagemRecebimentoRecusado(client, leitura, numero) };
}

export async function devolverOrdem(numero: number): Promise<ResultadoAcao> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(['interno_manutencao'], 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const ordem = await lerOrdemAcao(client, numero);
  const recusa = recusaDevolucao(ordem, snap, usuarioId);
  if (recusa) return recusa;
  const gravou = await atualizarOrdem(
    client,
    numero,
    'recebida',
    camposDevolucao(),
    new ManutencaoAcesso().administra(snap) ? null : usuarioId,
  );
  if (!gravou) return { ok: false, mensagem: MENSAGEM_MUDOU };
  return { ok: true, mensagem: MENSAGEM_DEVOLVIDA };
}

export async function cancelarOrdem(numero: number, motivo: string): Promise<ResultadoAcao> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(
    MODULOS_MANUTENCAO_ENTRADA,
    'editar',
  );
  const client = supabaseClientFactory.createServiceRoleClient();
  const ordem = await lerOrdemAcao(client, numero);
  if (!ordem) return { ok: false, mensagem: MENSAGEM_NAO_ENCONTRADA };
  const leitura = new OrdemLeitura(client);
  const preparado = await prepararCancelamento(leitura, ordem, snap, usuarioId, motivo);
  if ('ok' in preparado) return preparado;
  const gravou = await atualizarOrdem(
    client,
    numero,
    ordem.status,
    camposCancelamento(usuarioId, motivo, preparado.exigeMotivo),
  );
  if (!gravou) return { ok: false, mensagem: MENSAGEM_MUDOU };
  return { ok: true, mensagem: MENSAGEM_CANCELADA };
}

export async function avaliarRemocaoOrdem(numero: number): Promise<AvaliacaoRemocaoOrdem> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const ordemId = await lerOrdemId(client, numero);
  if (!ordemId) {
    return {
      pode: false,
      vinculos: [],
      mensagem: MENSAGEM_NAO_ENCONTRADA,
    };
  }
  return new OrdemRemocao().avaliar(await lerVinculosOrdem(client, ordemId));
}

export async function removerOrdem(numero: number): Promise<ResultadoAcao> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const ordemId = await lerOrdemId(client, numero);
  if (!ordemId) return { ok: false, mensagem: MENSAGEM_NAO_ENCONTRADA };
  const avaliacao = new OrdemRemocao().avaliar(await lerVinculosOrdem(client, ordemId));
  if (!avaliacao.pode) return { ok: false, mensagem: avaliacao.mensagem };
  const limpeza = await limparAjudantes(client, ordemId);
  if (limpeza) return { ok: false, mensagem: limpeza };
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .delete()
    .eq('id', ordemId)
    .select('id');
  if (error) {
    return {
      ok: false,
      mensagem:
        error.code === '23503'
          ? 'Não é possível remover esta ordem. Há vínculos que precisam ser removidos antes.'
          : error.message,
    };
  }
  if (!data || (data as unknown[]).length === 0) {
    return { ok: false, mensagem: MENSAGEM_NAO_ENCONTRADA };
  }
  return { ok: true, mensagem: 'Ordem removida.' };
}

async function lerOrdemId(client: Cliente, numero: number): Promise<string | null> {
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select('id')
    .eq('numero', numero)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as { id: string } | null) ?? null)?.id ?? null;
}

async function lerVinculosOrdem(client: Cliente, ordemId: string) {
  const [pecasUsadas, movimentosEstoque] = await Promise.all([
    contarPorColuna(client, 'manutencao_ordem_pecas', 'ordem_id', ordemId),
    contarPorColuna(client, 'manutencao_estoque_movimentos', 'ordem_id', ordemId),
  ]);
  return { pecasUsadas, movimentosEstoque };
}

async function limparAjudantes(client: Cliente, ordemId: string): Promise<string | null> {
  const { error } = await client
    .from('manutencao_ordem_ajudantes' as never)
    .delete()
    .eq('ordem_id', ordemId);
  return error ? error.message : null;
}

async function contarPorColuna(
  client: Cliente,
  tabela: string,
  coluna: string,
  id: string,
): Promise<number> {
  const { count, error } = await client
    .from(tabela as never)
    .select('*', { count: 'exact', head: true })
    .eq(coluna, id);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function setoresParaAbrir(
  leitura: OrdemLeitura,
  snap: UsuarioAuthzSnapshot,
): Promise<string[] | 'todos'> {
  if (new ManutencaoAcesso().executaOficina(snap)) return 'todos';
  return setoresDoSnapshot(leitura, snap);
}

function setoresDoSnapshot(leitura: OrdemLeitura, snap: UsuarioAuthzSnapshot): Promise<string[]> {
  const codigos = new ManutencaoSetoresPorModulo().codigosElegiveis(snap);
  return leitura.setoresPorCodigos(codigos);
}

async function lerMaquina(
  client: Cliente,
  maquinaId: string,
): Promise<{ id: string; ativo: boolean; setorId: string } | null> {
  const { data, error } = await client
    .from('manutencao_maquinas' as never)
    .select('id, ativo, setor_id')
    .eq('id', maquinaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const linha = data as MaquinaLinha;
  return { id: linha.id, ativo: linha.ativo, setorId: linha.setor_id };
}

async function inserirCorretiva(
  client: Cliente,
  entrada: AberturaEntrada,
  setorId: string,
  descricao: string,
  usuarioId: string,
): Promise<ResultadoAbertura> {
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .insert(linhaCorretiva(entrada, setorId, descricao, usuarioId) as never)
    .select('numero');
  if (error) return { ok: false, mensagem: error.message };
  const numero = ((data ?? []) as { numero: number }[])[0]?.numero;
  if (typeof numero !== 'number') return { ok: false, mensagem: MENSAGEM_FALHA_ABERTURA };
  return { ok: true, numero, mensagem: MENSAGEM_ABERTA };
}

function linhaCorretiva(
  entrada: AberturaEntrada,
  setorId: string,
  descricao: string,
  usuarioId: string,
) {
  return {
    tipo: 'corretiva',
    maquina_id: entrada.maquinaId,
    setor_id: setorId,
    urgencia: entrada.urgencia,
    tipo_problema: entrada.tipoProblema,
    descricao,
    status: 'aberta',
    aberta_por: usuarioId,
  };
}

function camposRecebimento(usuarioId: string) {
  const agora = new Date().toISOString();
  return {
    status: 'recebida',
    recebida_por: usuarioId,
    recebida_em: agora,
    updated_at: agora,
  };
}

function camposDevolucao() {
  return {
    status: 'aberta',
    recebida_por: null,
    recebida_em: null,
    updated_at: new Date().toISOString(),
  };
}

function camposCancelamento(usuarioId: string, motivo: string, exigeMotivo: boolean) {
  const agora = new Date().toISOString();
  return {
    status: 'cancelada',
    cancelada_por: usuarioId,
    cancelada_em: agora,
    cancelamento_motivo: exigeMotivo ? motivo.trim() : null,
    updated_at: agora,
  };
}

async function mensagemRecebimentoRecusado(
  client: Cliente,
  leitura: OrdemLeitura,
  numero: number,
): Promise<string> {
  const ordem = await lerOrdemAcao(client, numero);
  if (ordem?.status !== 'recebida' || !ordem.recebida_por) return MENSAGEM_NAO_ABERTA;
  return `Já recebida por ${await leitura.nomeUsuario(ordem.recebida_por)}`;
}

function recusaDevolucao(
  ordem: OrdemAcao | null,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
): Resultado | null {
  if (!ordem) return { ok: false, mensagem: MENSAGEM_NAO_ENCONTRADA };
  if (ordem.status !== 'recebida' || !ordem.recebida_por) {
    return { ok: false, mensagem: MENSAGEM_NAO_RECEBIDA };
  }
  const libera = new OrdemPermissao().devolveOuFinaliza({
    status: 'recebida',
    recebidoPor: ordem.recebida_por,
    usuarioId,
    administra: new ManutencaoAcesso().administra(snap),
  });
  if (!libera) return { ok: false, mensagem: MENSAGEM_NAO_DEVOLVE };
  return null;
}

async function prepararCancelamento(
  leitura: OrdemLeitura,
  ordem: OrdemAcao,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
  motivo: string,
): Promise<Resultado | { exigeMotivo: boolean }> {
  if (!(await veOrdem(leitura, snap, ordem.setor_id))) {
    return { ok: false, mensagem: MENSAGEM_SEM_PERMISSAO };
  }
  const tipo = tipoOrdem(ordem.tipo);
  if (!tipo) return { ok: false, mensagem: MENSAGEM_NAO_ENCONTRADA };
  const setores = await new FlagsDaOrdem().setoresDoSolicitante(leitura, snap);
  const decisao = new OrdemCancelamento().permite(
    pedidoCancelamento(ordem, snap, tipo, motivo, setores),
  );
  if (!decisao.ok) return decisao;
  return { exigeMotivo: decisao.exigeMotivo };
}

function pedidoCancelamento(
  ordem: OrdemAcao,
  snap: UsuarioAuthzSnapshot,
  tipo: 'corretiva' | 'preventiva',
  motivo: string,
  setores: readonly string[],
) {
  const acesso = new ManutencaoAcesso();
  return {
    status: ordem.status,
    tipo,
    solicitacaoEditar: acesso.abreCorretiva(snap),
    manutencaoEditar: acesso.executaOficina(snap),
    manutencaoAdministrar: acesso.administra(snap),
    motivo,
    setorId: ordem.setor_id,
    setoresElegiveis: setores,
  };
}

async function veOrdem(
  leitura: OrdemLeitura,
  snap: UsuarioAuthzSnapshot,
  setorId: string,
): Promise<boolean> {
  const acesso = new ManutencaoAcesso();
  const setores = acesso.veTodas(snap) ? [] : await setoresDoSnapshot(leitura, snap);
  return new OrdemPermissao().veDetalhe(acesso.veTodas(snap), setores, setorId);
}

async function lerOrdemAcao(client: Cliente, numero: number): Promise<OrdemAcao | null> {
  if (!Number.isInteger(numero) || numero <= 0) return null;
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select('status, tipo, setor_id, recebida_por')
    .eq('numero', numero)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrdemAcao | null) ?? null;
}

async function atualizarOrdem(
  client: Cliente,
  numero: number,
  statusAtual: string,
  campos: Record<string, unknown>,
  recebidaPor: string | null = null,
): Promise<boolean> {
  if (!Number.isInteger(numero) || numero <= 0) return false;
  const consulta = client
    .from('manutencao_ordens' as never)
    .update(campos as never)
    .eq('numero', numero)
    .eq('status', statusAtual);
  const filtrada = recebidaPor ? consulta.eq('recebida_por', recebidaPor) : consulta;
  const { data, error } = await filtrada.select('numero');
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown[]).length > 0;
}

function tipoOrdem(valor: string): 'corretiva' | 'preventiva' | null {
  if (valor === 'corretiva' || valor === 'preventiva') return valor;
  return null;
}
