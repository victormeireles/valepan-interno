'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EtiquetaFilaItem, EtiquetaFilaResponse } from '@/domain/etiquetas/etiqueta-fila-types';
import EtiquetaFilaSkeleton from '@/components/Etiquetas/EtiquetaFilaSkeleton';
import EtiquetaGerarModal, {
  type EtiquetaGerarInitialValues,
  type EtiquetaGerarModalMode,
} from '@/components/Etiquetas/EtiquetaGerarModal';
import EtiquetaPedidoCard from '@/components/Etiquetas/EtiquetaPedidoCard';
import EtiquetasToolbar from '@/components/Etiquetas/EtiquetasToolbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { Toast } from '@/components/ui/Toast';
import {
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type TabId = 'pendentes' | 'gerados';

export default function EtiquetasPageClient() {
  const today = getTodayISOInBrazilTimezone();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<TabId>('pendentes');
  const [fila, setFila] = useState<EtiquetaFilaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<EtiquetaGerarModalMode>('fila');
  const [modalInitial, setModalInitial] = useState<EtiquetaGerarInitialValues | undefined>();

  const successToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessToastTimer = useCallback(() => {
    if (successToastTimerRef.current) {
      clearTimeout(successToastTimerRef.current);
      successToastTimerRef.current = null;
    }
  }, []);

  const showSuccessToast = useCallback(
    (message: string) => {
      clearSuccessToastTimer();
      setSuccessToast(message);
      successToastTimerRef.current = setTimeout(() => {
        setSuccessToast(null);
        successToastTimerRef.current = null;
      }, 2600);
    },
    [clearSuccessToastTimer],
  );

  useEffect(() => () => clearSuccessToastTimer(), [clearSuccessToastTimer]);

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

  const handleModalSuccess = () => {
    if (modalMode !== 'reimprimir') {
      const label =
        modalMode === 'manual'
          ? null
          : modalInitial?.produtoNome ?? 'produto';
      showSuccessToast(
        label
          ? `Etiqueta de ${label} gerada.`
          : 'Etiqueta manual gerada com sucesso.',
      );
    }
    void fetchFila(date);
  };

  const items = tab === 'pendentes' ? (fila?.pendentes ?? []) : (fila?.gerados ?? []);
  const pendentesCount = fila?.pendentes.length ?? 0;
  const geradosCount = fila?.gerados.length ?? 0;

  return (
    <>
      <EtiquetasToolbar
        selectedDate={date}
        onDateChange={setDate}
        onManualClick={openManualModal}
      />

      <div>
        {successToast ? (
          <Toast tone="success" className="mb-4" onClose={() => setSuccessToast(null)}>
            {successToast}
          </Toast>
        ) : null}

        {error ? (
          <Toast tone="error" className="mb-4">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void fetchFila(date)}
              >
                Tentar novamente
              </Button>
            </span>
          </Toast>
        ) : null}

        <Tabs
          value={tab}
          onChange={(id) => setTab(id as TabId)}
          tabs={[
            { id: 'pendentes', label: 'Pendentes', count: pendentesCount },
            { id: 'gerados', label: 'Já gerados', count: geradosCount },
          ]}
        />

        <div className="mt-4">
          {loading ? (
            <EtiquetaFilaSkeleton />
          ) : items.length === 0 ? (
            <Card padding="lg">
              <EmptyState
                icon="label_off"
                title={
                  tab === 'pendentes'
                    ? 'Nenhum pedido pendente'
                    : 'Nenhuma etiqueta gerada'
                }
                description={
                  tab === 'pendentes'
                    ? 'Não há etiquetas a gerar para esta data.'
                    : 'As etiquetas geradas aparecem aqui.'
                }
              />
            </Card>
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
      </div>

      <EtiquetaGerarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        initialValues={modalInitial}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
