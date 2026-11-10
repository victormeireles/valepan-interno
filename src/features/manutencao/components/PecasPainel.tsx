'use client';

import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { registrarEntrada, registrarSaida } from '@/app/manutencao/manutencao-estoque-actions';
import { salvarPeca } from '@/app/manutencao/manutencao-peca-actions';
import type { PecaItem } from '@/app/manutencao/manutencao-peca-consulta';
import { Button } from '@/components/ui/Button';
import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { PrecoCentavos } from '@/domain/manutencao/preco-centavos';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';
import {
  FORMULARIO_PECA_VAZIO,
  PecaFormulario,
  type PecaFormularioValor,
} from './PecaFormulario';
import {
  MovimentoFormulario,
  type PedidoEntrada,
  type PedidoSaida,
  type PecaMovimentoOpcao,
} from './MovimentoFormulario';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';

type PecasPainelProps = {
  pecas: PecaItem[];
  podeCadastrar: boolean;
  podeMovimentar: boolean;
};

type Aviso = { texto: string; ok: boolean };
type Resultado = { ok: boolean; mensagem: string };

export function PecasPainel({ pecas, podeCadastrar, podeMovimentar }: PecasPainelProps) {
  const painel = usePainelPecas();
  const ativas = pecas.filter((peca) => peca.ativo).map(opcaoDaPeca);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Peças</h1>
      {podeCadastrar ? (
        <PecaFormulario
          key={painel.versaoFormulario}
          valor={painel.valor}
          podeCadastrar={podeCadastrar}
          onSubmit={painel.gravar}
        />
      ) : null}
      {painel.avisoCadastro ? <AvisoSalvar aviso={painel.avisoCadastro} /> : null}
      {podeMovimentar ? (
        <MovimentoFormulario pecas={ativas} onEntrada={painel.entrar} onSaida={painel.sair} />
      ) : null}
      {painel.avisoMovimento ? <AvisoSalvar aviso={painel.avisoMovimento} /> : null}
      <ListaPecas pecas={pecas} podeCadastrar={podeCadastrar} onEditar={painel.editar} />
    </div>
  );
}

function usePainelPecas() {
  const cadastro = useCadastroPeca();
  const movimento = useMovimentoPeca();
  return { ...cadastro, ...movimento };
}

function useCadastroPeca() {
  const router = useRouter();
  const [valor, setValor] = useState(FORMULARIO_PECA_VAZIO);
  const [versaoFormulario, setVersaoFormulario] = useState(0);
  const [avisoCadastro, setAvisoCadastro] = useState<Aviso | null>(null);

  function editar(peca: PecaItem) {
    setValor(valorDaPeca(peca));
    setVersaoFormulario((atual) => atual + 1);
    setAvisoCadastro(null);
  }

  function gravar(entrada: PecaFormularioValor) {
    return executar(
      () => salvarPeca(entrada),
      setAvisoCadastro,
      'Não foi possível salvar.',
      () => concluirCadastro(setValor, setVersaoFormulario, () => router.refresh()),
    );
  }

  return { valor, versaoFormulario, avisoCadastro, editar, gravar };
}

function useMovimentoPeca() {
  const router = useRouter();
  const [avisoMovimento, setAvisoMovimento] = useState<Aviso | null>(null);

  function entrar(pedido: PedidoEntrada) {
    return dispararMovimento(pedido.pecaId, setAvisoMovimento, () => router.refresh(), () =>
      registrarEntrada(pedido.pecaId, pedido.quantidade, pedido.preco),
    );
  }

  function sair(pedido: PedidoSaida) {
    return dispararMovimento(pedido.pecaId, setAvisoMovimento, () => router.refresh(), () =>
      registrarSaida(pedido.pecaId, pedido.quantidade, pedido.motivo),
    );
  }

  return { avisoMovimento, entrar, sair };
}

function concluirCadastro(
  definirValor: Dispatch<SetStateAction<PecaFormularioValor>>,
  definirVersao: Dispatch<SetStateAction<number>>,
  atualizar: () => void,
) {
  definirValor(FORMULARIO_PECA_VAZIO);
  definirVersao((atual) => atual + 1);
  atualizar();
}

async function dispararMovimento(
  pecaId: string,
  publicar: (aviso: Aviso) => void,
  atualizar: () => void,
  acao: () => Promise<Resultado>,
): Promise<Resultado> {
  if (!pecaId) return publicarFalha(publicar, 'Selecione a peça.');
  return executar(acao, publicar, 'Não foi possível movimentar.', atualizar);
}

function ListaPecas({
  pecas,
  podeCadastrar,
  onEditar,
}: {
  pecas: PecaItem[];
  podeCadastrar: boolean;
  onEditar: (peca: PecaItem) => void;
}) {
  if (pecas.length === 0) {
    return <p className={`${CARTAO} px-4 py-6 text-sm text-stone-600`}>Nenhuma peça.</p>;
  }

  const grade = gradeDaLista(podeCadastrar);

  return (
    <div className={CARTAO}>
      <CabecalhoLista grade={grade} podeCadastrar={podeCadastrar} />
      <ul>
        {pecas.map((peca, indice) => (
          <LinhaPeca
            key={peca.id}
            peca={peca}
            par={indice % 2 === 1}
            grade={grade}
            podeCadastrar={podeCadastrar}
            onEditar={onEditar}
          />
        ))}
      </ul>
    </div>
  );
}

function CabecalhoLista({ grade, podeCadastrar }: { grade: string; podeCadastrar: boolean }) {
  return (
    <div
      className={`hidden border-b border-stone-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 md:grid md:items-center md:gap-3 ${grade}`}
    >
      <span className="whitespace-nowrap">Código</span>
      <span className="whitespace-nowrap">Nome</span>
      <span className="whitespace-nowrap">Unidade</span>
      <span className="whitespace-nowrap text-right">Saldo</span>
      <span className="whitespace-nowrap text-right">Custo médio</span>
      <span className="whitespace-nowrap text-right">Valor</span>
      {podeCadastrar ? <span className="sr-only">Ações</span> : null}
    </div>
  );
}

function LinhaPeca({
  peca,
  par,
  grade,
  podeCadastrar,
  onEditar,
}: {
  peca: PecaItem;
  par: boolean;
  grade: string;
  podeCadastrar: boolean;
  onEditar: (peca: PecaItem) => void;
}) {
  const celulas = celulasDaPeca(peca);
  const fundo = par ? 'bg-stone-50/60' : 'bg-white';

  return (
    <li
      className={`grid grid-cols-1 gap-2 border-b border-stone-100 px-4 py-3 last:border-b-0 md:items-center md:gap-3 md:py-2 ${grade} ${fundo} hover:bg-amber-50/60`}
    >
      <IdentidadePeca peca={peca} />
      <NumerosPeca celulas={celulas} />
      {podeCadastrar ? (
        <Button type="button" variant="secondary" size="lg" onClick={() => onEditar(peca)}>
          Editar
        </Button>
      ) : null}
    </li>
  );
}

function IdentidadePeca({ peca }: { peca: PecaItem }) {
  return (
    <div className="min-w-0 md:contents">
      <p className="min-w-0 truncate font-mono text-sm tabular-nums text-stone-900">{peca.codigo}</p>
      <p className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-stone-900">
        <span className="truncate">{peca.nome}</span>
        {peca.ativo ? null : (
          <span className="shrink-0 font-medium text-amber-800">Inativa</span>
        )}
      </p>
      <p className="text-sm text-stone-700">
        <RotuloMovel>Unidade</RotuloMovel>
        {peca.unidade}
      </p>
    </div>
  );
}

function NumerosPeca({ celulas }: { celulas: CelulasPeca }) {
  const corSaldo = celulas.saldoNegativo ? 'text-red-700' : 'text-stone-900';
  const corValor = celulas.valorNegativo ? 'text-red-700' : 'text-stone-900';

  return (
    <div className="grid grid-cols-3 gap-2 md:contents">
      <CampoNumero rotulo="Saldo" className={corSaldo}>
        {celulas.saldo}
      </CampoNumero>
      <CampoNumero rotulo="Custo médio" className="text-stone-700">
        {celulas.custo}
      </CampoNumero>
      <CampoNumero rotulo="Valor" className={corValor}>
        {celulas.valor}
      </CampoNumero>
    </div>
  );
}

function CampoNumero({
  rotulo,
  className,
  children,
}: {
  rotulo: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <p className="flex items-baseline justify-between gap-2 md:block md:text-right">
      <RotuloMovel>{rotulo}</RotuloMovel>
      <span className={`font-mono text-sm tabular-nums ${className}`}>{children}</span>
    </p>
  );
}

function RotuloMovel({ children }: { children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:hidden">
      {children}
    </span>
  );
}

function AvisoSalvar({ aviso }: { aviso: Aviso }) {
  const cor = aviso.ok ? 'text-emerald-800' : 'text-red-700';
  return (
    <p className={`text-sm ${cor}`} role={aviso.ok ? 'status' : 'alert'}>
      {aviso.texto}
    </p>
  );
}

type CelulasPeca = {
  saldo: string;
  saldoNegativo: boolean;
  custo: string;
  valor: string;
  valorNegativo: boolean;
};

class ApresentacaoPeca {
  constructor(
    private readonly quantidades = new QuantidadeEstoque(),
    private readonly precos = new PrecoCentavos(),
    private readonly saldos = new ConversorSaldo(),
  ) {}

  textoSaldo(saldo: string): string {
    return this.quantidades.formatar(this.saldos.emMilesimos(saldo));
  }

  saldoNegativo(saldo: string): boolean {
    return this.saldos.emMilesimos(saldo) < 0;
  }

  textoCusto(centavos: number | null): string {
    if (centavos === null) return '—';
    return this.precos.formatar(centavos);
  }

  textoValor(centavos: number): string {
    return this.precos.formatar(centavos);
  }
}

const apresentacao = new ApresentacaoPeca();

function celulasDaPeca(peca: PecaItem): CelulasPeca {
  return {
    saldo: apresentacao.textoSaldo(peca.saldo),
    saldoNegativo: apresentacao.saldoNegativo(peca.saldo),
    custo: apresentacao.textoCusto(peca.custoMedioCentavos),
    valor: apresentacao.textoValor(peca.valorCentavos),
    valorNegativo: peca.valorCentavos < 0,
  };
}

function valorDaPeca(peca: PecaItem): PecaFormularioValor {
  return {
    id: peca.id,
    codigo: peca.codigo,
    nome: peca.nome,
    unidade: peca.unidade,
    ativo: peca.ativo,
  };
}

function opcaoDaPeca(peca: PecaItem): PecaMovimentoOpcao {
  return { id: peca.id, codigo: peca.codigo, nome: peca.nome };
}

function gradeDaLista(podeCadastrar: boolean): string {
  if (podeCadastrar) {
    return 'md:grid-cols-[6.5rem_minmax(0,1.6fr)_4.5rem_6rem_8.5rem_6.5rem_auto]';
  }
  return 'md:grid-cols-[6.5rem_minmax(0,1.6fr)_4.5rem_6rem_8.5rem_6.5rem]';
}

async function executar(
  acao: () => Promise<Resultado>,
  publicar: (aviso: Aviso) => void,
  falha: string,
  aoOk: () => void,
): Promise<Resultado> {
  try {
    const resultado = await acao();
    publicar({ texto: resultado.mensagem, ok: resultado.ok });
    if (resultado.ok) aoOk();
    return resultado;
  } catch {
    return publicarFalha(publicar, falha);
  }
}

function publicarFalha(publicar: (aviso: Aviso) => void, texto: string): Resultado {
  publicar({ texto, ok: false });
  return { ok: false, mensagem: texto };
}
