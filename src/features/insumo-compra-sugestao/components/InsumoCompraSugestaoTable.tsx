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
import InsumoCompraConsumoDiaHint from './InsumoCompraConsumoDiaHint';
import InsumoCompraSugestaoEstoqueButton from './InsumoCompraSugestaoEstoqueButton';
import InsumoCompraSugestaoRegraTrigger from './InsumoCompraSugestaoRegraTrigger';

type Props = {
  items: InsumoCompraSugestaoLinha[];
  embedded?: boolean;
  onCadastrarRegra: (item: InsumoCompraSugestaoLinha) => void;
  onAjustarEstoque: (item: InsumoCompraSugestaoLinha) => void;
};

export default function InsumoCompraSugestaoTable({
  items,
  embedded = false,
  onCadastrarRegra,
  onAjustarEstoque,
}: Props) {
  return (
    <div className={embedded ? 'hidden overflow-x-auto md:block' : 'hidden md:block'}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <Cabecalho label="Insumo" />
            <Cabecalho label="Status" />
            <Cabecalho label="Estoque" numeric />
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <InsumoCompraConsumoDiaHint align="end" />
            </th>
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
                  <InsumoCompraSugestaoRegraTrigger
                    item={item}
                    onCadastrarRegra={onCadastrarRegra}
                  >
                    <p
                      className={`font-medium ${
                        item.status === 'sem_regra' ? 'text-amber-900' : 'text-stone-900'
                      }`}
                    >
                      {item.nome}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">{item.motivo}</p>
                  </InsumoCompraSugestaoRegraTrigger>
                </td>
                <td className={configTableBodyCellClass}>
                  <StatusBadge
                    item={item}
                    onCadastrarRegra={onCadastrarRegra}
                    label={visual.label}
                    icon={visual.icon}
                    badgeTone={visual.badgeTone}
                  />
                </td>
                <CelulaNumerica>
                  <InsumoCompraSugestaoEstoqueButton
                    item={item}
                    onAjustar={onAjustarEstoque}
                  />
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
                  <p>{item.distribuidorPreferencial ?? 'Sem fornecedor'}</p>
                  {item.distribuidoresAlternativos.length > 0 ? (
                    <p className="mt-0.5 text-xs text-stone-500">
                      Alternativos: {item.distribuidoresAlternativos.join(', ')}
                    </p>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({
  item,
  onCadastrarRegra,
  label,
  icon,
  badgeTone,
}: {
  item: InsumoCompraSugestaoLinha;
  onCadastrarRegra: (item: InsumoCompraSugestaoLinha) => void;
  label: string;
  icon: string;
  badgeTone: ReturnType<typeof insumoCompraSugestaoStatusTone.resolve>['badgeTone'];
}) {
  const badge = (
    <Badge tone={badgeTone} icon={icon}>
      {label}
    </Badge>
  );

  if (item.status !== 'sem_regra') return badge;

  return (
    <button
      type="button"
      onClick={() => onCadastrarRegra(item)}
      aria-label={`Cadastrar regra de ${item.nome}`}
      className="inline-flex min-h-11 items-center rounded-xl transition-colors duration-150 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      {badge}
    </button>
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
