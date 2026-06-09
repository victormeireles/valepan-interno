'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import AssadeiraModal from '@/components/Assadeiras/AssadeiraModal';
import AssadeirasMobileList from '@/components/Assadeiras/AssadeirasMobileList';
import AssadeirasTable, {
  type AssadeiraSortKey,
} from '@/components/Assadeiras/AssadeirasTable';
import type { Assadeira } from '@/app/actions/assadeiras-actions';

type StatusFilter = 'todas' | 'ativas' | 'inativas';

type Props = {
  initialAssadeiras: Assadeira[];
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

export default function AssadeirasClient({ initialAssadeiras }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<AssadeiraSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assadeira | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const statusFilter = (searchParams.get('status') as StatusFilter) || 'todas';

  const setStatusFilter = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'todas') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(query ? `/config/assadeiras?${query}` : '/config/assadeiras');
  };

  const stats = useMemo(() => {
    const ativas = initialAssadeiras.filter((a) => a.ativo);
    const paesValues = initialAssadeiras
      .map((a) => a.unidades_por_assadeira)
      .filter((v): v is number => v != null && v > 0);
    const mediaPaes =
      paesValues.length > 0
        ? Math.round(paesValues.reduce((s, v) => s + v, 0) / paesValues.length)
        : 0;
    return {
      total: initialAssadeiras.length,
      ativas: ativas.length,
      mediaPaes,
      estoqueTotal: initialAssadeiras.reduce((s, a) => s + a.quantidade, 0),
    };
  }, [initialAssadeiras]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialAssadeiras
      .filter((item) => {
        if (statusFilter === 'ativas' && !item.ativo) return false;
        if (statusFilter === 'inativas' && item.ativo) return false;
        if (!term) return true;
        return (
          item.nome.toLowerCase().includes(term) ||
          (item.codigo?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = compareValues(av, bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [initialAssadeiras, searchTerm, statusFilter, sortKey, sortDir]);

  const handleSort = (key: AssadeiraSortKey) => {
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

  const openEdit = (item: Assadeira) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setToast('Assadeira salva com sucesso');
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
  ];

  return (
    <div className="space-y-6">
      <ConfigPageHeader
        title="Gestão de Assadeiras"
        description="Tipos de assadeira, pães por assadeira e quantidade em estoque."
        icon="bakery_dining"
      />

      {toast && (
          <p role="status" aria-live="polite" className="text-sm text-emerald-600 font-medium">
            {toast}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Ativas', value: stats.ativas, accent: 'text-emerald-600' },
            { label: 'Média pães/assadeira', value: stats.mediaPaes },
            { label: 'Estoque total', value: stats.estoqueTotal },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100"
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {label}
              </p>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${accent ?? 'text-gray-900'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="assadeira-search" className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar
              </label>
              <input
                id="assadeira-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome ou código..."
                className="w-full min-h-11 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <p className="block text-sm font-semibold text-gray-700 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`min-h-11 px-4 rounded-xl text-sm font-medium border transition-colors ${
                      statusFilter === value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-semibold shadow-lg hover:bg-gray-800 transition-all"
          >
            <span className="material-icons text-base">add</span>
            Nova assadeira
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-3xl text-gray-300">bakery_dining</span>
            </div>
            <h2 className="text-lg font-medium text-gray-900">
              {searchTerm || statusFilter !== 'todas'
                ? 'Nenhuma assadeira encontrada'
                : 'Nenhuma assadeira cadastrada'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1">
              {searchTerm || statusFilter !== 'todas'
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie a primeira assadeira para começar.'}
            </p>
            {(searchTerm || statusFilter !== 'todas') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todas');
                }}
                className="mt-4 min-h-11 px-4 text-sm font-medium text-blue-600 hover:underline"
              >
                Limpar filtros
              </button>
            )}
            {!searchTerm && statusFilter === 'todas' && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 min-h-11 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold"
              >
                Criar primeira assadeira
              </button>
            )}
          </div>
        ) : (
          <>
            <AssadeirasTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onEdit={openEdit}
              onRowClick={openEdit}
            />
            <AssadeirasMobileList
              items={filtered}
              onEdit={openEdit}
              onRowClick={openEdit}
            />
          </>
        )}

      <AssadeiraModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        assadeira={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
