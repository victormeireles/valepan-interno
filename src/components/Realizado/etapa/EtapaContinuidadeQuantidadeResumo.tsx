import { EtapaContinuidadeCopy } from '@/domain/producao-etapa/etapa-continuidade-copy';

export type EtapaContinuidadeQuantidadeResumoProps = {
  lancado: number;
  ordem: number;
  naoProduzido: number;
  unidade: string;
};

type ResumoCellProps = {
  label: string;
  valor: number;
  unidade: string;
  destaque?: boolean;
};

function ResumoCell({ label, valor, unidade, destaque = false }: ResumoCellProps) {
  return (
    <div className={destaque ? 'rounded-lg bg-amber-50 px-2 py-2' : 'px-2 py-2'}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-base font-semibold tabular-nums text-stone-900">
        {valor.toLocaleString('pt-BR')}
        <span className="ml-1 text-xs font-medium text-stone-500">{unidade}</span>
      </p>
    </div>
  );
}

export function EtapaContinuidadeQuantidadeResumo({
  lancado,
  ordem,
  naoProduzido,
  unidade,
}: EtapaContinuidadeQuantidadeResumoProps) {
  return (
    <div
      className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1"
      aria-label="Comparativo da quantidade lançada com a ordem"
    >
      <ResumoCell
        label={EtapaContinuidadeCopy.labelLancado()}
        valor={lancado}
        unidade={unidade}
      />
      <ResumoCell
        label={EtapaContinuidadeCopy.labelOrdem()}
        valor={ordem}
        unidade={unidade}
      />
      <ResumoCell
        label={EtapaContinuidadeCopy.labelNaoProduzido()}
        valor={naoProduzido}
        unidade={unidade}
        destaque
      />
    </div>
  );
}
