import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';

type HeaderProps = {
  pedido: InsumoPedidoCompraListItem | null;
  loading: boolean;
  onClose: () => void;
};

export function InsumoPedidoCompraFormHeader({ pedido, loading, onClose }: HeaderProps) {
  const titulo = pedido ? `Pedido ${pedido.numero}` : 'Novo pedido';
  const subtitulo = pedido ? pedido.fornecedor_nome : 'Registrar compra a chegar';

  return (
    <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
          Pedido de compra
        </p>
        <h2
          id="pedido-compra-modal-title"
          className="truncate text-xl font-bold tracking-tight text-stone-900"
        >
          {titulo}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{subtitulo}</p>
      </div>
      <IconButton
        icon="close"
        label="Fechar"
        size="lg"
        onClick={onClose}
        disabled={loading}
      />
    </header>
  );
}

type FooterProps = {
  pedido: InsumoPedidoCompraListItem | null;
  loading: boolean;
  somenteLeitura: boolean;
  podeEncerrar: boolean;
  onClose: () => void;
  onEncerrar: () => void;
  onCancelar: () => void;
};

export function InsumoPedidoCompraFormFooter({
  pedido,
  loading,
  somenteLeitura,
  podeEncerrar,
  onClose,
  onEncerrar,
  onCancelar,
}: FooterProps) {
  return (
    <footer className="flex flex-col gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        {podeEncerrar ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon="check_circle"
            disabled={loading}
            onClick={onEncerrar}
          >
            Encerrar
          </Button>
        ) : null}
        {podeEncerrar ? (
          <Button
            type="button"
            variant="danger"
            size="lg"
            icon="cancel"
            disabled={loading}
            onClick={onCancelar}
          >
            Cancelar pedido
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={loading}>
          {somenteLeitura ? 'Fechar' : 'Voltar'}
        </Button>
        {somenteLeitura ? null : (
          <Button type="submit" size="lg" icon="save" disabled={loading}>
            {loading ? 'Salvando…' : pedido ? 'Salvar' : 'Criar pedido'}
          </Button>
        )}
      </div>
    </footer>
  );
}
