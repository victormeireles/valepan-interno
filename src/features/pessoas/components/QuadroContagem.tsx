'use client';

import { Chip } from '@/components/ui/Chip';
import type { QuadroNumeros } from '@/domain/pessoas/quadro-montagem';
import type { QuadroTotaisModo } from '@/domain/pessoas/quadro-totais';
import { BarrasQuadro } from './QuadroBarraOcupacao';
import { NotasQuadro } from './QuadroNotas';

const ROTULOS = [
  { chave: 'aprovado', rotulo: 'Aprovadas', curto: 'Aprov.' },
  { chave: 'contratados', rotulo: 'Contratados', curto: 'Contr.' },
  { chave: 'ferias', rotulo: 'Em férias', curto: 'Férias' },
  { chave: 'reservas', rotulo: 'A entrar', curto: 'Entrar' },
  { chave: 'avisos', rotulo: 'Em aviso', curto: 'Aviso' },
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
      <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-2">
        {ROTULOS.map((item) => (
          <Celula
            key={item.chave}
            rotulo={item.rotulo}
            curto={item.curto}
            valor={numeros[item.chave] ?? 0}
            tom={tomDaCelula(item.chave, numeros[item.chave] ?? 0)}
            tamanho="geral"
          />
        ))}
      </dl>
      <NotasQuadro numeros={numeros} modo={modo} />
      <BarrasQuadro numeros={numeros} />
    </section>
  );
}

function FaixaSetor({ numeros }: { numeros: QuadroNumeros }) {
  return (
    <div>
      <dl aria-label="Totais do setor" className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-6">
        {ROTULOS.map((item) => (
          <Celula
            key={item.chave}
            rotulo={item.rotulo}
            curto={item.curto}
            valor={numeros[item.chave] ?? 0}
            tom={tomDaCelula(item.chave, numeros[item.chave] ?? 0)}
            tamanho="setor"
          />
        ))}
      </dl>
      <NotasQuadro numeros={numeros} />
    </div>
  );
}

function Celula({
  rotulo,
  curto,
  valor,
  tom,
  tamanho,
}: {
  rotulo: string;
  curto: string;
  valor: number;
  tom: 'aviso' | 'livre' | 'padrao';
  tamanho: 'geral' | 'setor';
}) {
  const numero = tamanho === 'geral' ? 'text-xl sm:text-2xl' : 'text-sm';
  const cor = tom === 'aviso' ? 'text-rose-700' : tom === 'livre' ? 'text-amber-800' : 'text-stone-900';
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

function tomDaCelula(chave: (typeof ROTULOS)[number]['chave'], valor: number): 'aviso' | 'livre' | 'padrao' {
  if (chave === 'avisos' && valor > 0) return 'aviso';
  if (chave === 'livres' && valor > 0) return 'livre';
  return 'padrao';
}
