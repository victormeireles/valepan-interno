'use client';

import type { Insumo } from '@/app/actions/insumos-actions';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import InsumoCustoBadge from '@/components/Insumos/InsumoCustoBadge';
import InsumoReceitasButton from '@/components/Insumos/InsumoReceitasButton';
import InsumoVinculosOmieButton from '@/components/Insumos/InsumoVinculosOmieButton';
import { configMobileRowClass } from '@/components/Config/config-table-styles';

type Props = {
  items: Insumo[];
  receitasPorInsumo: Record<string, InsumoReceitaAssociacao[]>;
  vinculosOmiePorInsumo: Record<string, IntegracaoInsumoComEmpresa[]>;
  onRowClick: (item: Insumo) => void;
};

export default function InsumosConfigMobileList({
  items,
  receitasPorInsumo,
  vinculosOmiePorInsumo,
  onRowClick,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`${configMobileRowClass(index)} ${!item.ativo ? 'opacity-60' : ''}`}
        >
          <button
            type="button"
            onClick={() => onRowClick(item)}
            className="flex min-w-0 flex-1 items-center text-left"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-stone-900">{item.nome}</p>
              <p className="mt-1 text-sm text-stone-600">
                {item.unidades?.nome_resumido || item.unidades?.nome || '—'}
              </p>
              <div className="mt-1">
                <InsumoCustoBadge custoUnitario={item.custo_unitario} />
              </div>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <InsumoReceitasButton
              insumoNome={item.nome}
              receitas={receitasPorInsumo[item.id] ?? []}
            />
            <InsumoVinculosOmieButton
              insumoNome={item.nome}
              vinculos={vinculosOmiePorInsumo[item.id] ?? []}
            />
            <ConfigAtivoBadge ativo={item.ativo} />
            <button
              type="button"
              onClick={() => onRowClick(item)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400"
              aria-label={`Editar ${item.nome}`}
            >
              <span className="material-icons" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
