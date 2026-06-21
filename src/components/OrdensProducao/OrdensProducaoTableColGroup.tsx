import { ORDENS_PRODUCAO_TABLE_COLUMN_WIDTHS } from '@/components/OrdensProducao/ordens-producao-table-columns';

export default function OrdensProducaoTableColGroup() {
  return (
    <colgroup>
      {ORDENS_PRODUCAO_TABLE_COLUMN_WIDTHS.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );
}
