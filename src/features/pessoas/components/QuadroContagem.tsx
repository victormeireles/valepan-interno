'use client';

import { Chip } from '@/components/ui/Chip';
import type { QuadroNumeros } from '@/domain/pessoas/quadro-montagem';
import type { QuadroTotaisModo } from '@/domain/pessoas/quadro-totais';

const ROTULOS = [
  { chave: 'aprovado', rotulo: 'Aprovadas', curto: 'Aprov.' },
  { chave: 'contratados', rotulo: 'Contratados', curto: 'Contr.' },
  { chave: 'reservas', rotulo: 'A entrar', curto: 'Entrar' },
  { chave: 'livres', rotulo: 'Livres', curto: 'Livres' },
] as const;

type Props = {
  numeros: QuadroNumeros;
  densidade: 'geral' | 'setor';
  modo?: QuadroTotaisModo;
  onModo?: (modo: QuadroTotaisModo) => void;
};

export function QuadroContagem({ numeros, densidade, modo, onModo }: Props) {
  if (densidade === 'geral') return <FaixaGeral numeros={numeros} modo={modo} onModo={onModo} />;
  return <FaixaSetor numeros={numeros} />;
}

function FaixaGeral({
  numeros,
  modo,
  onModo,
}: {
  numeros: QuadroNumeros;
  modo?: QuadroTotaisModo;
  onModo?: (modo: QuadroTotaisModo) => void;
}) {
  return (
    <section aria-label="Totais do quadro" className="rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      {modo && onModo ? (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip type="button" active={modo === 'total'} onClick={() => onModo('total')} className="h-11 shrink-0">
            Total
          </Chip>
          <Chip type="button" active={modo === 'operacional'} onClick={() => onModo('operacional')} className="h-11 shrink-0">
            Somente operacional
          </Chip>
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
        {ROTULOS.map((item) => (
          <Celula
            key={item.chave}
            rotulo={item.rotulo}
            curto={item.curto}
            valor={numeros[item.chave]}
            destaque={item.chave === 'livres'}
            tamanho="geral"
          />
        ))}
      </dl>
      <BarraOcupacao numeros={numeros} />
    </section>
  );
}

function FaixaSetor({ numeros }: { numeros: QuadroNumeros }) {
  return (
    <dl aria-label="Totais do setor" className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-4">
      {ROTULOS.map((item) => (
        <Celula
          key={item.chave}
          rotulo={item.rotulo}
          curto={item.curto}
          valor={numeros[item.chave]}
          destaque={item.chave === 'livres'}
          tamanho="setor"
        />
      ))}
    </dl>
  );
}

function Celula({
  rotulo,
  curto,
  valor,
  destaque,
  tamanho,
}: {
  rotulo: string;
  curto: string;
  valor: number;
  destaque: boolean;
  tamanho: 'geral' | 'setor';
}) {
  const numero = tamanho === 'geral' ? 'text-xl sm:text-2xl' : 'text-sm';
  const cor = destaque && valor > 0 ? 'text-amber-800' : 'text-stone-900';
  return (
    <div className={tamanho === 'setor' ? 'bg-stone-50 px-2 py-1.5 text-center sm:px-3' : 'text-center sm:text-left'}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        <span className="sm:hidden">{curto}</span>
        <span className="hidden sm:inline">{rotulo}</span>
      </dt>
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
