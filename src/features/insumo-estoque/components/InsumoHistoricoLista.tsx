import { agruparItensHistoricoPorDia } from '@/domain/insumos/insumo-historico-agrupador';
import type { InsumoHistoricoItem } from '@/domain/insumos/insumo-historico-agrupador';
import { formatWeekdayDayMonthBr } from '@/lib/utils/date-utils';
import InsumoHistoricoItens from './InsumoHistoricoItens';

type Props = {
  itens: InsumoHistoricoItem[];
  unidadeResumida: string;
  mostrarCabecalhoDia: boolean;
};

export default function InsumoHistoricoLista({
  itens,
  unidadeResumida,
  mostrarCabecalhoDia,
}: Props) {
  if (!mostrarCabecalhoDia) {
    return <InsumoHistoricoItens itens={itens} unidadeResumida={unidadeResumida} />;
  }

  return (
    <div className="space-y-5">
      {agruparItensHistoricoPorDia(itens).map((secao) => (
        <section key={secao.dataISO}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            {formatWeekdayDayMonthBr(secao.dataISO)}
          </h3>
          <InsumoHistoricoItens itens={secao.itens} unidadeResumida={unidadeResumida} />
        </section>
      ))}
    </div>
  );
}
