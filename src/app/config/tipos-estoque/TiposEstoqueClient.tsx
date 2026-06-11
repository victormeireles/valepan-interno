'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TipoEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import TipoEstoqueModal from '@/components/TiposEstoque/TipoEstoqueModal';
import TiposEstoqueMobileList from '@/components/TiposEstoque/TiposEstoqueMobileList';
import TiposEstoqueTable, {
  type TipoEstoqueSortKey,
} from '@/components/TiposEstoque/TiposEstoqueTable';

type StatusFilter = 'todas' | 'ativas' | 'inativas';

type Props = {
  initialTipos: TipoEstoqueAdmin[];
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

const primaryButtonClassName =
  'min-h-11 inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export default function TiposEstoqueClient({ initialTipos }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<TipoEstoqueSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipoEstoqueAdmin | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'todas';

  const setStatusFilter = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'todas') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(
      query ? `/config/tipos-estoque?${query}` : '/config/tipos-estoque',
    );
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialTipos
      .filter((item) => {
        if (statusFilter === 'ativas' && !item.ativo) return false;
        if (statusFilter === 'inativas' && item.ativo) return false;
        if (!term) return true;
        return item.nome.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = compareValues(av, bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [initialTipos, searchTerm, statusFilter, sortKey, sortDir]);

  const handleSort = (key: TipoEstoqueSortKey) => {
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

  const openEdit = (item: TipoEstoqueAdmin) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setToast('Tipo de estoque salvo com sucesso');
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
  ];

  const resultLabel =
    filtered.length === 1 ? '1 tipo de estoque' : `${filtered.length} tipos de estoque`;

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Tipos de estoque"
        icon="warehouse"
        action={
          <button type="button" onClick={openCreate} className={primaryButtonClassName}>
            <span className="material-icons text-base" aria-hidden="true">
              add
            </span>
            Novo tipo
          </button>
        }
      />

      <p className="text-sm text-gray-600 -mt-2">
        Gerencie destinos de estoque e flags de etiqueta (congelado, validade, texto na
        impressão).
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
        aria-label="Lista de tipos de estoque"
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-gray-100 p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="tipo-search" className="sr-only">
                Buscar tipo de estoque
              </label>
              <div className="relative">
                <span
                  className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="tipo-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full min-h-11 pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
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
                warehouse
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchTerm || statusFilter !== 'todas'
                ? 'Nenhum tipo encontrado'
                : 'Nenhum tipo cadastrado'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1 text-sm">
              {searchTerm || statusFilter !== 'todas'
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie o primeiro tipo de estoque para configurar etiquetas.'}
            </p>
            {(searchTerm || statusFilter !== 'todas') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todas');
                }}
                className="mt-4 min-h-11 px-4 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                Limpar filtros
              </button>
            )}
            {!searchTerm && statusFilter === 'todas' && (
              <button type="button" onClick={openCreate} className={`mt-4 ${primaryButtonClassName}`}>
                Criar primeiro tipo
              </button>
            )}
          </div>
        ) : (
          <>
            <TiposEstoqueTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRowClick={openEdit}
              embedded
            />
            <TiposEstoqueMobileList items={filtered} onRowClick={openEdit} />
          </>
        )}
      </section>

      <TipoEstoqueModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        tipo={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
