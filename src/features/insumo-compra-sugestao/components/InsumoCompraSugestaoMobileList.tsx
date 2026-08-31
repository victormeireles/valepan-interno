import { Badge } from '@/components/ui/Badge';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';
import {
  formatCoberturaDias,
} from '@/features/insumo-estoque/utils/formatters';
import { formatInsumoQuantidadeOperacional } from '@/features/insumo-estoque/utils/format-insumo-quantidade-operacional';
import { insumoCompraSugestaoStatusTone } from '../insumo-compra-sugestao-status-tone';
import InsumoCompraConsumoDiaHint from './InsumoCompraConsumoDiaHint';
import InsumoCompraSugestaoEstoqueButton from './InsumoCompraSugestaoEstoqueButton';
import InsumoCompraSugestaoPipelineSelo from './InsumoCompraSugestaoPipelineSelo';
import InsumoCompraSugestaoRegistrarPedidoButton from './InsumoCompraSugestaoRegistrarPedidoButton';
import InsumoCompraSugestaoRegraTrigger from './InsumoCompraSugestaoRegraTrigger';

type Props = {
  items: InsumoCompraSugestaoLinha[];
  embedded?: boolean;
  onCadastrarRegra: (item: InsumoCompraSugestaoLinha) => void;
  onAjustarEstoque: (item: InsumoCompraSugestaoLinha) => void;
  onRegistrarPedido: (item: InsumoCompraSugestaoLinha) => void;
  onPipelineClick: (item: InsumoCompraSugestaoLinha) => void;
};

export default function InsumoCompraSugestaoMobileList({
  items,
  embedded = false,
  onCadastrarRegra,
  onAjustarEstoque,
  onRegistrarPedido,
  onPipelineClick,
}: Props) {
  return (
    <div
      className={
        embedded ? 'divide-y divide-stone-100 md:hidden' : 'divide-y divide-stone-100 md:hidden'
      }
    >
      {items.map((item) => {
        const visual = insumoCompraSugestaoStatusTone.resolve(item.status);
        return (
          <article key={item.insumoId} className={`p-4 ${visual.rowClassName}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <InsumoCompraSugestaoRegraTrigger
                  item={item}
                  onCadastrarRegra={onCadastrarRegra}
                  className="min-w-0 flex-1"
                >
                  <h2
                    className={`font-semibold ${
                      item.status === 'sem_regra' ? 'text-amber-900' : 'text-stone-900'
                    }`}
                  >
                    {item.nome}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">{item.motivo}</p>
                </InsumoCompraSugestaoRegraTrigger>
                <InsumoCompraSugestaoPipelineSelo
                  item={item}
                  onClick={onPipelineClick}
                />
              </div>
              <StatusBadge
                item={item}
                onCadastrarRegra={onCadastrarRegra}
                label={visual.label}
                icon={visual.icon}
                badgeTone={visual.badgeTone}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <Metrica
                label="Sugestão"
                value={
                  item.quantidadeSugerida == null
                    ? '—'
                    : formatInsumoQuantidadeOperacional(
                        item.quantidadeSugerida,
                        item.unidade,
                        item.conversao,
                        { arredondado: true },
                      )
                }
                strong
              />
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Estoque
                </dt>
                <dd className="mt-0.5">
                  <InsumoCompraSugestaoEstoqueButton
                    item={item}
                    onAjustar={onAjustarEstoque}
                    className="justify-start px-0"
                  />
                </dd>
              </div>
              <div>
                <dt>
                  <InsumoCompraConsumoDiaHint />
                </dt>
                <dd className="mt-0.5 font-mono text-sm tabular-nums text-stone-700">
                  {formatInsumoQuantidadeOperacional(
                    item.consumoDiario,
                    item.unidade,
                    item.conversao,
                    { arredondado: true },
                  )}
                </dd>
              </div>
              <Metrica label="Cobertura" value={formatCoberturaDias(item.coberturaAtualDias)} />
              <Metrica label="Lead time" value={`${item.leadTimeDias} d`} />
            </dl>

            <div className="mt-4 flex items-start gap-2 border-t border-stone-200/80 pt-3 text-sm text-stone-600">
              <span className="material-icons text-lg text-stone-400" aria-hidden="true">
                local_shipping
              </span>
              <div className="min-w-0 flex-1">
                <p>{item.distribuidorPreferencial ?? 'Sem fornecedor'}</p>
                {item.distribuidoresAlternativos.length > 0 ? (
                  <p className="mt-0.5 text-xs text-stone-500">
                    Alternativos: {item.distribuidoresAlternativos.join(', ')}
                  </p>
                ) : null}
              </div>
              <InsumoCompraSugestaoRegistrarPedidoButton
                item={item}
                onClick={onRegistrarPedido}
              />
            </div>
          </article>
        );
      })}
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
    <Badge tone={badgeTone} icon={icon} className="shrink-0">
      {label}
    </Badge>
  );

  if (item.status !== 'sem_regra') return badge;

  return (
    <button
      type="button"
      onClick={() => onCadastrarRegra(item)}
      aria-label={`Cadastrar regra de ${item.nome}`}
      className="inline-flex min-h-11 shrink-0 items-center rounded-xl transition-colors duration-150 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      {badge}
    </button>
  );
}

function Metrica({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-sm tabular-nums ${
          strong ? 'font-semibold text-stone-900' : 'text-stone-700'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
