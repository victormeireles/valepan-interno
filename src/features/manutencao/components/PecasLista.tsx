'use client';

import type { ReactNode } from 'react';
import type { PecaItem } from '@/app/manutencao/manutencao-peca-consulta';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { PrecoCentavos } from '@/domain/manutencao/preco-centavos';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';

type PecasListaProps = {
  pecas: PecaItem[];
  termo: string;
  totalGeral: number;
  podeCadastrar: boolean;
  podeMovimentar: boolean;
  onTermo: (termo: string) => void;
  onCriar: () => void;
  onEditar: (peca: PecaItem) => void;
  onRemover: (peca: PecaItem) => void;
  onEntrada: (peca: PecaItem) => void;
  onSaida: (peca: PecaItem) => void;
};

export function PecasLista({
  pecas,
  termo,
  totalGeral,
  podeCadastrar,
  podeMovimentar,
  onTermo,
  onCriar,
  onEditar,
  onRemover,
  onEntrada,
  onSaida,
}: PecasListaProps) {
  const temAcoes = podeCadastrar || podeMovimentar;
  const grade = gradeDaLista(temAcoes);
  const buscaAtiva = termo.trim().length > 0;

  return (
    <div className="space-y-3">
      <BarraBusca termo={termo} onTermo={onTermo} />
      {pecas.length === 0 ? (
        <ListaVazia
          buscaAtiva={buscaAtiva}
          totalGeral={totalGeral}
          podeCadastrar={podeCadastrar}
          onCriar={onCriar}
        />
      ) : (
        <div className={CARTAO}>
          <CabecalhoLista grade={grade} temAcoes={temAcoes} />
          <ul>
            {pecas.map((peca, indice) => (
              <LinhaPeca
                key={peca.id}
                peca={peca}
                par={indice % 2 === 1}
                grade={grade}
                podeCadastrar={podeCadastrar}
                podeMovimentar={podeMovimentar}
                onEditar={onEditar}
                onRemover={onRemover}
                onEntrada={onEntrada}
                onSaida={onSaida}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BarraBusca({ termo, onTermo }: { termo: string; onTermo: (termo: string) => void }) {
  return (
    <Input
      label="Buscar"
      aria-label="Buscar peças"
      placeholder="Código, nome ou unidade"
      icon="search"
      value={termo}
      autoComplete="off"
      onChange={(evento) => onTermo(evento.target.value)}
    />
  );
}

function ListaVazia({
  buscaAtiva,
  totalGeral,
  podeCadastrar,
  onCriar,
}: {
  buscaAtiva: boolean;
  totalGeral: number;
  podeCadastrar: boolean;
  onCriar: () => void;
}) {
  if (buscaAtiva) {
    return (
      <div className={CARTAO}>
        <EmptyState
          icon="search_off"
          title="Nenhuma peça encontrada"
          description="Tente outro código, nome ou unidade."
        />
      </div>
    );
  }

  return (
    <div className={CARTAO}>
      <EmptyState
        icon="construction"
        title={totalGeral === 0 ? 'Nenhuma peça cadastrada' : 'Nenhuma peça'}
        description="Cadastre peças para controlar saldo e movimentação."
        action={
          podeCadastrar ? (
            <Button type="button" size="lg" icon="add" onClick={onCriar}>
              Nova peça
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

function CabecalhoLista({ grade, temAcoes }: { grade: string; temAcoes: boolean }) {
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
      {temAcoes ? <span className="sr-only">Ações</span> : null}
    </div>
  );
}

function LinhaPeca({
  peca,
  par,
  grade,
  podeCadastrar,
  podeMovimentar,
  onEditar,
  onRemover,
  onEntrada,
  onSaida,
}: {
  peca: PecaItem;
  par: boolean;
  grade: string;
  podeCadastrar: boolean;
  podeMovimentar: boolean;
  onEditar: (peca: PecaItem) => void;
  onRemover: (peca: PecaItem) => void;
  onEntrada: (peca: PecaItem) => void;
  onSaida: (peca: PecaItem) => void;
}) {
  const celulas = celulasDaPeca(peca);
  const fundo = par ? 'bg-stone-50/60' : 'bg-white';
  const temAcoes = podeCadastrar || podeMovimentar;

  return (
    <li
      className={`grid grid-cols-1 gap-2 border-b border-stone-100 px-4 py-3 last:border-b-0 md:items-center md:gap-3 md:py-2 ${grade} ${fundo} transition-colors duration-150 hover:bg-amber-50/60`}
    >
      <IdentidadePeca peca={peca} />
      <NumerosPeca celulas={celulas} />
      {temAcoes ? (
        <AcoesLinha
          peca={peca}
          podeCadastrar={podeCadastrar}
          podeMovimentar={podeMovimentar}
          onEditar={onEditar}
          onRemover={onRemover}
          onEntrada={onEntrada}
          onSaida={onSaida}
        />
      ) : null}
    </li>
  );
}

function AcoesLinha({
  peca,
  podeCadastrar,
  podeMovimentar,
  onEditar,
  onRemover,
  onEntrada,
  onSaida,
}: {
  peca: PecaItem;
  podeCadastrar: boolean;
  podeMovimentar: boolean;
  onEditar: (peca: PecaItem) => void;
  onRemover: (peca: PecaItem) => void;
  onEntrada: (peca: PecaItem) => void;
  onSaida: (peca: PecaItem) => void;
}) {
  const podeMover = podeMovimentar && peca.ativo;

  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {podeMovimentar ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon="add"
            disabled={!podeMover}
            aria-label={`Entrada ${peca.codigo}`}
            onClick={() => onEntrada(peca)}
          >
            Entrada
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon="remove"
            disabled={!podeMover}
            aria-label={`Saída ${peca.codigo}`}
            onClick={() => onSaida(peca)}
          >
            Saída
          </Button>
        </>
      ) : null}
      {podeCadastrar ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon="edit"
            aria-label={`Editar ${peca.codigo}`}
            onClick={() => onEditar(peca)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="lg"
            icon="delete"
            aria-label={`Remover ${peca.codigo}`}
            onClick={() => onRemover(peca)}
          >
            Remover
          </Button>
        </>
      ) : null}
    </div>
  );
}

function IdentidadePeca({ peca }: { peca: PecaItem }) {
  return (
    <div className="min-w-0 md:contents">
      <p className="min-w-0 truncate font-mono text-sm tabular-nums text-stone-900">{peca.codigo}</p>
      <p className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-stone-900">
        <span className="truncate">{peca.nome}</span>
        {peca.ativo ? null : (
          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Inativa
          </span>
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

function gradeDaLista(temAcoes: boolean): string {
  if (temAcoes) {
    return 'md:grid-cols-[6.5rem_minmax(0,1.4fr)_4.5rem_5.5rem_7.5rem_6rem_minmax(16rem,auto)]';
  }
  return 'md:grid-cols-[6.5rem_minmax(0,1.6fr)_4.5rem_6rem_8.5rem_6.5rem]';
}
