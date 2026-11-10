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
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { EntradaFinalizacao } from './manutencao-ordem-finalizar-actions';
import type { ClienteOrdem } from './manutencao-ordem-leitura';

const MODULO_OFICINA = 'interno_manutencao';
const QUANTIDADE_INVALIDA = 'Informe uma quantidade maior que zero, com até 3 casas.';
const CONFLITO = 'Estoque mudou. Tente de novo.';
const MENSAGEM_ATUALIZADA = 'Finalização atualizada.';
const MENSAGEM_NAO_ENCONTRADA = 'Ordem não encontrada.';
const MENSAGEM_NAO_FINALIZADA = 'Ordem não está finalizada.';
const MENSAGEM_NAO_EDITA = 'Só quem recebeu ou quem administra edita a finalização.';
const MENSAGEM_PECA = 'Peça não encontrada.';
const FALHA = 'Não foi possível atualizar a finalização.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FRASES_FUNCAO = [
  CONFLITO,
  MENSAGEM_NAO_FINALIZADA,
  MENSAGEM_NAO_EDITA,
  MENSAGEM_PECA,
  'Peça inativa.',
  QUANTIDADE_INVALIDA,
  'Movimento inválido.',
];

type Resultado = { ok: false; mensagem: string };
type ResultadoAcao = { ok: true; mensagem: string } | Resultado;
type OrdemLinha = {
  id: string;
  status: string;
  recebida_por: string | null;
  aberta_em: string;
};
type OrdemPronta = { id: string; abertaEm: string; recebidaPor: string };
type PecaBruta = {
  id: string;
  ativo: boolean;
  saldo: string | number;
  custo_medio_centavos: number | null;
  codigo: string;
};
type ConsumoAntigo = { pecaId: string; quantidadeMilesimos: number };
type ItemRpc = {
  peca_id: string;
  quantidade: string;
  custo_unitario: number;
  custo_total: number;
  saldo_esperado: string;
  custo_esperado: number | null;
  saldo_novo: string;
};
type ErroFuncao = { message: string; details?: string | null; hint?: string | null };

export async function atualizarFinalizacaoOrdem(
  numero: number,
  entrada: EntradaFinalizacao,
): Promise<ResultadoAcao> {
  const { snap, usuarioId } = await requireInternoQualquerModulo([MODULO_OFICINA], 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const liberada = await ordemLiberada(client, numero, snap, usuarioId);
  if (!liberada.ok) return liberada;
  const preparado = prepararEntrada(entrada, liberada.ordem.abertaEm);
  if (!preparado.ok) return preparado;
  return gravar(client, {
    ordemId: liberada.ordem.id,
    usuarioId,
    administra: new ManutencaoAcesso().administra(snap),
    ...preparado,
    ajudanteIds: limparAjudantes(entrada.ajudanteIds, liberada.ordem.recebidaPor),
  });
}

function limparAjudantes(ids: string[], receptorId: string): string[] {
  const vistos = new Set<string>();
  const limpos: string[] = [];
  for (const id of ids) {
    if (!UUID.test(id) || id === receptorId || vistos.has(id)) continue;
    vistos.add(id);
    limpos.push(id);
  }
  return limpos;
}

async function ordemLiberada(
  client: ClienteOrdem,
  numero: number,
  snap: UsuarioAuthzSnapshot,
  usuarioId: string,
): Promise<{ ok: true; ordem: OrdemPronta } | Resultado> {
  const ordem = await lerOrdem(client, numero);
  if (!ordem) return { ok: false, mensagem: MENSAGEM_NAO_ENCONTRADA };
  if (ordem.status !== 'finalizada' || !ordem.recebida_por) {
    return { ok: false, mensagem: MENSAGEM_NAO_FINALIZADA };
  }
  const libera = new OrdemPermissao().editaFinalizacao({
    status: 'finalizada',
    recebidoPor: ordem.recebida_por,
    usuarioId,
    administra: new ManutencaoAcesso().administra(snap),
  });
  if (!libera) return { ok: false, mensagem: MENSAGEM_NAO_EDITA };
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

function prepararEntrada(
  entrada: EntradaFinalizacao,
  abertaEm: string,
):
  | { ok: true; inicioIso: string; fimIso: string; servicos: string; linhas: PecaFinalizacao[] }
  | Resultado {
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

async function gravar(
  client: ClienteOrdem,
  pedido: {
    ordemId: string;
    usuarioId: string;
    administra: boolean;
    inicioIso: string;
    fimIso: string;
    servicos: string;
    linhas: PecaFinalizacao[];
    ajudanteIds: string[];
  },
): Promise<ResultadoAcao> {
  const primeira = await tentar(client, pedido);
  if (primeira.ok || primeira.mensagem !== CONFLITO) return primeira;
  return tentar(client, pedido);
}

async function tentar(
  client: ClienteOrdem,
  pedido: {
    ordemId: string;
    usuarioId: string;
    administra: boolean;
    inicioIso: string;
    fimIso: string;
    servicos: string;
    linhas: PecaFinalizacao[];
    ajudanteIds: string[];
  },
): Promise<ResultadoAcao> {
  const antigos = await consumosAntigos(client, pedido.ordemId);
  const idsAntigos = new Set(antigos.map((item) => item.pecaId));
  const ids = [...new Set([...pedido.linhas.map((linha) => linha.pecaId), ...idsAntigos])];
  const pecas = await lerPecas(client, ids);
  const ajustadas = ajustarSaldos(pecas, antigos);
  const consolidado = new OrdemFinalizacao().consolidarPecas(
    pedido.linhas,
    ajustadas.map((peca) => paraDominio(peca, idsAntigos)),
  );
  if (!consolidado.ok) return consolidado;
  const itens = itensRpc(consolidado.linhas, ajustadas);
  if (!itens) return { ok: false, mensagem: MENSAGEM_PECA };
  return chamar(client, {
    p_ordem: pedido.ordemId,
    p_usuario: pedido.usuarioId,
    p_inicio: pedido.inicioIso,
    p_fim: pedido.fimIso,
    p_servicos: pedido.servicos,
    p_custo_pecas: consolidado.custoPecasCentavos,
    p_pecas: itens,
    p_ajudantes: pedido.ajudanteIds,
    p_administra: pedido.administra,
  });
}

async function consumosAntigos(client: ClienteOrdem, ordemId: string): Promise<ConsumoAntigo[]> {
  const { data, error } = await client
    .from('manutencao_ordem_pecas' as never)
    .select('peca_id, quantidade')
    .eq('ordem_id', ordemId);
  if (error) throw new Error(error.message);
  const conversor = new ConversorSaldo();
  return ((data ?? []) as { peca_id: string; quantidade: string | number }[]).map((linha) => ({
    pecaId: linha.peca_id,
    quantidadeMilesimos: conversor.emMilesimos(linha.quantidade),
  }));
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

function ajustarSaldos(pecas: PecaBruta[], antigos: ConsumoAntigo[]): PecaBruta[] {
  const retorno = new Map<string, number>();
  for (const antigo of antigos) {
    retorno.set(antigo.pecaId, (retorno.get(antigo.pecaId) ?? 0) + antigo.quantidadeMilesimos);
  }
  const conversor = new ConversorSaldo();
  return pecas.map((peca) => {
    const atual = conversor.emMilesimos(peca.saldo);
    const restaurado = atual + (retorno.get(peca.id) ?? 0);
    return { ...peca, saldo: conversor.numerico(restaurado) };
  });
}

function paraDominio(peca: PecaBruta, idsAntigos: Set<string>): PecaParaFinalizacao {
  return {
    id: peca.id,
    ativo: peca.ativo || idsAntigos.has(peca.id),
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
    const conversor = new ConversorSaldo();
    const saldoMilesimos = conversor.emMilesimos(peca.saldo);
    itens.push({
      peca_id: linha.pecaId,
      quantidade: conversor.numerico(linha.quantidadeMilesimos),
      custo_unitario: linha.custoUnitarioCentavos,
      custo_total: linha.custoTotalCentavos,
      saldo_esperado: textoSaldo(peca.saldo),
      custo_esperado: peca.custo_medio_centavos,
      saldo_novo: conversor.numerico(saldoMilesimos - linha.quantidadeMilesimos),
    });
  }
  return itens;
}

function textoSaldo(valor: string | number): string {
  if (typeof valor === 'string') return valor.trim();
  const conversor = new ConversorSaldo();
  return conversor.numerico(conversor.emMilesimos(valor));
}

async function chamar(
  client: ClienteOrdem,
  args: Record<string, unknown>,
): Promise<ResultadoAcao> {
  const { data, error } = await client.rpc(
    'manutencao_atualizar_finalizacao' as never,
    args as never,
  );
  if (error) return { ok: false, mensagem: fraseDaFuncao(error) };
  return { ok: true, mensagem: mensagemSucesso(codigosDe(data)) };
}

function mensagemSucesso(codigos: string[]): string {
  if (codigos.length === 0) return MENSAGEM_ATUALIZADA;
  return `${MENSAGEM_ATUALIZADA} Saldo negativo: ${codigos.join(', ')}.`;
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
