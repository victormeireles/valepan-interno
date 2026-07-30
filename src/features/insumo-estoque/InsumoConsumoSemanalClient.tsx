'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InsumoConsumoSemanalPageData } from '@/app/actions/insumo-consumo-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { InsumoConsumoVisualizacao } from '@/domain/insumos/insumo-consumo-semanal-periodo';
import CoberturaLegend from '@/features/insumo-estoque/components/CoberturaLegend';
import InsumoConsumoSemanalMobileList from '@/features/insumo-estoque/components/InsumoConsumoSemanalMobileList';
import InsumoConsumoSemanalTable from '@/features/insumo-estoque/components/InsumoConsumoSemanalTable';

type Props = {
  initialData: InsumoConsumoSemanalPageData;
};

export default function InsumoConsumoSemanalClient({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [dataInicio, setDataInicio] = useState(initialData.periodo.dataInicio);
  const [dataFim, setDataFim] = useState(initialData.periodo.dataFim);
  const [visualizacao, setVisualizacao] = useState<InsumoConsumoVisualizacao>(
    initialData.periodo.visualizacao,
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setDataInicio(initialData.periodo.dataInicio);
    setDataFim(initialData.periodo.dataFim);
    setVisualizacao(initialData.periodo.visualizacao);
    setIsNavigating(false);
  }, [
    initialData.periodo.dataInicio,
    initialData.periodo.dataFim,
    initialData.periodo.visualizacao,
  ]);

  const isLoading = isPending || isNavigating;

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return initialData.items;
    return initialData.items.filter((item) => item.nome.toLowerCase().includes(term));
  }, [initialData.items, searchTerm]);

  const resultLabel =
    filteredItems.length === 1 ? '1 insumo com saída' : `${filteredItems.length} insumos com saída`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    params.set('visualizacao', visualizacao);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);
    navigateTo(`/consumo-insumos?${params.toString()}`);
  };

  const handleVisualizacaoChange = (value: InsumoConsumoVisualizacao) => {
    setVisualizacao(value);
    navigateTo(`/consumo-insumos?visualizacao=${value}`);
  };

  const navigateTo = (href: string) => {
    setIsNavigating(true);
    startTransition(() => {
      router.replace(href);
    });
  };

  const helperText =
    visualizacao === 'diaria'
      ? 'Colunas por dia. Padrão diário: D-7 até D-1.'
      : '4 semanas fechadas (domingo a sábado).';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <ConfigPageHeader
        title="Consumo de insumos"
        icon="query_stats"
        description="Consumo por semana ou dia e cobertura de estoque com base nas saídas de produção vinculadas a lotes."
      />

      <Card>
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <Input
              id="insumo-consumo-search"
              type="search"
              label="Buscar insumo"
              icon="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Farinha, sal, embalagem..."
              disabled={isLoading}
            />
            <Select
              id="insumo-consumo-visualizacao"
              label="Visão"
              value={visualizacao}
              onChange={(event) =>
                handleVisualizacaoChange(event.target.value as InsumoConsumoVisualizacao)
              }
              options={[
                { value: 'semanal', label: 'Semanal' },
                { value: 'diaria', label: 'Diária' },
              ]}
              disabled={isLoading}
            />
            <DateInput
              id="insumo-consumo-data-inicio"
              label="Data inicial"
              value={dataInicio}
              onChange={setDataInicio}
              disabled={isLoading}
            />
            <DateInput
              id="insumo-consumo-data-fim"
              label="Data final"
              value={dataFim}
              onChange={setDataFim}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:items-end">
            <Button type="submit" icon={isLoading ? 'sync' : 'filter_alt'} className="h-11" disabled={isLoading}>
              {isLoading ? 'Aplicando...' : 'Aplicar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon="restart_alt"
              className="h-11"
              disabled={isLoading}
              onClick={() => navigateTo(`/consumo-insumos?visualizacao=${visualizacao}`)}
            >
              Padrão
            </Button>
          </div>
        </form>
      </Card>

      {isLoading ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span className="material-icons animate-spin text-base" aria-hidden="true">
            sync
          </span>
          Carregando visão de consumo...
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-sm tabular-nums text-stone-500" aria-live="polite">
            {resultLabel}
          </p>
          <p className="text-sm text-stone-500">
            {helperText} Valores arredondados, sem ajustes manuais ou movimentos sem lote.
            Unidade só no estoque.
          </p>
        </div>
        <CoberturaLegend />
      </div>

      <Card
        padding="none"
        aria-label="Consumo semanal de insumos"
        className={`overflow-hidden transition-opacity duration-150 ${
          isLoading ? 'opacity-55' : 'opacity-100'
        }`}
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="grain"
            title={searchTerm ? 'Nenhum insumo encontrado' : 'Nenhum consumo no período'}
            description={
              searchTerm
                ? 'Tente ajustar a busca.'
                : 'Saídas de produção vinculadas a lotes aparecerão aqui quando existirem no período.'
            }
            action={
              searchTerm ? (
                <Button variant="ghost" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <InsumoConsumoSemanalTable
              items={filteredItems}
              periodo={initialData.periodo}
              colunas={initialData.periodo.colunas}
            />
            <InsumoConsumoSemanalMobileList
              items={filteredItems}
              periodo={initialData.periodo}
              colunas={initialData.periodo.colunas}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function DateInput({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700" htmlFor={id}>
      {label}
      <DateField
        id={id}
        value={value}
        widthClass="w-full"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
