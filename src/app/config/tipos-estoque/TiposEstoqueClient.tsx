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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';

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

  const hasActiveFilters = Boolean(searchTerm) || statusFilter !== 'todas';

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Tipos de estoque"
        icon="warehouse"
        description="Gerencie destinos de estoque e flags de etiqueta (congelado, validade, texto na impressão)."
        action={
          <Button icon="add" onClick={openCreate} className="w-full sm:w-auto">
            Novo tipo
          </Button>
        }
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <Card padding="none" aria-label="Lista de tipos de estoque" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="min-w-[12rem] flex-1">
              <Input
                id="tipo-search"
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome..."
                aria-label="Buscar tipo de estoque"
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
            icon="warehouse"
            title={
              hasActiveFilters ? 'Nenhum tipo encontrado' : 'Nenhum tipo cadastrado'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie o primeiro tipo de estoque para configurar etiquetas.'
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
                  Criar primeiro tipo
                </Button>
              )
            }
          />
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
      </Card>

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
