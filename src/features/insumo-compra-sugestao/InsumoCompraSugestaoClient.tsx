'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import type { InsumoCompraSugestaoStatus } from '@/domain/insumos/insumo-compra-sugestao-types';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoCompraRegraConfig } from '@/lib/services/insumo-compra-regra-manager';
import type {
  InsumoCompraSugestaoLinha,
  InsumoCompraSugestaoPageData,
} from '@/lib/services/insumo-compra-sugestao-service';
import InsumoAjusteModal from '@/features/insumo-estoque/components/InsumoAjusteModal';
import InsumoCompraSugestaoFornecedorGroups from './components/InsumoCompraSugestaoFornecedorGroups';
import InsumoCompraSugestaoMobileList from './components/InsumoCompraSugestaoMobileList';
import InsumoCompraSugestaoResumo from './components/InsumoCompraSugestaoResumo';
import InsumoCompraSugestaoTable from './components/InsumoCompraSugestaoTable';
import InsumoRegraCompraFormModal from './components/InsumoRegraCompraFormModal';

type Props = {
  initialData: InsumoCompraSugestaoPageData;
};

type AtencaoFilter = 'atencao' | 'todos';
type LayoutMode = 'lista' | 'fornecedor';

const ATTENTION_STATUSES = new Set<InsumoCompraSugestaoStatus>([
  'urgente',
  'pedir_fora_janela',
  'pedir_hoje',
  'adiar_lote_minimo',
]);

export default function InsumoCompraSugestaoClient({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dataReferencia, setDataReferencia] = useState(initialData.dataReferencia);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<AtencaoFilter>('atencao');
  const [layout, setLayout] = useState<LayoutMode>('lista');
  const [itens, setItens] = useState(initialData.itens);
  const [toast, setToast] = useState<string | null>(null);
  const [regraTarget, setRegraTarget] = useState<InsumoCompraRegraConfig | null>(null);
  const [ajusteTarget, setAjusteTarget] = useState<InsumoSaldoComDetalhes | null>(null);

  useEffect(() => {
    setItens(initialData.itens);
  }, [initialData.itens]);

  const filteredItems = useMemo(
    () => filterItems(itens, filter, searchTerm),
    [filter, itens, searchTerm],
  );

  const filteredGroups = useMemo(() => {
    const visibleIds = new Set(filteredItems.map((item) => item.insumoId));
    return initialData.gruposPorFornecedor
      .map((group) => ({
        ...group,
        itens: group.itens
          .filter((item) => visibleIds.has(item.insumoId))
          .map((item) => itens.find((linha) => linha.insumoId === item.insumoId) ?? item),
      }))
      .filter((group) => group.itens.length > 0);
  }, [filteredItems, initialData.gruposPorFornecedor, itens]);

  const handleDateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({ dataReferencia });
    startTransition(() => router.replace(`/sugestao-compras?${params.toString()}`));
  };

  const handleCadastrarRegra = (item: InsumoCompraSugestaoLinha) => {
    setRegraTarget(toRegraConfig(item));
  };

  const handleAjustarEstoque = (item: InsumoCompraSugestaoLinha) => {
    setAjusteTarget(toSaldoDetalhes(item));
  };

  const handleRegraSaved = () => {
    setRegraTarget(null);
    setToast('Regra salva.');
    router.refresh();
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleAjusteSaved = (novoSaldo: number) => {
    if (ajusteTarget) {
      setItens((atuais) =>
        atuais.map((linha) =>
          linha.insumoId === ajusteTarget.insumoId
            ? { ...linha, estoque: novoSaldo }
            : linha,
        ),
      );
    }
    setAjusteTarget(null);
    setToast('Saldo ajustado com sucesso');
    router.refresh();
    window.setTimeout(() => setToast(null), 4000);
  };

  const resultLabel =
    filteredItems.length === 1 ? '1 insumo exibido' : `${filteredItems.length} insumos exibidos`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <ConfigPageHeader
        title="Sugestão de compra"
        icon="shopping_cart"
        description="Prioridades de compra calculadas pelo estoque, consumo, lead time e regras de cada insumo."
      />

      <Card>
        <div className="grid gap-4">
          <form
            className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto]"
            onSubmit={handleDateSubmit}
          >
            <Input
              id="sugestao-compra-search"
              type="search"
              label="Buscar insumo ou fornecedor"
              icon="search"
              className="h-11"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Farinha, embalagem, distribuidor..."
            />
            <label
              className="flex flex-col gap-1.5 text-sm font-medium text-stone-700"
              htmlFor="sugestao-compra-data"
            >
              Data de referência
              <DateField
                id="sugestao-compra-data"
                value={dataReferencia}
                widthClass="w-full md:w-44"
                className="h-11"
                onChange={(event) => setDataReferencia(event.target.value)}
                disabled={isPending}
              />
            </label>
            <Button
              type="submit"
              icon={isPending ? 'sync' : 'event'}
              className="h-11 md:self-end"
              disabled={isPending || !dataReferencia}
            >
              {isPending ? 'Carregando...' : 'Atualizar'}
            </Button>
          </form>

          <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Filtrar sugestões">
              <Chip
                active={filter === 'atencao'}
                icon="priority_high"
                className="h-11"
                onClick={() => setFilter('atencao')}
              >
                Precisa atenção
              </Chip>
              <Chip
                active={filter === 'todos'}
                icon="list"
                className="h-11"
                onClick={() => setFilter('todos')}
              >
                Todos
              </Chip>
            </div>
            <div className="flex gap-2" aria-label="Modo de visualização">
              <Chip
                active={layout === 'lista'}
                icon="view_list"
                className="h-11"
                onClick={() => setLayout('lista')}
              >
                Lista
              </Chip>
              <Chip
                active={layout === 'fornecedor'}
                icon="local_shipping"
                className="h-11"
                onClick={() => setLayout('fornecedor')}
              >
                Por fornecedor
              </Chip>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <InsumoCompraSugestaoResumo resumo={initialData.resumo} />
        <p className="font-mono text-xs tabular-nums text-stone-500" aria-live="polite">
          {resultLabel}
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="shopping_cart"
            title={searchTerm ? 'Nenhum insumo encontrado' : 'Nenhuma compra sugerida hoje.'}
            description={
              searchTerm
                ? 'Ajuste a busca ou consulte todos os insumos.'
                : 'Os insumos que exigirem ação aparecerão nesta lista.'
            }
            action={
              <Button
                variant="secondary"
                icon="visibility"
                className="h-11"
                onClick={() => {
                  setSearchTerm('');
                  setFilter('todos');
                }}
              >
                Ver todos
              </Button>
            }
          />
        </Card>
      ) : layout === 'fornecedor' ? (
        <InsumoCompraSugestaoFornecedorGroups
          grupos={filteredGroups}
          onCadastrarRegra={handleCadastrarRegra}
          onAjustarEstoque={handleAjustarEstoque}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <InsumoCompraSugestaoTable
            items={filteredItems}
            onCadastrarRegra={handleCadastrarRegra}
            onAjustarEstoque={handleAjustarEstoque}
          />
          <InsumoCompraSugestaoMobileList
            items={filteredItems}
            onCadastrarRegra={handleCadastrarRegra}
            onAjustarEstoque={handleAjustarEstoque}
          />
        </Card>
      )}

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <InsumoRegraCompraFormModal
        open={Boolean(regraTarget)}
        regra={regraTarget}
        onClose={() => setRegraTarget(null)}
        onSaved={handleRegraSaved}
      />

      <InsumoAjusteModal
        isOpen={Boolean(ajusteTarget)}
        item={ajusteTarget}
        onClose={() => setAjusteTarget(null)}
        onSaved={handleAjusteSaved}
      />
    </div>
  );
}

function filterItems(
  items: InsumoCompraSugestaoLinha[],
  filter: AtencaoFilter,
  searchTerm: string,
): InsumoCompraSugestaoLinha[] {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase('pt-BR');
  return items.filter((item) => {
    const matchesAttention = filter === 'todos' || ATTENTION_STATUSES.has(item.status);
    const searchableValues = [
      item.nome,
      item.distribuidorPreferencial ?? '',
      ...item.distribuidoresAlternativos,
    ];
    const matchesSearch =
      !normalizedTerm ||
      searchableValues.some((value) =>
        value.toLocaleLowerCase('pt-BR').includes(normalizedTerm),
      );
    return matchesAttention && matchesSearch;
  });
}

function toRegraConfig(item: InsumoCompraSugestaoLinha): InsumoCompraRegraConfig {
  return {
    insumoId: item.insumoId,
    nome: item.nome,
    unidade: item.unidade,
    conversao: item.conversao,
    regra: null,
    distribuidores: [],
  };
}

function toSaldoDetalhes(item: InsumoCompraSugestaoLinha): InsumoSaldoComDetalhes {
  return {
    insumoId: item.insumoId,
    nome: item.nome,
    unidadeResumida: item.unidade,
    quantidade: item.estoque,
    custoUnitario: 0,
    ultimaEntradaEm: null,
    conversao: item.conversao,
  };
}
