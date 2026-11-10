'use server';

import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import {
  OrdemFinalizacao,
  type LinhaFinalizada,
  type PecaFinalizacao,
  type PecaParaFinalizacao,
} from '@/domain/manutencao/ordem-finalizacao';
import { OrdemPermissao } from '@/domain/manutencao/ordem-permissao';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';
import { nivelAtende, type NivelModulo } from '@/lib/auth/interno-modulos-catalog';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { ClienteOrdem } from './manutencao-ordem-leitura';

const MODULO_OFICINA = 'interno_manutencao';
const QUANTIDADE_INVALIDA = 'Informe uma quantidade maior que zero, com até 3 casas.';
const CONFLITO = 'Estoque mudou. Tente de novo.';
const MENSAGEM_FINALIZADA = 'Ordem finalizada.';
const MENSAGEM_NAO_ENCONTRADA = 'Ordem não encontrada.';
const MENSAGEM_NAO_RECEBIDA = 'Ordem não está recebida.';
const MENSAGEM_NAO_FINALIZA = 'Só quem recebeu ou quem administra finaliza.';
const MENSAGEM_AJUDANTE = 'Ajudante inválido.';
const MENSAGEM_PECA = 'Peça não encontrada.';
const FALHA = 'Não foi possível finalizar a ordem.';
const SELECT_AJUDANTES =
  'usuarios ( id, ativo ), perfis ( ativo, perfil_modulos ( modulo, nivel ) )';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FRASES_FUNCAO = [
  CONFLITO,
  MENSAGEM_NAO_RECEBIDA,
  MENSAGEM_NAO_FINALIZA,
  MENSAGEM_PECA,
  'Peça inativa.',
  QUANTIDADE_INVALIDA,
  'Movimento inválido.',
];

export type EntradaFinalizacao = {
  inicioIso: string;
  fimIso: string;
  servicos: string;
  pecas: { pecaId: string; quantidadeTexto: string }[];
  ajudanteIds: string[];
};

type Resultado = { ok: false; mensagem: string };
type ResultadoAcao = { ok: true; mensagem: string } | Resultado;
type OrdemLinha = {
  id: string;
  status: string;
  recebida_por: string | null;
  aberta_em: string;
};
type OrdemPronta = { id: string; abertaEm: string; recebidaPor: string };
type Preparado = {
  ok: true;
  inicioIso: string;
  fimIso: string;
  servicos: string;
  linhas: PecaFinalizacao[];
};
type Ajudantes = { ok: true; ids: string[] };
type PecaBruta = {
  id: string;
  ativo: boolean;
  saldo: string | number;
  custo_medio_centavos: number | null;
  codigo: string;
};
type ItemRpc = {
  peca_id: string;
  quantidade: string;
  custo_unitario: number;
  custo_total: number;
  saldo_esperado: string;
  custo_esperado: number | null;
  saldo_novo: string;
};
type PedidoGravacao = {
  ordemId: string;
  usuarioId: string;
  administra: boolean;
  inicioIso: string;
  fimIso: string;
  servicos: string;
  linhas: PecaFinalizacao[];
  ajudanteIds: string[];
};
type ErroFuncao = { message: string; details?: string | null; hint?: string | null };
type ModuloLinha = { modulo: string; nivel: string };
type PerfilLinha = {
  ativo: boolean;
  perfil_modulos: ModuloLinha[] | ModuloLinha | null;
};
type UsuarioLinha = { id: string; ativo: boolean };
type VinculoPerfil = {
  usuarios: UsuarioLinha | UsuarioLinha[] | null;
  perfis: PerfilLinha | PerfilLinha[] | null;
};

export async function finalizarOrdem(
  numero: number,
  entrada: EntradaFinalizacao,
): Promise<ResultadoAcao> {
  const { snap, usuarioId } = await requireInternoQualquerModulo([MODULO_OFICINA], 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const liberada = await ordemLiberada(client, numero, snap, usuarioId);
  if (!liberada.ok) return liberada;
  const preparado = prepararEntrada(entrada, liberada.ordem.abertaEm);
  if (!preparado.ok) return preparado;
  const ajudantes = await resolverAjudantes(
    client,
    entrada.ajudanteIds,
    liberada.ordem.recebidaPor,
  );
  if (!ajudantes.ok) return ajudantes;
  return gravar(client, pedidoDe(liberada.ordem, usuarioId, snap, preparado, ajudantes.ids));
}

async function ordemLiberada(
  client: ClienteOrdem,
  numero: number,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
): Promise<{ ok: true; ordem: OrdemPronta } | Resultado> {
  const ordem = await lerOrdem(client, numero);
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
  if (!libera) return { ok: false, mensagem: MENSAGEM_NAO_FINALIZA };
  return {
    ok: true,
    ordem: { id: ordem.id, abertaEm: ordem.aberta_em, recebidaPor: ordem.recebida_por },
  };
}

async function lerOrdem(client: ClienteOrdem, numero: number): Promise<OrdemLinha | null> {
  if (!Number.isInteger(numero) || numero <= 0) return null;
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select('id, status, recebida_por, aberta_em')
    .eq('numero', numero)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OrdemLinha | null) ?? null;
}

function prepararEntrada(entrada: EntradaFinalizacao, abertaEm: string): Preparado | Resultado {
  const horarios = validarInstantes(entrada.inicioIso, entrada.fimIso, abertaEm);
  if (!horarios.ok) return horarios;
  const servicos = new OrdemFinalizacao().validarServicos(entrada.servicos);
  if (!servicos.ok) return servicos;
  const linhas = linhasDe(entrada.pecas);
  if (!linhas.ok) return linhas;
  return {
    ok: true,
    inicioIso: entrada.inicioIso,
    fimIso: entrada.fimIso,
    servicos: servicos.servicos,
    linhas: linhas.linhas,
  };
}

function validarInstantes(inicio: string, fim: string, abertaEm: string): { ok: true } | Resultado {
  if (Number.isNaN(Date.parse(inicio))) return { ok: false, mensagem: 'Informe o início.' };
  if (Number.isNaN(Date.parse(fim))) return { ok: false, mensagem: 'Informe o fim.' };
  return new OrdemFinalizacao().validarHorarios(abertaEm, inicio, fim, new Date().toISOString());
}

function linhasDe(
  pecas: EntradaFinalizacao['pecas'],
): { ok: true; linhas: PecaFinalizacao[] } | Resultado {
  const parser = new QuantidadeEstoque();
  const linhas: PecaFinalizacao[] = [];
  for (const peca of pecas) {
    const quantidadeMilesimos = parser.emMilesimos(peca.quantidadeTexto);
    if (quantidadeMilesimos === null) return { ok: false, mensagem: QUANTIDADE_INVALIDA };
    linhas.push({ pecaId: peca.pecaId, quantidadeMilesimos });
  }
  return { ok: true, linhas };
}

function pedidoDe(
  ordem: OrdemPronta,
  usuarioId: string,
  snap: UsuarioAuthzSnapshot,
  preparado: Preparado,
  ajudanteIds: string[],
): PedidoGravacao {
  return {
    ordemId: ordem.id,
    usuarioId,
    administra: new ManutencaoAcesso().administra(snap),
    inicioIso: preparado.inicioIso,
    fimIso: preparado.fimIso,
    servicos: preparado.servicos,
    linhas: preparado.linhas,
    ajudanteIds,
  };
}

async function resolverAjudantes(
  client: ClienteOrdem,
  ids: string[],
  receptorId: string,
): Promise<Ajudantes | Resultado> {
  const unicos = deduplicar(ids);
  if (unicos.length === 0) return { ok: true, ids: [] };
  if (unicos.some((id) => id === receptorId || !UUID.test(id))) {
    return { ok: false, mensagem: MENSAGEM_AJUDANTE };
  }
  const elegiveis = await idsComOficina(client, unicos);
  if (unicos.some((id) => !elegiveis.has(id))) return { ok: false, mensagem: MENSAGEM_AJUDANTE };
  return { ok: true, ids: unicos };
}

function deduplicar(ids: string[]): string[] {
  const vistos = new Set<string>();
  const unicos: string[] = [];
  for (const id of ids) {
    if (vistos.has(id)) continue;
    vistos.add(id);
    unicos.push(id);
  }
  return unicos;
}

async function idsComOficina(client: ClienteOrdem, ids: string[]): Promise<Set<string>> {
  const { data, error } = await client
    .from('usuario_perfis' as never)
    .select(SELECT_AJUDANTES)
    .in('usuario_id', ids);
  if (error) throw new Error(error.message);
  return elegiveisDe((data ?? []) as VinculoPerfil[]);
}

function elegiveisDe(linhas: VinculoPerfil[]): Set<string> {
  const ids = new Set<string>();
  for (const linha of linhas) {
    const usuario = primeiro(linha.usuarios);
    if (!usuario || usuario.ativo !== true || !perfilOficina(primeiro(linha.perfis))) continue;
    ids.add(usuario.id);
  }
  return ids;
}

function perfilOficina(perfil: PerfilLinha | null): boolean {
  if (!perfil || perfil.ativo !== true) return false;
  return modulosDe(perfil).some((modulo) => oficinaEditar(modulo));
}

function oficinaEditar(modulo: ModuloLinha): boolean {
  if (modulo.modulo !== MODULO_OFICINA || !nivelConhecido(modulo.nivel)) return false;
  return nivelAtende(modulo.nivel, 'editar');
}

function nivelConhecido(nivel: string): nivel is NivelModulo {
  return nivel === 'ler' || nivel === 'editar' || nivel === 'administrar';
}

function modulosDe(perfil: PerfilLinha): ModuloLinha[] {
  if (!perfil.perfil_modulos) return [];
  return Array.isArray(perfil.perfil_modulos) ? perfil.perfil_modulos : [perfil.perfil_modulos];
}

function primeiro<T>(valor: T | T[] | null): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

async function gravar(client: ClienteOrdem, pedido: PedidoGravacao): Promise<ResultadoAcao> {
  const primeira = await tentar(client, pedido);
  if (primeira.ok || primeira.mensagem !== CONFLITO) return primeira;
  return tentar(client, pedido);
}

async function tentar(client: ClienteOrdem, pedido: PedidoGravacao): Promise<ResultadoAcao> {
  const pecas = await lerPecas(client, pedido.linhas.map((linha) => linha.pecaId));
  const consolidado = new OrdemFinalizacao().consolidarPecas(pedido.linhas, pecas.map(paraDominio));
  if (!consolidado.ok) return consolidado;
  const itens = itensRpc(consolidado.linhas, pecas);
  if (!itens) return { ok: false, mensagem: MENSAGEM_PECA };
  return chamar(client, argumentos(pedido, consolidado.custoPecasCentavos, itens));
}

async function lerPecas(client: ClienteOrdem, ids: string[]): Promise<PecaBruta[]> {
  const unicos = [...new Set(ids.filter((id) => UUID.test(id)))];
  if (unicos.length === 0) return [];
  const { data, error } = await client
    .from('manutencao_pecas' as never)
    .select('id, ativo, saldo, custo_medio_centavos, codigo')
    .in('id', unicos);
  if (error) throw new Error(error.message);
  return (data ?? []) as PecaBruta[];
}

function paraDominio(peca: PecaBruta): PecaParaFinalizacao {
  return {
    id: peca.id,
    ativo: peca.ativo,
    custoMedioCentavos: peca.custo_medio_centavos,
    saldoMilesimos: new ConversorSaldo().emMilesimos(peca.saldo),
    codigo: peca.codigo,
  };
}

function itensRpc(linhas: LinhaFinalizada[], pecas: PecaBruta[]): ItemRpc[] | null {
  const porId = new Map(pecas.map((peca) => [peca.id, peca]));
  const itens: ItemRpc[] = [];
  for (const linha of linhas) {
    const peca = porId.get(linha.pecaId);
    if (!peca) return null;
    itens.push(itemRpc(linha, peca));
  }
  return itens;
}

function itemRpc(linha: LinhaFinalizada, peca: PecaBruta): ItemRpc {
  const conversor = new ConversorSaldo();
  const saldoMilesimos = conversor.emMilesimos(peca.saldo);
  return {
    peca_id: linha.pecaId,
    quantidade: conversor.numerico(linha.quantidadeMilesimos),
    custo_unitario: linha.custoUnitarioCentavos,
    custo_total: linha.custoTotalCentavos,
    saldo_esperado: textoSaldo(peca.saldo),
    custo_esperado: peca.custo_medio_centavos,
    saldo_novo: conversor.numerico(saldoMilesimos - linha.quantidadeMilesimos),
  };
}

function textoSaldo(valor: string | number): string {
  if (typeof valor === 'string') return valor.trim();
  const conversor = new ConversorSaldo();
  return conversor.numerico(conversor.emMilesimos(valor));
}

function argumentos(pedido: PedidoGravacao, custoPecasCentavos: number, itens: ItemRpc[]) {
  return {
    p_ordem: pedido.ordemId,
    p_usuario: pedido.usuarioId,
    p_inicio: pedido.inicioIso,
    p_fim: pedido.fimIso,
    p_servicos: pedido.servicos,
    p_custo_pecas: custoPecasCentavos,
    p_pecas: itens,
    p_ajudantes: pedido.ajudanteIds,
    p_administra: pedido.administra,
  };
}

async function chamar(
  client: ClienteOrdem,
  args: ReturnType<typeof argumentos>,
): Promise<ResultadoAcao> {
  const { data, error } = await client.rpc('manutencao_finalizar_ordem' as never, args as never);
  if (error) return { ok: false, mensagem: fraseDaFuncao(error) };
  return { ok: true, mensagem: mensagemSucesso(codigosDe(data)) };
}

function mensagemSucesso(codigos: string[]): string {
  if (codigos.length === 0) return MENSAGEM_FINALIZADA;
  return `${MENSAGEM_FINALIZADA} Saldo negativo: ${codigos.join(', ')}.`;
}

function codigosDe(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (typeof item !== 'string') return [];
    const codigo = item.trim();
    return codigo ? [codigo] : [];
  });
}

function fraseDaFuncao(error: ErroFuncao): string {
  const texto = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  return FRASES_FUNCAO.find((frase) => texto.includes(frase)) ?? FALHA;
}
