'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EtiquetaFilaItem, EtiquetaFilaResponse } from '@/domain/etiquetas/etiqueta-fila-types';
import EtiquetaFilaSkeleton from '@/components/Etiquetas/EtiquetaFilaSkeleton';
import EtiquetaGerarModal, {
  type EtiquetaGerarInitialValues,
  type EtiquetaGerarModalMode,
} from '@/components/Etiquetas/EtiquetaGerarModal';
import EtiquetaPedidoCard from '@/components/Etiquetas/EtiquetaPedidoCard';
import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type TabId = 'pendentes' | 'gerados';

const primaryButtonClass =
  'min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const chipBaseClass =
  'min-h-11 px-4 rounded-full text-sm font-medium border focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

function chipClass(active: boolean): string {
  return active
    ? `${chipBaseClass} border-gray-900 bg-gray-900 text-white`
    : `${chipBaseClass} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
}

function tabClass(active: boolean): string {
  const base = 'min-h-11 px-4 rounded-lg font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  return active
    ? `${base} bg-white text-gray-900 shadow-sm border border-gray-200`
    : `${base} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
}

export default function EtiquetasPageClient() {
  const today = getTodayISOInBrazilTimezone();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<TabId>('pendentes');
  const [fila, setFila] = useState<EtiquetaFilaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<EtiquetaGerarModalMode>('fila');
  const [modalInitial, setModalInitial] = useState<EtiquetaGerarInitialValues | undefined>();

  const fetchFila = useCallback(async (selectedDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/etiquetas/fila?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao carregar fila');
      }
      setFila(data as EtiquetaFilaResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fila');
      setFila(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFila(date);
  }, [date, fetchFila]);

  const openModalForItem = (item: EtiquetaFilaItem, mode: 'fila' | 'reimprimir') => {
    setModalMode(mode);
    setModalInitial({
      produtoId: item.produtoId,
      produtoNome: item.produto,
      tipoEstoqueId: item.tipoEstoqueId,
      tipoEstoqueNome: item.tipoEstoque,
      dataFabricacao: item.dataFabricacao,
      ...(item.origem === 'pedido' ? { ordemProducaoId: item.pedidoEmbalagemId } : {}),
    });
    setModalOpen(true);
  };

  const getItemKey = (item: EtiquetaFilaItem) =>
    item.origem === 'manual' ? `manual-${item.etiquetaGeradaId}` : item.pedidoEmbalagemId;

  const openManualModal = () => {
    setModalMode('manual');
    setModalInitial(undefined);
    setModalOpen(true);
  };

  const items = tab === 'pendentes' ? (fila?.pendentes ?? []) : (fila?.gerados ?? []);
  const pendentesCount = fila?.pendentes.length ?? 0;
  const geradosCount = fila?.gerados.length ?? 0;
  const isToday = date === today;
  const isYesterday = date === addCalendarDaysISO(today, -1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
            <button type="button" onClick={openManualModal} className={primaryButtonClass}>
              <span className="material-icons text-base" aria-hidden>
                add
              </span>
              Gerar etiqueta manual
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-11 rounded-lg border border-gray-300 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Data da fila"
            />
            <button
              type="button"
              onClick={() => setDate(today)}
              className={chipClass(isToday)}
              aria-pressed={isToday}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setDate(addCalendarDaysISO(today, -1))}
              className={chipClass(isYesterday)}
              aria-pressed={isYesterday}
            >
              Ontem
            </button>
          </div>

          <div role="tablist" aria-label="Fila de etiquetas" className="flex flex-wrap gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'pendentes'}
              onClick={() => setTab('pendentes')}
              className={tabClass(tab === 'pendentes')}
            >
              Pendentes ({pendentesCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'gerados'}
              onClick={() => setTab('gerados')}
              className={tabClass(tab === 'gerados')}
            >
              Já gerados ({geradosCount})
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
          >
            {error}
          </div>
        )}

        {loading ? (
          <EtiquetaFilaSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-icons text-5xl text-gray-300 mb-3" aria-hidden>
              label_off
            </span>
            <p className="text-gray-600">
              {tab === 'pendentes'
                ? 'Nenhum pedido pendente de etiqueta para esta data.'
                : 'Nenhuma etiqueta gerada para esta data.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <EtiquetaPedidoCard
                key={getItemKey(item)}
                item={item}
                variant={tab === 'pendentes' ? 'pendente' : 'gerado'}
                onAction={(selected) =>
                  openModalForItem(selected, tab === 'pendentes' ? 'fila' : 'reimprimir')
                }
              />
            ))}
          </div>
        )}
      </div>

      <EtiquetaGerarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        initialValues={modalInitial}
        onSuccess={() => void fetchFila(date)}
      />
    </div>
  );
}
