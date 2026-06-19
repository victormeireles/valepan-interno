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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

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

  const hasActiveFilters =
    Boolean(searchTerm) || statusFilter !== 'todas' || Boolean(categoriaFilter);

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Regras de Assadeira"
        icon="rule"
        description="Defina qual assadeira usar por categoria e peso (gramas). Produtos com exceção manual em Produtos prevalecem sobre estas regras."
        action={
          <Button
            icon="add"
            onClick={openCreate}
            disabled={!canCreate}
            className="w-full sm:w-auto"
          >
            Nova regra
          </Button>
        }
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      {!canCreate ? (
        <Toast tone="warning" icon="info">
          Cadastre ao menos uma categoria ativa e uma assadeira ativa antes de criar regras.
        </Toast>
      ) : null}

      <Card padding="none" aria-label="Lista de regras de assadeira" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="min-w-[12rem] flex-1">
              <Input
                id="regra-search"
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar categoria ou assadeira..."
                aria-label="Buscar regra"
              />
            </div>

            <div className="min-w-[10rem]">
              <Select
                id="regra-categoria-filter"
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                aria-label="Filtrar por categoria"
              >
                <option value="">Todas categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
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
            icon="rule"
            title={
              hasActiveFilters ? 'Nenhuma regra encontrada' : 'Nenhuma regra cadastrada'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie a primeira regra para mapear categoria + peso → assadeira.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoriaFilter('');
                    setStatusFilter('todas');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : canCreate ? (
                <Button icon="add" onClick={openCreate}>
                  Criar primeira regra
                </Button>
              ) : undefined
            }
          />
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
      </Card>

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
