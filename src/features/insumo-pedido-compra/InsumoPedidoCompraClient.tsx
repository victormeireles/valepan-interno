'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import type {
  InsumoPedidoCompraFiltro,
  InsumoPedidoCompraListItem,
} from '@/data/insumos/InsumoPedidoCompraRepository';
import { InsumoCompraDataReferenciaResolver } from '@/domain/insumos/insumo-compra-data-referencia-resolver';
import { PEDIDO_COMPRA_FILTRO_CHIPS } from '@/features/insumo-pedido-compra/insumo-pedido-compra-filtro';
import InsumoPedidoCompraFormModal, {
  type InsumoPedidoOpcao,
} from '@/features/insumo-pedido-compra/components/InsumoPedidoCompraFormModal';
import InsumoPedidoCompraMobileList from '@/features/insumo-pedido-compra/components/InsumoPedidoCompraMobileList';
import InsumoPedidoCompraTable from '@/features/insumo-pedido-compra/components/InsumoPedidoCompraTable';

type Props = {
  initialPedidos: InsumoPedidoCompraListItem[];
  atrasados: number;
  abertos: number;
  filtro: InsumoPedidoCompraFiltro;
  insumoId: string | null;
  insumoOpcoes: InsumoPedidoOpcao[];
};

type ToastState = { message: string; tone: 'success' | 'error' } | null;

export default function InsumoPedidoCompraClient({
  initialPedidos,
  atrasados,
  abertos,
  filtro,
  insumoId,
  insumoOpcoes,
}: Props) {
  const router = useRouter();
  const hojeIso = useMemo(
    () => new InsumoCompraDataReferenciaResolver().resolve().isoDate,
    [],
  );
  const [toast, setToast] = useState<ToastState>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] =
    useState<InsumoPedidoCompraListItem | null>(null);

  const insumoFiltroNome = insumoOpcoes.find((opcao) => opcao.id === insumoId)?.nome;

  const abrirNovo = () => {
    setPedidoSelecionado(null);
    setModalAberto(true);
  };

  const handleSaved = (mensagem: string) => {
    setModalAberto(false);
    setPedidoSelecionado(null);
    showToast(setToast, mensagem, 'success');
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <ConfigPageHeader
        title="Pedidos de compra"
        icon="receipt_long"
        description="Compromissos a chegar. O saldo físico só muda quando a NF do Omie entrar."
        action={
          <Button type="button" size="lg" icon="add" onClick={abrirNovo}>
            Novo pedido
          </Button>
        }
      />

      <Card>
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2" aria-label="Filtrar pedidos">
            {PEDIDO_COMPRA_FILTRO_CHIPS.map((chip) => (
              <Chip
                key={chip.value}
                active={filtro === chip.value}
                className="h-11"
                onClick={() => applyFiltro(router, chip.value, insumoId)}
              >
                {chip.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-1 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-sm tabular-nums text-stone-600">
              {atrasados} atrasados • {abertos} abertos
            </p>
            {insumoId ? (
              <Chip
                active
                icon="filter_alt"
                className="h-11"
                aria-label="Remover filtro de insumo"
                onClick={() => applyFiltro(router, filtro, null)}
              >
                {insumoFiltroNome ?? 'Insumo filtrado'}
              </Chip>
            ) : null}
          </div>
        </div>
      </Card>

      {initialPedidos.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="receipt_long"
            title="Nenhum pedido neste filtro."
            action={
              <Button type="button" size="lg" icon="add" onClick={abrirNovo}>
                Novo pedido
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <InsumoPedidoCompraTable
            pedidos={initialPedidos}
            hojeIso={hojeIso}
            onSelect={(pedido) => {
              setPedidoSelecionado(pedido);
              setModalAberto(true);
            }}
          />
          <InsumoPedidoCompraMobileList
            pedidos={initialPedidos}
            hojeIso={hojeIso}
            onSelect={(pedido) => {
              setPedidoSelecionado(pedido);
              setModalAberto(true);
            }}
          />
        </Card>
      )}

      {toast ? (
        <Toast
          tone={toast.tone}
          onClose={() => setToast(null)}
          className="fixed bottom-4 right-4 z-[60] shadow-lg"
        >
          {toast.message}
        </Toast>
      ) : null}

      <InsumoPedidoCompraFormModal
        open={modalAberto}
        pedido={pedidoSelecionado}
        insumoOpcoes={insumoOpcoes}
        onClose={() => {
          setModalAberto(false);
          setPedidoSelecionado(null);
        }}
        onSaved={handleSaved}
        onError={(mensagem) => showToast(setToast, mensagem, 'error')}
      />
    </div>
  );
}

function applyFiltro(
  router: ReturnType<typeof useRouter>,
  filtro: InsumoPedidoCompraFiltro,
  insumoId: string | null,
) {
  const params = new URLSearchParams();
  if (filtro !== 'abertos') params.set('filtro', filtro);
  if (insumoId) params.set('insumo', insumoId);
  const query = params.toString();
  router.replace(query ? `/compras-insumos?${query}` : '/compras-insumos');
}

function showToast(
  setToast: (value: ToastState) => void,
  message: string,
  tone: 'success' | 'error',
) {
  setToast({ message, tone });
  window.setTimeout(() => setToast(null), 4000);
}
