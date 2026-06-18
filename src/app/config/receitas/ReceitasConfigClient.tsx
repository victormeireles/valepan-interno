'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import ReceitaModal from '@/components/Receitas/ReceitaModal';
import ReceitasConfigMobileList from '@/components/Receitas/ReceitasConfigMobileList';
import ReceitasConfigTable, { type ReceitaSortKey } from '@/components/Receitas/ReceitasConfigTable';

type StatusFilter = 'todos' | 'ativos' | 'inativos';

type Props = {
  initialReceitas: ReceitaWithRelations[];
};

const tipoOptions: Array<{ value: ReceitaWithRelations['tipo']; label: string }> = [
  { value: 'massa', label: 'Massa' },
  { value: 'brilho', label: 'Brilho' },
  { value: 'confeito', label: 'Confeito' },
  { value: 'antimofo', label: 'Antimofo' },
  { value: 'embalagem', label: 'Embalagem' },
  { value: 'caixa', label: 'Caixa' },
];

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

function isAtiva(receita: ReceitaWithRelations) {
  return receita.ativo !== false;
}

function sortValue(receita: ReceitaWithRelations, key: ReceitaSortKey) {
  if (key === 'ativo') return isAtiva(receita);
  return receita[key];
}

const primaryButtonClassName =
  'min-h-11 inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export default function ReceitasConfigClient({ initialReceitas }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [sortKey, setSortKey] = useState<ReceitaSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReceitaWithRelations | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const statusParam = searchParams.get('status');
  const statusFilter: StatusFilter =
    statusParam === 'todos' || statusParam === 'inativos' ? statusParam : 'ativos';

  const setStatusFilter = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ativos') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(query ? `/config/receitas?${query}` : '/config/receitas');
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialReceitas
      .filter((item) => {
        if (statusFilter === 'ativos' && !isAtiva(item)) return false;
        if (statusFilter === 'inativos' && isAtiva(item)) return false;
        if (filterTipo && item.tipo !== filterTipo) return false;
        if (!term) return true;
        return item.nome.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const cmp = compareValues(sortValue(a, sortKey), sortValue(b, sortKey));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [initialReceitas, searchTerm, filterTipo, statusFilter, sortKey, sortDir]);

  const handleSort = (key: ReceitaSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: ReceitaWithRelations) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setToast('Receita salva com sucesso');
    setModalOpen(false);
    setEditing(null);
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'ativos', label: 'Ativas' },
    { value: 'inativos', label: 'Inativas' },
    { value: 'todos', label: 'Todas' },
  ];

  const resultLabel =
    filtered.length === 1 ? '1 receita' : `${filtered.length} receitas`;

  const hasActiveFilters =
    Boolean(searchTerm) || Boolean(filterTipo) || statusFilter !== 'ativos';

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Receitas"
        icon="menu_book"
        action={
          <button type="button" onClick={openCreate} className={primaryButtonClassName}>
            <span className="material-icons text-base" aria-hidden="true">
              add
            </span>
            Nova receita
          </button>
        }
      />

      <p className="text-sm text-gray-600 -mt-2">
        Cadastro de receitas por tipo (massa, brilho, confeito, etc.) e seus ingredientes.
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
        aria-label="Lista de receitas"
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-gray-100 p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="receita-search" className="sr-only">
                Buscar receita
              </label>
              <div className="relative">
                <span
                  className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="receita-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full min-h-11 pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="min-w-[10rem]">
              <label htmlFor="receita-tipo" className="sr-only">
                Filtrar por tipo
              </label>
              <select
                id="receita-tipo"
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full min-h-11 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Todos os tipos</option>
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                menu_book
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {hasActiveFilters ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1 text-sm">
              {hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie a primeira receita para começar.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterTipo('');
                  setStatusFilter('ativos');
                }}
                className="mt-4 min-h-11 px-4 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                Limpar filtros
              </button>
            )}
            {!hasActiveFilters && (
              <button type="button" onClick={openCreate} className={`mt-4 ${primaryButtonClassName}`}>
                Criar primeira receita
              </button>
            )}
          </div>
        ) : (
          <>
            <ReceitasConfigTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRowClick={openEdit}
              embedded
            />
            <ReceitasConfigMobileList items={filtered} onRowClick={openEdit} />
          </>
        )}
      </section>

      <ReceitaModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        receita={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
