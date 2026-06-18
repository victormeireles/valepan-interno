'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Insumo } from '@/app/actions/insumos-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import InsumoModal from '@/components/Insumos/InsumoModal';
import InsumosConfigMobileList from '@/components/Insumos/InsumosConfigMobileList';
import InsumosConfigTable, { type InsumoSortKey } from '@/components/Insumos/InsumosConfigTable';

type StatusFilter = 'todos' | 'ativos' | 'inativos';

type Props = {
  initialInsumos: Insumo[];
};

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR');
}

function unidadeSortValue(insumo: Insumo) {
  return insumo.unidades?.nome_resumido || insumo.unidades?.nome || '';
}

function sortValue(insumo: Insumo, key: InsumoSortKey) {
  if (key === 'unidade') return unidadeSortValue(insumo);
  return insumo[key];
}

const primaryButtonClassName =
  'min-h-11 inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export default function InsumosConfigClient({ initialInsumos }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [sortKey, setSortKey] = useState<InsumoSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const statusParam = searchParams.get('status');
  const statusFilter: StatusFilter =
    statusParam === 'todos' || statusParam === 'inativos' ? statusParam : 'ativos';

  const setStatusFilter = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ativos') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(query ? `/config/insumos?${query}` : '/config/insumos');
  };

  const unidadesUnicas = useMemo(() => {
    const map = new Map<string, string>();
    for (const insumo of initialInsumos) {
      if (insumo.unidades && !map.has(insumo.unidade_id)) {
        map.set(
          insumo.unidade_id,
          insumo.unidades.nome_resumido || insumo.unidades.nome,
        );
      }
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [initialInsumos]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialInsumos
      .filter((item) => {
        if (statusFilter === 'ativos' && !item.ativo) return false;
        if (statusFilter === 'inativos' && item.ativo) return false;
        if (filterUnidade && item.unidade_id !== filterUnidade) return false;
        if (!term) return true;
        return item.nome.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const cmp = compareValues(sortValue(a, sortKey), sortValue(b, sortKey));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [initialInsumos, searchTerm, filterUnidade, statusFilter, sortKey, sortDir]);

  const handleSort = (key: InsumoSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (item: Insumo) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setToast('Insumo salvo com sucesso');
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'ativos', label: 'Ativos' },
    { value: 'inativos', label: 'Inativos' },
    { value: 'todos', label: 'Todos' },
  ];

  const resultLabel =
    filtered.length === 1 ? '1 insumo' : `${filtered.length} insumos`;

  const hasActiveFilters =
    Boolean(searchTerm) || Boolean(filterUnidade) || statusFilter !== 'ativos';

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Insumos"
        icon="inventory"
        action={
          <button type="button" onClick={openCreate} className={primaryButtonClassName}>
            <span className="material-icons text-base" aria-hidden="true">
              add
            </span>
            Novo insumo
          </button>
        }
      />

      <p className="text-sm text-gray-600 -mt-2">
        Matérias-primas usadas nas receitas, com custo e unidade de medida.
      </p>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {toast}
        </div>
      )}

      <section
        aria-label="Lista de insumos"
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-gray-100 p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="insumo-search" className="sr-only">
                Buscar insumo
              </label>
              <div className="relative">
                <span
                  className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="insumo-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full min-h-11 pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="min-w-[10rem]">
              <label htmlFor="insumo-unidade" className="sr-only">
                Filtrar por unidade
              </label>
              <select
                id="insumo-unidade"
                value={filterUnidade}
                onChange={(e) => setFilterUnidade(e.target.value)}
                className="w-full min-h-11 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Todas as unidades</option>
                {unidadesUnicas.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="min-w-0">
              <legend className="sr-only">Filtrar por status</legend>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                    className={`min-h-11 px-4 rounded-xl text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      statusFilter === value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <p className="text-sm text-gray-500 tabular-nums shrink-0" aria-live="polite">
            {resultLabel}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-3xl text-gray-300" aria-hidden="true">
                inventory
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {hasActiveFilters ? 'Nenhum insumo encontrado' : 'Nenhum insumo cadastrado'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1 text-sm">
              {hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie o primeiro insumo para começar.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterUnidade('');
                  setStatusFilter('ativos');
                }}
                className="mt-4 min-h-11 px-4 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                Limpar filtros
              </button>
            )}
            {!hasActiveFilters && (
              <button type="button" onClick={openCreate} className={`mt-4 ${primaryButtonClassName}`}>
                Criar primeiro insumo
              </button>
            )}
          </div>
        ) : (
          <>
            <InsumosConfigTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRowClick={openEdit}
              embedded
            />
            <InsumosConfigMobileList items={filtered} onRowClick={openEdit} />
          </>
        )}
      </section>

      <InsumoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        insumo={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
