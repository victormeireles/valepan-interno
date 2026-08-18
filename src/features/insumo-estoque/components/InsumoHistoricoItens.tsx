import type { InsumoHistoricoItem } from '@/domain/insumos/insumo-historico-agrupador';
import InsumoHistoricoBlocoRow from './InsumoHistoricoBlocoRow';
import InsumoHistoricoMovimentoRow from './InsumoHistoricoMovimentoRow';

type Props = {
  itens: InsumoHistoricoItem[];
  unidadeResumida: string;
};

export default function InsumoHistoricoItens({ itens, unidadeResumida }: Props) {
  return (
    <ul className="divide-y divide-stone-100">
      {itens.map((item) => {
        if (item.kind === 'bloco') {
          return (
            <li key={item.movimentos.map((mov) => mov.id).join('-')}>
              <InsumoHistoricoBlocoRow
                movimentos={item.movimentos}
                unidadeResumida={unidadeResumida}
              />
            </li>
          );
        }

        return (
          <li key={item.movimento.id} className="first:[&>div]:pt-0 last:[&>div]:pb-0">
            <InsumoHistoricoMovimentoRow
              movimento={item.movimento}
              unidadeResumida={unidadeResumida}
            />
          </li>
        );
      })}
    </ul>
  );
}
