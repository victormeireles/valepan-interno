import { FaltaComparativoPercentual } from '@/domain/pessoas/falta-comparativo-percentual';
import { FaltaIndicadorQuadro, type FaltaLeituraQuadro } from '@/domain/pessoas/falta-indicador-quadro';
import type { FaltaResumoComparado } from '@/domain/pessoas/falta-resumo';

const comparativo = new FaltaComparativoPercentual();
const indicador = new FaltaIndicadorQuadro();

type Props = { resumo: FaltaResumoComparado; total: number };

export function FaltasResumoCards({ resumo, total }: Props) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 pt-4 xl:grid-cols-6">
      <CardTotal total={total} />
      <CardNumero
        label="Faltas"
        valor={resumo.faltas}
        anterior={resumo.faltasAnterior}
        leitura={indicador.media(resumo.faltas, total)}
      />
      <CardNumero
        label="Pessoas"
        valor={resumo.pessoas}
        anterior={resumo.pessoasAnterior}
        leitura={indicador.participacao(resumo.pessoas, total)}
      />
      <CardNumero
        label="Reincidentes"
        valor={resumo.reincidentes}
        anterior={resumo.reincidentesAnterior}
        leitura={indicador.participacao(resumo.reincidentes, total)}
      />
      <CardConcentracao resumo={resumo} />
    </div>
  );
}

function CardNumero({
  label,
  valor,
  anterior,
  leitura,
}: {
  label: string;
  valor: number;
  anterior: number;
  leitura: FaltaLeituraQuadro;
}) {
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4">
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:text-xs">{label}</span>
      <span className="font-mono text-2xl font-bold tabular-nums text-stone-900 sm:text-4xl">
        {valor.toLocaleString('pt-BR')}
      </span>
      <p className="m-0 text-xs leading-snug">
        <span className="font-mono font-semibold tabular-nums text-stone-800">{leitura.valor}</span>
        <span className="font-medium text-stone-600"> {leitura.rotulo}</span>
      </p>
      <Comparativo atual={valor} anterior={anterior} />
    </article>
  );
}

function CardTotal({ total }: { total: number }) {
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4">
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:text-xs">Total</span>
      <span className="font-mono text-2xl font-bold tabular-nums text-stone-900 sm:text-4xl">
        {total.toLocaleString('pt-BR')}
      </span>
      <p className="m-0 text-xs font-medium leading-snug text-stone-600">pessoas no filtro</p>
    </article>
  );
}

function CardConcentracao({ resumo }: { resumo: FaltaResumoComparado }) {
  return (
    <article
      className="col-span-2 flex min-w-0 flex-col gap-2 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4"
      aria-label="Concentração de faltas"
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:text-xs">Concentração</span>
      <div className="grid grid-cols-2 gap-3">
        <ConcentracaoItem
          label="Setor"
          nome={resumo.setor.nome}
          pessoas={resumo.setor.pessoas}
          anterior={resumo.setor.pessoasAnterior}
        />
        <ConcentracaoItem
          label="Turno"
          nome={resumo.turno.nome}
          pessoas={resumo.turno.pessoas}
          anterior={resumo.turno.pessoasAnterior}
          separado
        />
      </div>
    </article>
  );
}

function ConcentracaoItem({
  label,
  nome,
  pessoas,
  anterior,
  separado = false,
}: {
  label: string;
  nome: string | null;
  pessoas: number;
  anterior: number;
  separado?: boolean;
}) {
  const nomeVisivel = nome ?? 'Sem concentração';
  return (
    <div className={separado ? 'min-w-0 border-l border-stone-200 pl-3' : 'min-w-0'}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <p className="m-0 text-base font-semibold leading-tight text-stone-900" title={nomeVisivel}>
        {nomeVisivel}
      </p>
      <p className="m-0 font-mono text-sm tabular-nums text-stone-600">{rotuloPessoas(pessoas)}</p>
      <Comparativo atual={pessoas} anterior={anterior} />
    </div>
  );
}

function tomComparativo(atual: number, anterior: number): string {
  if (anterior <= 0 || atual === anterior) return 'text-stone-500';
  return atual > anterior ? 'text-red-700' : 'text-emerald-700';
}

function rotuloPessoas(quantidade: number): string {
  const numero = quantidade.toLocaleString('pt-BR');
  return quantidade === 1 ? `${numero} pessoa` : `${numero} pessoas`;
}

function Comparativo({ atual, anterior }: { atual: number; anterior: number }) {
  const tom = tomComparativo(atual, anterior);
  return (
    <span className={`text-[11px] font-medium leading-snug sm:text-xs ${tom}`}>
      {comparativo.texto(atual, anterior)}
    </span>
  );
}
