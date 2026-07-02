'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { pageShellPaddingX } from '@/components/ui/page-shell';
import PainelProducaoAreaCard from '@/components/PainelProducao/PainelProducaoAreaCard';
import PainelProducaoHeader from '@/components/PainelProducao/PainelProducaoHeader';
import PainelProducaoProductRow from '@/components/PainelProducao/PainelProducaoProductRow';
import {
  PAINEL_PRODUCAO_STAGES,
  PAINEL_PRODUCAO_STATUS_META,
  PAINEL_PRODUCAO_STATUS_ORDER,
} from '@/domain/painel-producao/painel-producao-constants';
import { statusOfProduct } from '@/domain/painel-producao/painel-producao-status';
import type {
  PainelProducaoData,
  PainelProducaoProduct,
  PainelProducaoStatusFilter,
} from '@/domain/painel-producao/painel-producao-types';
import { parseAgoraMinFromLabel } from '@/components/PainelProducao/painel-producao-format';

type PainelProducaoScreenProps = {
  painel: PainelProducaoData;
  selectedDate: string;
  onDateChange: (date: string) => void;
};

function ColumnHeader() {
  return (
    <div className="hidden min-[860px]:grid min-[860px]:grid-cols-[minmax(210px,1.3fr)_repeat(3,minmax(130px,1fr))_36px] min-[860px]:gap-3 min-[860px]:px-3.5 min-[860px]:pb-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Produto
      </span>
      {PAINEL_PRODUCAO_STAGES.map((stage) => (
        <span
          key={stage.key}
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: stage.accent }}
        >
          <span className="material-icons text-[13px]" aria-hidden="true">
            {stage.icon}
          </span>
          {stage.name}
        </span>
      ))}
      <span />
    </div>
  );
}

export default function PainelProducaoScreen({
  painel,
  selectedDate,
  onDateChange,
}: PainelProducaoScreenProps) {
  const [filter, setFilter] = useState<PainelProducaoStatusFilter>('todos');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const products = painel.products;

  const agoraMin = useMemo(() => parseAgoraMinFromLabel(painel.agora), [painel.agora]);

  const counts = useMemo(() => {
    const base = {
      todos: products.length,
      aguardando: 0,
      fermentando: 0,
      forno: 0,
      embalando: 0,
      concluido: 0,
    };
    for (const product of products) {
      base[statusOfProduct(product)] += 1;
    }
    return base;
  }, [products]);

  const sections = useMemo(() => {
    const matches = (product: PainelProducaoProduct) =>
      filter === 'todos' || statusOfProduct(product) === filter;

    return PAINEL_PRODUCAO_STATUS_ORDER.map((status) => ({
      id: status,
      title: PAINEL_PRODUCAO_STATUS_META[status].label,
      products: products.filter(
        (product) => statusOfProduct(product) === status && matches(product),
      ),
    })).filter((section) => section.products.length > 0);
  }, [filter, products]);

  const toggleProduct = (productId: string) => {
    setExpanded((current) => ({ ...current, [productId]: !current[productId] }));
  };

  const chips: Array<[PainelProducaoStatusFilter, string]> = [
    ['todos', `Todos (${counts.todos})`],
    ['aguardando', `Aguardando (${counts.aguardando})`],
    ['fermentando', `Fermentando (${counts.fermentando})`],
    ['forno', `No forno (${counts.forno})`],
    ['embalando', `Embalando (${counts.embalando})`],
    ['concluido', `Concluídos (${counts.concluido})`],
  ];

  return (
    <div className="min-h-full bg-app">
      <PainelProducaoHeader
        painel={painel}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        concluidos={counts.concluido}
        total={counts.todos}
      />

      <div className={['w-full pb-12 pt-4', pageShellPaddingX].join(' ')}>
        <div className="grid grid-cols-1 gap-3.5 min-[980px]:grid-cols-3">
          {painel.areas.map((area) => (
            <PainelProducaoAreaCard key={area.id} area={area} agoraMin={agoraMin} />
          ))}
        </div>

        <div className="my-5 flex flex-wrap gap-2">
          {chips.map(([key, label]) => (
            <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </Chip>
          ))}
        </div>

        <ColumnHeader />

        {sections.length ? (
          sections.map((section) => (
            <section key={section.id} className="mb-4">
              <div className="mb-2 flex items-center gap-2.5 px-0.5">
                <h3 className="text-base font-bold text-text-strong">{section.title}</h3>
                <span className="font-mono text-xs tabular-nums text-text-muted">
                  {section.products.length}{' '}
                  {section.products.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {section.products.map((product) => (
                  <PainelProducaoProductRow
                    key={product.id}
                    product={product}
                    expanded={Boolean(expanded[product.id])}
                    agoraMin={agoraMin}
                    onToggle={() => toggleProduct(product.id)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <Card padding="lg">
            <p className="my-3 text-center text-text-muted">Nenhum produto neste filtro.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
