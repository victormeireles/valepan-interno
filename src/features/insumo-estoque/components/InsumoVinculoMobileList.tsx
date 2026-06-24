'use client';

import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import { Button } from '@/components/ui/Button';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import { formatUnidadeLabel } from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Props = {
  items: IntegracaoInsumoListItem[];
  onEditar: (item: IntegracaoInsumoListItem) => void;
  onExcluir: (item: IntegracaoInsumoListItem) => void;
};

function formatFator(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export default function InsumoVinculoMobileList({ items, onEditar, onExcluir }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((item, index) => {
        const unidadeLabel = formatUnidadeLabel(
          item.insumoUnidadeCodigo,
          item.insumoUnidadeNome,
        );

        return (
          <div key={item.id} className={`${configMobileRowClass(index)} flex-col items-stretch`}>
            <p className="font-mono text-xs text-stone-500">
              {item.omie_codigo_produto || item.omie_id_produto}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-stone-900">
              {item.descricao_omie || '—'}
            </p>
            <p className="mt-1 text-xs text-stone-500">{item.empresaNome}</p>
            <div className="mt-2 text-sm text-stone-800">
              <span className="font-medium">{item.insumoNome || '—'}</span>
              {unidadeLabel ? (
                <span className="ml-2 font-mono text-xs text-stone-500">{unidadeLabel}</span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-sm tabular-nums text-stone-700">
              Fator {formatFator(Number(item.fator_conversao))}
            </p>

            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => onEditar(item)}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => onExcluir(item)}>
                Excluir
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
