'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import type {
  CategoriaAssadeiraRegra,
  CategoriaOption,
} from '@/app/actions/categoria-assadeira-regras-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import RegraAssadeiraModal from '@/components/RegrasAssadeiras/RegraAssadeiraModal';
import RegrasAssadeirasMobileList from '@/components/RegrasAssadeiras/RegrasAssadeirasMobileList';
import RegrasAssadeirasTable, {
  type RegraSortKey,
} from '@/components/RegrasAssadeiras/RegrasAssadeirasTable';

type StatusFilter = 'todas' | 'ativas' | 'inativas';

type Props = {
  initialRegras: CategoriaAssadeiraRegra[];
  categorias: CategoriaOption[];
  assadeirasAtivas: Assadeira[];
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

export default function RegrasAssadeirasClient({
  initialRegras,
  categorias,
  assadeirasAtivas,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [sortKey, setSortKey] = useState<RegraSortKey>('categoria_nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoriaAssadeiraRegra | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'todas';

  const setStatusFilter = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'todas') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(
      query ? `/config/regras-assadeiras?${query}` : '/config/regras-assadeiras',
    );
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialRegras
      .filter((item) => {
        if (statusFilter === 'ativas' && !item.ativo) return false;
        if (statusFilter === 'inativas' && item.ativo) return false;
        if (categoriaFilter && item.categoria_id !== categoriaFilter) return false;
        if (!term) return true;
        return (
          item.categoria_nome.toLowerCase().includes(term) ||
          item.assadeira_nome.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = compareValues(av, bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [initialRegras, searchTerm, statusFilter, categoriaFilter, sortKey, sortDir]);

  const handleSort = (key: RegraSortKey) => {
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

  const openEdit = (item: CategoriaAssadeiraRegra) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setToast('Regra salva com sucesso');
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
  ];

  const resultLabel = filtered.length === 1 ? '1 regra' : `${filtered.length} regras`;

  const canCreate = categorias.length > 0 && assadeirasAtivas.length > 0;

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Regras de Assadeira"
        icon="rule"
        action={
          <button
            type="button"
            onClick={openCreate}
            disabled={!canCreate}
            className={`${primaryButtonClassName} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="material-icons text-base" aria-hidden="true">
              add
            </span>
            Nova regra
          </button>
        }
      />

      <p className="text-sm text-gray-600 -mt-2">
        Defina qual assadeira usar por categoria e peso (gramas). Produtos com exceção manual
        em Produtos prevalecem sobre estas regras.
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

      {!canCreate && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Cadastre ao menos uma categoria ativa e uma assadeira ativa antes de criar regras.
        </div>
      )}

      <section
        aria-label="Lista de regras de assadeira"
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-gray-100 p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor="regra-search" className="sr-only">
                Buscar regra
              </label>
              <div className="relative">
                <span
                  className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="regra-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar categoria ou assadeira..."
                  className="w-full min-h-11 pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="min-w-[10rem]">
              <label htmlFor="regra-categoria-filter" className="sr-only">
                Filtrar por categoria
              </label>
              <select
                id="regra-categoria-filter"
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full min-h-11 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Todas categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
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
                rule
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchTerm || statusFilter !== 'todas' || categoriaFilter
                ? 'Nenhuma regra encontrada'
                : 'Nenhuma regra cadastrada'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1 text-sm">
              {searchTerm || statusFilter !== 'todas' || categoriaFilter
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie a primeira regra para mapear categoria + peso → assadeira.'}
            </p>
            {(searchTerm || statusFilter !== 'todas' || categoriaFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoriaFilter('');
                  setStatusFilter('todas');
                }}
                className="mt-4 min-h-11 px-4 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                Limpar filtros
              </button>
            )}
            {!searchTerm && statusFilter === 'todas' && !categoriaFilter && canCreate && (
              <button type="button" onClick={openCreate} className={`mt-4 ${primaryButtonClassName}`}>
                Criar primeira regra
              </button>
            )}
          </div>
        ) : (
          <>
            <RegrasAssadeirasTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRowClick={openEdit}
              embedded
            />
            <RegrasAssadeirasMobileList items={filtered} onRowClick={openEdit} />
          </>
        )}
      </section>

      <RegraAssadeiraModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        regra={editing}
        categorias={categorias}
        assadeirasAtivas={assadeirasAtivas}
        onSaved={handleSaved}
      />
    </div>
  );
}
