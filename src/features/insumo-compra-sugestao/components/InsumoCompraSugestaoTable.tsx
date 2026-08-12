import { Badge } from '@/components/ui/Badge';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
} from '@/components/Config/config-table-styles';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';
import {
  formatCoberturaDias,
  formatInsumoQuantidadeArredondada,
} from '@/features/insumo-estoque/utils/formatters';
import { insumoCompraSugestaoStatusTone } from '../insumo-compra-sugestao-status-tone';

type Props = {
  items: InsumoCompraSugestaoLinha[];
  embedded?: boolean;
};

export default function InsumoCompraSugestaoTable({ items, embedded = false }: Props) {
  return (
    <div className={embedded ? 'hidden overflow-x-auto md:block' : 'hidden md:block'}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <Cabecalho label="Insumo" />
            <Cabecalho label="Status" />
            <Cabecalho label="Estoque" numeric />
            <Cabecalho label="Consumo/dia" numeric />
            <Cabecalho label="Cobertura" numeric />
            <Cabecalho label="Lead time" numeric />
            <Cabecalho label="Sugestão" numeric />
            <Cabecalho label="Fornecedor" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item) => {
            const visual = insumoCompraSugestaoStatusTone.resolve(item.status);
            return (
              <tr
                key={item.insumoId}
                className={`${visual.rowClassName} transition-colors hover:bg-amber-50`}
              >
                <td className={`${configTableBodyCellClass} min-w-48`}>
                  <p className="font-medium text-stone-900">{item.nome}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{item.motivo}</p>
                </td>
                <td className={configTableBodyCellClass}>
                  <Badge tone={visual.badgeTone} icon={visual.icon}>
                    {visual.label}
                  </Badge>
                </td>
                <CelulaNumerica>
                  {formatInsumoQuantidadeArredondada(item.estoque, item.unidade)}
                </CelulaNumerica>
                <CelulaNumerica>
                  {formatInsumoQuantidadeArredondada(item.consumoDiario, item.unidade)}
                </CelulaNumerica>
                <CelulaNumerica>{formatCoberturaDias(item.coberturaAtualDias)}</CelulaNumerica>
                <CelulaNumerica>{item.leadTimeDias} d</CelulaNumerica>
                <CelulaNumerica className="font-semibold text-stone-900">
                  {formatQuantidadeSugerida(item)}
                </CelulaNumerica>
                <td className={`${configTableBodyCellClass} min-w-40 text-stone-700`}>
                  {item.distribuidorPreferencial ?? 'Sem fornecedor'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cabecalho({ label, numeric = false }: { label: string; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`${configTableHeadCellClass} ${numeric ? 'text-right' : 'text-left'}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </span>
    </th>
  );
}

function CelulaNumerica({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`${configTableBodyCellClass} whitespace-nowrap text-right font-mono tabular-nums text-stone-700 ${className}`}
    >
      {children}
    </td>
  );
}

function formatQuantidadeSugerida(item: InsumoCompraSugestaoLinha): string {
  if (item.quantidadeSugerida == null) return '—';
  return formatInsumoQuantidadeArredondada(item.quantidadeSugerida, item.unidade);
}
