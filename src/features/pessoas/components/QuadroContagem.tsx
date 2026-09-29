import type { QuadroNumeros } from '@/domain/pessoas/quadro-montagem';

const ROTULOS = [
  { chave: 'aprovado', rotulo: 'Aprovadas' },
  { chave: 'contratados', rotulo: 'Contratados' },
  { chave: 'reservas', rotulo: 'Reservas' },
  { chave: 'livres', rotulo: 'Livres' },
] as const;

type Props = {
  numeros: QuadroNumeros;
  densidade: 'geral' | 'setor';
};

export function QuadroContagem({ numeros, densidade }: Props) {
  if (densidade === 'geral') return <FaixaGeral numeros={numeros} />;
  return <FaixaSetor numeros={numeros} />;
}

function FaixaGeral({ numeros }: { numeros: QuadroNumeros }) {
  return (
    <section aria-label="Totais do quadro" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <dl className="grid grid-cols-4 gap-2">
        {ROTULOS.map((item) => (
          <Celula key={item.chave} rotulo={item.rotulo} valor={numeros[item.chave]} destaque={item.chave === 'livres'} tamanho="geral" />
        ))}
      </dl>
      <BarraOcupacao numeros={numeros} />
    </section>
  );
}

function FaixaSetor({ numeros }: { numeros: QuadroNumeros }) {
  return (
    <dl aria-label="Totais do setor" className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:w-auto sm:grid-cols-4">
      {ROTULOS.map((item) => (
        <Celula key={item.chave} rotulo={item.rotulo} valor={numeros[item.chave]} destaque={item.chave === 'livres'} tamanho="setor" />
      ))}
    </dl>
  );
}

function Celula({
  rotulo,
  valor,
  destaque,
  tamanho,
}: {
  rotulo: string;
  valor: number;
  destaque: boolean;
  tamanho: 'geral' | 'setor';
}) {
  const numero = tamanho === 'geral' ? 'text-2xl' : 'text-sm';
  const cor = destaque && valor > 0 ? 'text-amber-800' : 'text-stone-900';
  return (
    <div className={tamanho === 'setor' ? 'bg-stone-50 px-3 py-1.5 text-center' : 'text-center sm:text-left'}>
      <dt className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-stone-500">{rotulo}</dt>
      <dd className={`font-mono font-semibold tabular-nums ${numero} ${cor}`}>{valor.toLocaleString('pt-BR')}</dd>
    </div>
  );
}

function BarraOcupacao({ numeros }: { numeros: QuadroNumeros }) {
  const base = Math.max(numeros.aprovado, 1);
  const contratados = Math.max(numeros.contratados, 0) / base;
  const reservas = Math.max(numeros.reservas, 0) / base;
  return (
    <span className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
      <span className="bg-amber-600" style={{ width: `${contratados * 100}%` }} />
      <span className="bg-amber-300" style={{ width: `${reservas * 100}%` }} />
    </span>
  );
}
