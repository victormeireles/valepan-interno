'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import ReceitaModal from '@/components/Receitas/ReceitaModal';
import ReceitasConfigMobileList from '@/components/Receitas/ReceitasConfigMobileList';
import ReceitasConfigTable, { type ReceitaSortKey } from '@/components/Receitas/ReceitasConfigTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

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

  const handleSaved = (info?: {
    vinculosMassa?: { atualizados: number; ignorados: Array<{ produtoNome: string }> };
    vinculosGramatura?: { atualizados: number; ignorados: Array<{ produtoNome: string }> };
  }) => {
    let message = 'Receita salva com sucesso';
    const massaAtualizados = info?.vinculosMassa?.atualizados ?? 0;
    const gramaturaAtualizados = info?.vinculosGramatura?.atualizados ?? 0;

    if (massaAtualizados > 0) {
      message += `. Quantidade de massa atualizada em ${massaAtualizados} produto${massaAtualizados === 1 ? '' : 's'}.`;
    }
    if (gramaturaAtualizados > 0) {
      message += `. Quantidades atualizadas em ${gramaturaAtualizados} vínculo${gramaturaAtualizados === 1 ? '' : 's'}.`;
    }

    const ignorados =
      (info?.vinculosMassa?.ignorados.length ?? 0) +
      (info?.vinculosGramatura?.ignorados.length ?? 0);
    if (ignorados > 0) {
      message += ` ${ignorados} produto(s) não atualizado(s) (sem gramatura ou sem cadastro).`;
    }

    setToast(message);
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
        description="Cadastro de receitas por tipo (massa, brilho, confeito, etc.) e seus ingredientes."
        action={
          <Button icon="add" onClick={openCreate} className="w-full sm:w-auto">
            Nova receita
          </Button>
        }
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <Card padding="none" aria-label="Lista de receitas" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="min-w-[12rem] flex-1">
              <Input
                id="receita-search"
                type="search"
                icon="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome..."
                aria-label="Buscar receita"
              />
            </div>

            <div className="min-w-[10rem]">
              <Select
                id="receita-tipo"
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos os tipos</option>
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
            icon="menu_book"
            title={
              hasActiveFilters ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada'
            }
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou limpar os filtros.'
                : 'Crie a primeira receita para começar.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterTipo('');
                    setStatusFilter('ativos');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                <Button icon="add" onClick={openCreate}>
                  Criar primeira receita
                </Button>
              )
            }
          />
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
      </Card>

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
