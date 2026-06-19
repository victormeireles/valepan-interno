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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';

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

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return initialAssadeiras
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

  const resultLabel =
    filtered.length === 1 ? '1 tipo' : `${filtered.length} tipos`;

  const hasActiveFilters = Boolean(searchTerm) || statusFilter !== 'todas';

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Gestão de Assadeiras"
        icon="bakery_dining"
        action={
          <Button icon="add" onClick={openCreate} className="w-full sm:w-auto">
            Nova assadeira
          </Button>
        }
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <Card padding="none" aria-label="Lista de assadeiras" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                id="assadeira-search"
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome..."
                aria-label="Buscar assadeira por nome"
              />
            </div>

            <fieldset className="min-w-0">
              <legend className="sr-only">Filtrar por status</legend>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(({ value, label }) => (
                  <Chip
                    key={value}
                    active={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>

          <p
            className="shrink-0 text-sm text-stone-500 font-mono tabular-nums"
            aria-live="polite"
          >
            {resultLabel}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="bakery_dining"
            title={
              hasActiveFilters
                ? 'Nenhuma assadeira encontrada'
                : 'Nenhuma assadeira cadastrada'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie a primeira assadeira para começar.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('todas');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                <Button icon="add" onClick={openCreate}>
                  Criar primeira assadeira
                </Button>
              )
            }
          />
        ) : (
          <>
            <AssadeirasTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRowClick={openEdit}
              embedded
            />
            <AssadeirasMobileList items={filtered} onRowClick={openEdit} />
          </>
        )}
      </Card>

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
