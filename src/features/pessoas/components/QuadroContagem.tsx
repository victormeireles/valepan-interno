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
      <NotaAfastados numeros={numeros} modo={modo} />
      <BarraOcupacao numeros={numeros} />
    </section>
  );
}

function FaixaSetor({ numeros }: { numeros: QuadroNumeros }) {
  return (
    <div>
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
      <NotaAfastados numeros={numeros} />
    </div>
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

export function NotaAfastados({ numeros, modo = 'total' }: { numeros: QuadroNumeros; modo?: QuadroTotaisModo }) {
  if (numeros.afastados <= 0) return null;
  const quantidade = numeros.afastados.toLocaleString('pt-BR');
  const pessoa = numeros.afastados === 1 ? 'pessoa fora do posto' : 'pessoas fora do posto';
  const texto =
    modo === 'total'
      ? `Inclui ${quantidade} ${pessoa} no quadro. A vaga continua livre.`
      : `${quantidade} ${pessoa}. A vaga continua livre.`;
  return <p className="mt-2 text-xs text-stone-600">{texto}</p>;
}

export function BarraOcupacao({ numeros, altura = 'h-1.5' }: { numeros: QuadroNumeros; altura?: string }) {
  const reservas = Math.max(numeros.reservas, 0);
  const livres = Math.max(numeros.livres, 0);
  const noPosto = Math.max(numeros.aprovado - reservas - livres, 0);
  return (
    <span className={`mt-3 flex overflow-hidden rounded-full bg-stone-200 ${altura}`} aria-hidden>
      {noPosto > 0 ? <span className="bg-amber-600" style={{ flex: `${noPosto} 1 0%` }} /> : null}
      {reservas > 0 ? <span className="bg-[#C6A848]" style={{ flex: `${reservas} 1 0%` }} /> : null}
      {livres > 0 ? <span style={{ flex: `${livres} 1 0%` }} /> : null}
    </span>
  );
}
