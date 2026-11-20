import type { QuadroNumeros } from '@/domain/pessoas/quadro-montagem';
import { QuadroOcupacao, type QuadroOcupacaoSegmentos } from '@/domain/pessoas/quadro-ocupacao';

const ocupacao = new QuadroOcupacao();

type Props = {
  numeros: QuadroNumeros;
  altura?: string;
  projecao?: boolean;
};

export function BarraOcupacao({ numeros, altura = 'h-1.5', projecao = false }: Props) {
  const segmentos = ocupacao.segmentos(numeros);
  const rotulo = projecao ? rotuloProjecao(segmentos) : rotuloAtual(segmentos);
  return (
    <span className={`flex overflow-hidden rounded-full bg-stone-200 ${altura}`} aria-label={rotulo}>
      {projecao ? <FaixasProjecao segmentos={segmentos} /> : <FaixasAtual segmentos={segmentos} />}
    </span>
  );
}

export function BarrasQuadro({ numeros, altura = 'h-1.5' }: { numeros: QuadroNumeros; altura?: string }) {
  const temAviso = numeros.avisos > 0;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {temAviso ? <RotuloBarra texto="Hoje" /> : null}
      <BarraOcupacao numeros={numeros} altura={altura} />
      {temAviso ? (
        <>
          <RotuloBarra texto="Após as saídas" />
          <BarraOcupacao numeros={numeros} altura={altura} projecao />
          <LegendaOcupacao numeros={numeros} />
        </>
      ) : null}
    </div>
  );
}

export function LegendaOcupacao({ numeros }: { numeros: QuadroNumeros }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-600">
      <Item cor="bg-amber-600" texto="No posto" />
      {numeros.avisos > 0 ? <Item cor="bg-rose-500" texto="Em aviso" /> : null}
      {numeros.reservas > 0 ? <Item cor="bg-[#C6A848]" texto="A entrar" /> : null}
      <Item cor="bg-stone-200" texto="Livres" />
    </ul>
  );
}

function FaixasAtual({ segmentos }: { segmentos: QuadroOcupacaoSegmentos }) {
  return (
    <>
      <Faixa cor="bg-amber-600" valor={segmentos.noPosto} />
      <Faixa cor="bg-rose-500" valor={segmentos.avisos} />
      <Faixa cor="bg-[#C6A848]" valor={segmentos.reservas} />
      <Faixa valor={segmentos.livres} />
    </>
  );
}

function FaixasProjecao({ segmentos }: { segmentos: QuadroOcupacaoSegmentos }) {
  return (
    <>
      <Faixa cor="bg-amber-600" valor={segmentos.noPosto} />
      <Faixa cor="bg-[#C6A848]" valor={segmentos.reservas} />
      <Faixa valor={segmentos.livresAposSaidas} />
    </>
  );
}

function Faixa({ cor, valor }: { cor?: string; valor: number }) {
  if (valor <= 0) return null;
  return <span className={cor} style={{ flex: `${valor} 1 0%` }} />;
}

function RotuloBarra({ texto }: { texto: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{texto}</p>;
}

function Item({ cor, texto }: { cor: string; texto: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${cor}`} aria-hidden />
      {texto}
    </li>
  );
}

function rotuloAtual(segmentos: QuadroOcupacaoSegmentos): string {
  return `Hoje: ${segmentos.noPosto} no posto, ${segmentos.avisos} em aviso, ${segmentos.reservas} a entrar, ${segmentos.livres} livres`;
}

function rotuloProjecao(segmentos: QuadroOcupacaoSegmentos): string {
  return `Após as saídas: ${segmentos.noPosto} no posto, ${segmentos.reservas} a entrar, ${segmentos.livresAposSaidas} livres`;
}
