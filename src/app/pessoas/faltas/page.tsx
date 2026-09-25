import { listFaltas } from '@/app/actions/pessoas-faltas-actions';
import { listColaboradores } from '@/app/actions/pessoas-actions';
import { FaltasLista } from '@/features/pessoas/components/FaltasLista';
import { FaltaPeriodoCalculo } from '@/domain/pessoas/falta-periodo';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';

export default async function PessoasFaltasPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const params = await searchParams;
  const padrao = new FaltaPeriodoCalculo().mesAteOntem(getTodayISOInBrazilTimezone());
  const inicio = params.inicio ?? padrao.inicio;
  const fim = params.fim ?? padrao.fim;
  const anterior = new FaltaPeriodoCalculo().mesAnterior({ inicio, fim });
  const [itens, itensAnteriores, pessoas] = await Promise.all([
    listFaltas(inicio, fim),
    listFaltas(anterior.inicio, anterior.fim),
    listColaboradores(),
  ]);
  return (
    <FaltasLista
      itens={itens}
      anterior={itensAnteriores}
      pessoas={pessoas.map((pessoa) => ({ codigo: pessoa.codigo, nome: pessoa.nome }))}
      inicio={inicio}
      fim={fim}
    />
  );
}
