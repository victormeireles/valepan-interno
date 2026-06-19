'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Insumo } from '@/app/actions/insumos-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import InsumoModal from '@/components/Insumos/InsumoModal';
import InsumosConfigMobileList from '@/components/Insumos/InsumosConfigMobileList';
import InsumosConfigTable, { type InsumoSortKey } from '@/components/Insumos/InsumosConfigTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

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
        description="Matérias-primas usadas nas receitas, com custo e unidade de medida."
        action={
          <Button icon="add" onClick={openCreate} className="w-full sm:w-auto">
            Novo insumo
          </Button>
        }
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <Card padding="none" aria-label="Lista de insumos" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="min-w-[12rem] flex-1">
              <Input
                id="insumo-search"
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome..."
                aria-label="Buscar insumo"
              />
            </div>

            <div className="min-w-[10rem]">
              <Select
                id="insumo-unidade"
                value={filterUnidade}
                onChange={(e) => setFilterUnidade(e.target.value)}
                aria-label="Filtrar por unidade"
              >
                <option value="">Todas as unidades</option>
                {unidadesUnicas.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </Select>
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
            icon="inventory"
            title={
              hasActiveFilters ? 'Nenhum insumo encontrado' : 'Nenhum insumo cadastrado'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie o primeiro insumo para começar.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterUnidade('');
                    setStatusFilter('ativos');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                <Button icon="add" onClick={openCreate}>
                  Criar primeiro insumo
                </Button>
              )
            }
          />
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
      </Card>

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
