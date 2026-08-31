'use client';

import { FormEvent, useEffect, useState } from 'react';

import {
  cancelarPedidoCompra,
  encerrarPedidoCompra,
  salvarPedidoCompra,
} from '@/app/actions/insumo-pedido-compra-actions';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';
import {
  InsumoPedidoCompraFormFooter,
  InsumoPedidoCompraFormHeader,
} from './InsumoPedidoCompraFormChrome';
import InsumoPedidoCompraFormLinhas, {
  type InsumoPedidoFormLinha,
  type InsumoPedidoOpcao,
} from './InsumoPedidoCompraFormLinhas';
import {
  ENCERRAR_PEDIDO_CONFIRM,
  buildSaveInput,
  cancelarPedidoConfirm,
  linhasFromPedido,
  linhasFromPrefill,
  messageFromUnknown,
  type InsumoPedidoCompraFormPrefill,
} from './insumo-pedido-compra-form-mapper';

export type { InsumoPedidoOpcao };
export type { InsumoPedidoCompraFormPrefill };

export type InsumoPedidoCompraFormModalProps = {
  open: boolean;
  pedido: InsumoPedidoCompraListItem | null;
  prefill?: InsumoPedidoCompraFormPrefill;
  insumoOpcoes: InsumoPedidoOpcao[];
  onClose: () => void;
  onSaved: (mensagem: string) => void;
  onError?: (mensagem: string) => void;
};

export default function InsumoPedidoCompraFormModal({
  open,
  pedido,
  prefill,
  insumoOpcoes,
  onClose,
  onSaved,
  onError,
}: InsumoPedidoCompraFormModalProps) {
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [dataChegada, setDataChegada] = useState('');
  const [observacao, setObservacao] = useState('');
  const [linhas, setLinhas] = useState<InsumoPedidoFormLinha[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    seedForm(pedido, prefill, setFornecedorNome, setDataChegada, setObservacao, setLinhas);
    setError('');
  }, [open, pedido, prefill]);

  if (!open) return null;

  const somenteLeitura =
    pedido?.status === 'encerrado' || pedido?.status === 'cancelado';
  const podeEncerrar = pedido?.status === 'aberto';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/35 backdrop-blur-sm"
        aria-label="Fechar modal"
        onClick={() => !loading && onClose()}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pedido-compra-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
      >
        <InsumoPedidoCompraFormHeader
          pedido={pedido}
          loading={loading}
          onClose={onClose}
        />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) =>
            void submitPedido({
              event,
              pedido,
              fornecedorNome,
              dataChegada,
              observacao,
              linhas,
              setLoading,
              setError,
              onSaved,
              onError,
            })
          }
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
            <Input
              label="Fornecedor"
              required
              disabled={somenteLeitura}
              value={fornecedorNome}
              onChange={(event) => setFornecedorNome(event.target.value)}
              placeholder="Nome do fornecedor"
            />
            <label
              className="flex flex-col gap-1.5 text-sm font-medium text-stone-700"
              htmlFor="pedido-compra-chegada"
            >
              <span>
                Data de chegada prevista
                <span className="text-danger"> *</span>
              </span>
              <DateField
                id="pedido-compra-chegada"
                required
                disabled={somenteLeitura}
                value={dataChegada}
                widthClass="w-full"
                className="h-11"
                onChange={(event) => setDataChegada(event.target.value)}
              />
            </label>
            <Input
              label="Observação"
              disabled={somenteLeitura}
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Opcional"
            />
            <InsumoPedidoCompraFormLinhas
              linhas={linhas}
              opcoes={insumoOpcoes}
              disabled={somenteLeitura}
              onChange={setLinhas}
            />
          </div>
          <InsumoPedidoCompraFormFooter
            pedido={pedido}
            loading={loading}
            somenteLeitura={somenteLeitura}
            podeEncerrar={Boolean(podeEncerrar)}
            onClose={onClose}
            onEncerrar={() =>
              void encerrarPedido(pedido, setLoading, setError, onSaved, onError)
            }
            onCancelar={() =>
              void cancelarPedido(pedido, setLoading, setError, onSaved, onError)
            }
          />
        </form>
      </section>
    </div>
  );
}

async function submitPedido({
  event,
  pedido,
  fornecedorNome,
  dataChegada,
  observacao,
  linhas,
  setLoading,
  setError,
  onSaved,
  onError,
}: {
  event: FormEvent;
  pedido: InsumoPedidoCompraListItem | null;
  fornecedorNome: string;
  dataChegada: string;
  observacao: string;
  linhas: InsumoPedidoFormLinha[];
  setLoading: (value: boolean) => void;
  setError: (value: string) => void;
  onSaved: (mensagem: string) => void;
  onError?: (mensagem: string) => void;
}) {
  event.preventDefault();
  setLoading(true);
  setError('');
  try {
    const salvo = await salvarPedidoCompra(
      buildSaveInput(pedido, fornecedorNome, dataChegada, observacao, linhas),
    );
    onSaved(pedido ? 'Pedido salvo.' : `Pedido ${salvo.numero} criado.`);
  } catch (caught) {
    reportError(caught, 'Erro ao salvar pedido.', setError, onError);
  } finally {
    setLoading(false);
  }
}

async function encerrarPedido(
  pedido: InsumoPedidoCompraListItem | null,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  onSaved: (mensagem: string) => void,
  onError?: (mensagem: string) => void,
) {
  if (!pedido) return;
  if (!window.confirm(ENCERRAR_PEDIDO_CONFIRM)) return;
  setLoading(true);
  setError('');
  try {
    await encerrarPedidoCompra(pedido.id);
    onSaved('Pedido encerrado.');
  } catch (caught) {
    reportError(caught, 'Erro ao encerrar pedido.', setError, onError);
  } finally {
    setLoading(false);
  }
}

async function cancelarPedido(
  pedido: InsumoPedidoCompraListItem | null,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  onSaved: (mensagem: string) => void,
  onError?: (mensagem: string) => void,
) {
  if (!pedido) return;
  if (!window.confirm(cancelarPedidoConfirm(pedido.numero, pedido.fornecedor_nome))) {
    return;
  }
  setLoading(true);
  setError('');
  try {
    await cancelarPedidoCompra(pedido.id);
    onSaved('Pedido cancelado.');
  } catch (caught) {
    reportError(caught, 'Erro ao cancelar pedido.', setError, onError);
  } finally {
    setLoading(false);
  }
}

function reportError(
  caught: unknown,
  fallback: string,
  setError: (value: string) => void,
  onError?: (mensagem: string) => void,
) {
  const mensagem = messageFromUnknown(caught, fallback);
  setError(mensagem);
  onError?.(mensagem);
}

function seedForm(
  pedido: InsumoPedidoCompraListItem | null,
  prefill: InsumoPedidoCompraFormPrefill | undefined,
  setFornecedorNome: (value: string) => void,
  setDataChegada: (value: string) => void,
  setObservacao: (value: string) => void,
  setLinhas: (value: InsumoPedidoFormLinha[]) => void,
) {
  if (pedido) {
    setFornecedorNome(pedido.fornecedor_nome);
    setDataChegada(pedido.data_chegada_prevista);
    setObservacao(pedido.observacao ?? '');
    setLinhas(linhasFromPedido(pedido));
    return;
  }
  if (prefill) {
    setFornecedorNome(prefill.fornecedorNome);
    setDataChegada(prefill.dataChegadaPrevista);
    setObservacao('');
    setLinhas(linhasFromPrefill(prefill));
    return;
  }
  setFornecedorNome('');
  setDataChegada('');
  setObservacao('');
  setLinhas(linhasFromPedido(null));
}
