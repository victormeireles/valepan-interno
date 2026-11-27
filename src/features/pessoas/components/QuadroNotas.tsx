import type { QuadroNumeros } from '@/domain/pessoas/quadro-montagem';
import { FeriasQuadro } from '@/domain/pessoas/ferias-quadro';
import { QuadroOcupacao } from '@/domain/pessoas/quadro-ocupacao';
import type { QuadroTotaisModo } from '@/domain/pessoas/quadro-totais';

const ocupacao = new QuadroOcupacao();

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

export function NotaAvisos({ numeros }: { numeros: QuadroNumeros }) {
  if (numeros.avisos <= 0) return null;
  const quantidade = numeros.avisos.toLocaleString('pt-BR');
  const pessoa = numeros.avisos === 1 ? 'pessoa em aviso' : 'pessoas em aviso';
  const livresApos = ocupacao.segmentos(numeros).livresAposSaidas;
  const livres = livresApos.toLocaleString('pt-BR');
  const vaga = livresApos === 1 ? 'vaga livre' : 'vagas livres';
  return (
    <p className="mt-2 text-xs text-stone-600">
      {quantidade} {pessoa}. Após as saídas: {livres} {vaga}.
    </p>
  );
}

export function NotaFerias({ numeros }: { numeros: QuadroNumeros }) {
  const texto = new FeriasQuadro().nota(numeros);
  if (!texto) return null;
  return <p className="mt-2 text-xs text-stone-600">{texto}</p>;
}

export function NotasQuadro({ numeros, modo = 'total' }: { numeros: QuadroNumeros; modo?: QuadroTotaisModo }) {
  return (
    <>
      <NotaAfastados numeros={numeros} modo={modo} />
      <NotaAvisos numeros={numeros} />
      <NotaFerias numeros={numeros} />
    </>
  );
}
