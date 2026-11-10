'use server';

import { redirect } from 'next/navigation';
import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { CustoMedio } from '@/domain/manutencao/custo-medio';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';
import { auth } from '@/lib/auth';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type Resultado = { ok: boolean; mensagem: string };
type TipoMovimento = 'entrada' | 'saida_manual';
type PecaEstoque = {
  saldoTexto: string;
  saldoMilesimos: number;
  custoMedioCentavos: number | null;
};
type ParEstoque = {
  saldoMilesimos: number;
  custoMedioCentavos: number | null;
};
type PedidoMovimento = {
  pecaId: string;
  tipo: TipoMovimento;
  quantidadeMilesimos: number;
  preco: number | null;
  motivo: string | null;
  sucesso: string;
};
type ErroMovimento = {
  message: string;
  details?: string | null;
  hint?: string | null;
};

const QUANTIDADE_INVALIDA = 'Informe uma quantidade maior que zero, com até 3 casas.';
const CONFLITO = 'Estoque mudou. Tente de novo.';
const FALHA = 'Não foi possível movimentar.';
const FRASES_FUNCAO = [
  'Peça não encontrada.',
  'Peça inativa.',
  QUANTIDADE_INVALIDA,
  CONFLITO,
  'Informe o preço.',
  'Movimento inválido.',
  'Saldo só muda por movimento.',
];

export async function registrarEntrada(
  pecaId: string,
  quantidadeTexto: string,
): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'editar');
  const quantidadeMilesimos = new QuantidadeEstoque().emMilesimos(quantidadeTexto);
  if (quantidadeMilesimos === null) return { ok: false, mensagem: QUANTIDADE_INVALIDA };
  return gravarMovimento({
    pecaId,
    tipo: 'entrada',
    quantidadeMilesimos,
    preco: 0,
    motivo: null,
    sucesso: 'Entrada registrada.',
  });
}

export async function registrarSaida(
  pecaId: string,
  quantidadeTexto: string,
  motivo: string,
): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'editar');
  const quantidadeMilesimos = new QuantidadeEstoque().emMilesimos(quantidadeTexto);
  if (quantidadeMilesimos === null) return { ok: false, mensagem: QUANTIDADE_INVALIDA };
  const motivoLimpo = motivo.trim();
  if (!motivoLimpo) return { ok: false, mensagem: 'Informe o motivo.' };
  return gravarMovimento({
    pecaId,
    tipo: 'saida_manual',
    quantidadeMilesimos,
    preco: null,
    motivo: motivoLimpo,
    sucesso: 'Saída registrada.',
  });
}

async function gravarMovimento(pedido: PedidoMovimento): Promise<Resultado> {
  const client = supabaseClientFactory.createServiceRoleClient();
  const usuarioId = await usuarioAtual();
  const primeira = await tentarMovimento(client, usuarioId, pedido);
  if (primeira.ok || primeira.mensagem !== CONFLITO) return primeira;
  return tentarMovimento(client, usuarioId, pedido);
}

async function tentarMovimento(
  client: Cliente,
  usuarioId: string,
  pedido: PedidoMovimento,
): Promise<Resultado> {
  const peca = await lerPeca(client, pedido.pecaId);
  if (!peca) return { ok: false, mensagem: 'Peça não encontrada.' };
  const calculo = calcularMovimento(peca, pedido);
  return chamarMovimento(
    client,
    argumentosMovimento(pedido, peca, calculo, usuarioId),
    pedido.sucesso,
  );
}

async function lerPeca(client: Cliente, pecaId: string): Promise<PecaEstoque | null> {
  const { data, error } = await client
    .from('manutencao_pecas' as never)
    .select('saldo, custo_medio_centavos')
    .eq('id', pecaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const linha = data as { saldo: string | number; custo_medio_centavos: number | null };
  return {
    saldoTexto: textoSaldo(linha.saldo),
    saldoMilesimos: new ConversorSaldo().emMilesimos(linha.saldo),
    custoMedioCentavos: linha.custo_medio_centavos ?? null,
  };
}

function calcularMovimento(
  peca: PecaEstoque,
  pedido: PedidoMovimento,
): { par: ParEstoque; preco: number } {
  const custo = new CustoMedio();
  if (pedido.tipo === 'entrada') {
    const par = custo.entrada(
      peca.saldoMilesimos,
      peca.custoMedioCentavos,
      pedido.quantidadeMilesimos,
      pedido.preco ?? 0,
    );
    return { par, preco: pedido.preco ?? 0 };
  }
  const saida = custo.saida(
    peca.saldoMilesimos,
    peca.custoMedioCentavos,
    pedido.quantidadeMilesimos,
  );
  return {
    par: {
      saldoMilesimos: saida.saldoMilesimos,
      custoMedioCentavos: saida.custoMedioCentavos,
    },
    preco: saida.precoUnitarioCentavos,
  };
}

function argumentosMovimento(
  pedido: PedidoMovimento,
  peca: PecaEstoque,
  calculo: { par: ParEstoque; preco: number },
  usuarioId: string,
) {
  return {
    p_peca: pedido.pecaId,
    p_tipo: pedido.tipo,
    p_quantidade: new ConversorSaldo().numerico(pedido.quantidadeMilesimos),
    p_preco: calculo.preco,
    p_motivo: pedido.motivo,
    p_usuario: usuarioId,
    p_saldo_esperado: peca.saldoTexto,
    p_custo_esperado: peca.custoMedioCentavos,
    p_saldo_novo: new ConversorSaldo().numerico(calculo.par.saldoMilesimos),
    p_custo_novo: calculo.par.custoMedioCentavos,
  };
}

async function chamarMovimento(
  client: Cliente,
  argumentos: ReturnType<typeof argumentosMovimento>,
  sucesso: string,
): Promise<Resultado> {
  const { data, error } = await client.rpc(
    'manutencao_registrar_movimento' as never,
    argumentos as never,
  );
  if (error) return { ok: false, mensagem: fraseDaFuncao(error) };
  const saldo = saldoDevolvido(data) ?? argumentos.p_saldo_novo;
  return { ok: true, mensagem: mensagemSucesso(sucesso, saldo) };
}

function mensagemSucesso(base: string, saldo: string | number): string {
  if (new ConversorSaldo().emMilesimos(saldo) < 0) return `${base} Saldo negativo.`;
  return base;
}

function fraseDaFuncao(error: ErroMovimento): string {
  const texto = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  const conhecida = FRASES_FUNCAO.find((frase) => texto.includes(frase));
  if (conhecida) return conhecida;
  if (/schema cache|Could not find the function/i.test(texto)) {
    return 'Função de estoque ainda não disponível. Aguarde e tente de novo.';
  }
  if (/manutencao_estoque_movimentos_usuario_id_fkey|usuario_id/i.test(texto)) {
    return 'Usuário da sessão não existe em usuarios. Ajuste AUTH_DEV_BYPASS_USER_ID.';
  }
  return FALHA;
}

function saldoDevolvido(corpo: unknown): string | number | null {
  const linha = Array.isArray(corpo) ? corpo[0] : corpo;
  if (!linha || typeof linha !== 'object' || !('saldo' in linha)) return null;
  const saldo = (linha as { saldo?: unknown }).saldo;
  if (typeof saldo === 'string' || typeof saldo === 'number') return saldo;
  return null;
}

async function usuarioAtual(): Promise<string> {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) redirect('/login');
  return usuarioId;
}

function textoSaldo(valor: string | number): string {
  if (typeof valor === 'string') return valor.trim();
  const conversor = new ConversorSaldo();
  return conversor.numerico(conversor.emMilesimos(valor));
}
