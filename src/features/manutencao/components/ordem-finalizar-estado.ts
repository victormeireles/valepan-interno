'use client';

import { useState, type FormEvent } from 'react';
import { atualizarFinalizacaoOrdem } from '@/app/actions/manutencao-ordem-atualizar-finalizacao-actions';
import {
  finalizarOrdem,
  type EntradaFinalizacao,
} from '@/app/actions/manutencao-ordem-finalizar-actions';
import { OrdemFinalizacao } from '@/domain/manutencao/ordem-finalizacao';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';
import { ParedeSaoPaulo } from './parede-sao-paulo';

const MENSAGEM_QUANTIDADE = 'Informe uma quantidade maior que zero, com até 3 casas.';

export type ModoFinalizacao = 'finalizar' | 'editar';

export type PecaEscolha = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  saldo: string;
};

export type AjudanteEscolha = { id: string; nome: string };

export type LinhaPeca = {
  pecaId: string;
  rotulo: string;
  quantidadeTexto: string;
  unidade: string;
};

export type ValoresIniciaisFinalizacao = {
  servicos: string;
  linhas: LinhaPeca[];
  ajudanteIds: string[];
};

export type ApoioFinalizacao = {
  pecas: PecaEscolha[];
  ajudantes: AjudanteEscolha[];
  inicioPadrao: string;
  fimPadrao: string;
  inicioIsoPadrao: string;
  fimIsoPadrao: string;
  iniciais: ValoresIniciaisFinalizacao | null;
};

type Recusa = { ok: false; mensagem: string };
type RascunhoFinal = {
  inicio: string;
  fim: string;
  servicos: string;
  linhas: LinhaPeca[];
  ajudanteIds: string[];
};
type PadraoHorario = { parede: string; iso: string };
type PadroesHorario = {
  inicio: string;
  fim: string;
  inicioIso: string;
  fimIso: string;
};

export function useFinalizacao(
  numero: number,
  pecas: PecaEscolha[],
  padroes: PadroesHorario,
  modo: ModoFinalizacao,
  iniciais: ValoresIniciaisFinalizacao | null,
  onConcluir: (mensagem: string) => void,
) {
  const campos = useCamposFinalizacao(padroes.inicio, padroes.fim, iniciais?.servicos ?? '');
  const pecasForm = usePecasFinalizacao(pecas, iniciais?.linhas ?? [], campos.definirErro);
  const ajudantes = useAjudantesMarcados(iniciais?.ajudanteIds ?? []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (campos.enviando) return;
    const pedido = montarPedido(rascunhoDe(campos, pecasForm.linhas, ajudantes.ids), padroes);
    if (!pedido.ok) {
      campos.definirErro(pedido.mensagem);
      return;
    }
    await gravar(numero, modo, pedido.entrada, campos.definirErro, campos.definirEnviando, onConcluir);
  }

  return {
    ...campos,
    ...pecasForm,
    ajudanteIds: ajudantes.ids,
    alternarAjudante: ajudantes.alternar,
    enviar,
  };
}

function useCamposFinalizacao(inicioPadrao: string, fimPadrao: string, servicosPadrao: string) {
  const [inicio, definirInicio] = useState(inicioPadrao);
  const [fim, definirFim] = useState(fimPadrao);
  const [servicos, definirServicos] = useState(servicosPadrao);
  const [erro, definirErro] = useState<string | null>(null);
  const [enviando, definirEnviando] = useState(false);
  return {
    inicio,
    fim,
    servicos,
    erro,
    enviando,
    definirInicio,
    definirFim,
    definirServicos,
    definirErro,
    definirEnviando,
  };
}

function usePecasFinalizacao(
  pecas: PecaEscolha[],
  linhasIniciais: LinhaPeca[],
  definirErro: (mensagem: string | null) => void,
) {
  const [pecaId, definirPecaId] = useState('');
  const [quantidade, definirQuantidade] = useState('');
  const [linhas, definirLinhas] = useState<LinhaPeca[]>(linhasIniciais);

  function adicionar() {
    const escolhida = pecas.find((peca) => peca.id === pecaId) ?? null;
    const soma = new SomaLinhasPeca().incluir(linhas, escolhida, quantidade);
    if (!soma.ok) {
      definirErro(soma.mensagem);
      return;
    }
    definirLinhas(soma.linhas);
    definirQuantidade('');
    definirErro(null);
  }

  function remover(pecaAlvo: string) {
    definirLinhas((atuais) => atuais.filter((linha) => linha.pecaId !== pecaAlvo));
  }

  return { pecaId, quantidade, linhas, definirPecaId, definirQuantidade, adicionar, remover };
}

function useAjudantesMarcados(idsIniciais: string[]) {
  const [ids, definirIds] = useState<string[]>(idsIniciais);

  function alternar(id: string) {
    definirIds((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  }

  return { ids, alternar };
}

function rascunhoDe(
  campos: { inicio: string; fim: string; servicos: string },
  linhas: LinhaPeca[],
  ajudanteIds: string[],
): RascunhoFinal {
  return { ...campos, linhas, ajudanteIds };
}

async function gravar(
  numero: number,
  modo: ModoFinalizacao,
  entrada: EntradaFinalizacao,
  definirErro: (mensagem: string | null) => void,
  definirEnviando: (enviando: boolean) => void,
  aoFinalizar: (mensagem: string) => void,
) {
  definirEnviando(true);
  definirErro(null);
  try {
    const resultado =
      modo === 'editar'
        ? await atualizarFinalizacaoOrdem(numero, entrada)
        : await finalizarOrdem(numero, entrada);
    if (!resultado.ok) {
      definirErro(resultado.mensagem);
      return;
    }
    aoFinalizar(resultado.mensagem);
  } finally {
    definirEnviando(false);
  }
}

function montarPedido(
  rascunho: RascunhoFinal,
  padroes: PadroesHorario,
): { ok: true; entrada: EntradaFinalizacao } | Recusa {
  const inicio = isoDe(rascunho.inicio, { parede: padroes.inicio, iso: padroes.inicioIso }, 'Informe o início.');
  if (!inicio.ok) return inicio;
  const fim = isoDe(rascunho.fim, { parede: padroes.fim, iso: padroes.fimIso }, 'Informe o fim.');
  if (!fim.ok) return fim;
  const servicos = new OrdemFinalizacao().validarServicos(rascunho.servicos);
  if (!servicos.ok) return servicos;
  return { ok: true, entrada: entradaDe(rascunho, inicio.iso, fim.iso, servicos.servicos) };
}

function entradaDe(
  rascunho: RascunhoFinal,
  inicioIso: string,
  fimIso: string,
  servicos: string,
): EntradaFinalizacao {
  return {
    inicioIso,
    fimIso,
    servicos,
    pecas: rascunho.linhas.map((linha) => ({
      pecaId: linha.pecaId,
      quantidadeTexto: linha.quantidadeTexto,
    })),
    ajudanteIds: rascunho.ajudanteIds,
  };
}

function isoDe(
  parede: string,
  padrao: PadraoHorario,
  mensagem: string,
): { ok: true; iso: string } | Recusa {
  if (parede === padrao.parede && instanteValido(padrao.iso)) return { ok: true, iso: padrao.iso };
  const iso = new ParedeSaoPaulo().paraIso(parede);
  if (!iso) return { ok: false, mensagem };
  return { ok: true, iso };
}

function instanteValido(iso: string): boolean {
  return iso.length > 0 && !Number.isNaN(Date.parse(iso));
}

class SomaLinhasPeca {
  constructor(private readonly quantidades = new QuantidadeEstoque()) {}

  incluir(
    linhas: LinhaPeca[],
    peca: PecaEscolha | null,
    quantidadeTexto: string,
  ): { ok: true; linhas: LinhaPeca[] } | Recusa {
    if (!peca) return { ok: false, mensagem: 'Selecione a peça.' };
    const milesimos = this.quantidades.emMilesimos(quantidadeTexto);
    if (milesimos === null) return { ok: false, mensagem: MENSAGEM_QUANTIDADE };
    return { ok: true, linhas: this.juntar(linhas, peca, milesimos) };
  }

  private juntar(linhas: LinhaPeca[], peca: PecaEscolha, milesimos: number): LinhaPeca[] {
    const existente = linhas.find((linha) => linha.pecaId === peca.id);
    if (!existente) return [...linhas, this.linha(peca, milesimos)];
    const acumulado = (this.quantidades.emMilesimos(existente.quantidadeTexto) ?? 0) + milesimos;
    return linhas.map((linha) => (linha.pecaId === peca.id ? this.linha(peca, acumulado) : linha));
  }

  private linha(peca: PecaEscolha, milesimos: number): LinhaPeca {
    return {
      pecaId: peca.id,
      rotulo: `${peca.codigo} · ${peca.nome}`,
      quantidadeTexto: this.quantidades.formatar(milesimos),
      unidade: peca.unidade,
    };
  }
}
