import type { FaltaResumoComparado } from '@/domain/pessoas/falta-resumo';

type Props = { resumo: FaltaResumoComparado };

export function FaltasResumoCards({ resumo }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-5">
      <CardNumero label="Faltas" valor={resumo.faltas} anterior={resumo.faltasAnterior} />
      <CardNumero label="Pessoas" valor={resumo.pessoas} anterior={resumo.pessoasAnterior} />
      <CardNumero label="Reincidentes" valor={resumo.reincidentes} anterior={resumo.reincidentesAnterior} />
      <CardNome label="Setor" nome={resumo.setor.nome} pessoas={resumo.setor.pessoas} anterior={resumo.setor.pessoasAnterior} />
      <CardNome label="Turno" nome={resumo.turno.nome} pessoas={resumo.turno.pessoas} anterior={resumo.turno.pessoasAnterior} />
    </div>
  );
}

function CardNumero({ label, valor, anterior }: { label: string; valor: number; anterior: number }) {
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <span className="font-mono text-4xl font-bold tabular-nums text-stone-900">{valor.toLocaleString('pt-BR')}</span>
      <Comparativo atual={valor} anterior={anterior} />
    </article>
  );
}

function CardNome({ label, nome, pessoas, anterior }: { label: string; nome: string | null; pessoas: number; anterior: number }) {
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <span className="text-xl font-semibold leading-tight text-stone-900">{nome ?? 'Sem concentração'}</span>
      <span className="font-mono text-sm tabular-nums text-stone-600">{pessoas.toLocaleString('pt-BR')} pessoas</span>
      <Comparativo atual={pessoas} anterior={anterior} />
    </article>
  );
}

function Comparativo({ atual, anterior }: { atual: number; anterior: number }) {
  const diff = atual - anterior;
  const tom = diff > 0 ? 'text-red-700' : diff < 0 ? 'text-emerald-700' : 'text-stone-500';
  return <span className={`text-xs font-medium ${tom}`}>{texto(diff, anterior)}</span>;
}

function texto(diff: number, anterior: number): string {
  if (diff === 0) return `Igual ao mês anterior (${anterior.toLocaleString('pt-BR')})`;
  const sinal = diff > 0 ? '+' : '−';
  return `${sinal}${Math.abs(diff).toLocaleString('pt-BR')} vs mês anterior (${anterior.toLocaleString('pt-BR')})`;
}
