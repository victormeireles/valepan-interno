'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingOverlay from '@/components/LoadingOverlay';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import { InventarioProductRow, InventarioProdutoInput } from '@/components/Inventario/InventarioProductRow';
import { InventarioConfirmationModal } from '@/components/Inventario/InventarioConfirmationModal';
import { InventarioHeader } from '@/components/Inventario/InventarioHeader';
import { EstoqueDiff, EstoqueRecord } from '@/domain/types/inventario';

type ProdutoOption = {
  produto: string;
  unidade: string;
};

type InventarioOptionsResponse = {
  clientes: string[];
  produtos: ProdutoOption[];
};

type EstoqueResponse = {
  estoque: EstoqueRecord[];
};

type PreviewResponse = {
  diffs: EstoqueDiff[];
  produtosNaoInformados: string[];
  estoqueAtual: EstoqueRecord[];
};

const QUANTIDADE_VAZIA = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

export default function InventarioPage() {
  const [options, setOptions] = useState<InventarioOptionsResponse>({ clientes: [], produtos: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [clienteInput, setClienteInput] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [itens, setItens] = useState<InventarioProdutoInput[]>([]);
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cacheRef = useRef<Map<string, InventarioProdutoInput[]>>(new Map());
  const latestRequestRef = useRef<symbol | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setOptionsLoading(true);
        const response = await fetch('/api/inventario/options');
        if (!response.ok) {
          throw new Error('Não foi possível carregar os dados de inventário');
        }
        const data = (await response.json()) as InventarioOptionsResponse;
        setOptions(data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Erro ao carregar opções');
      } finally {
        setOptionsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const clienteValido = clienteSelecionado != null;

  useEffect(() => {
    if (!clienteSelecionado) {
      return;
    }

    const cacheHit = cacheRef.current.get(clienteSelecionado);
    if (cacheHit) {
      setItens(cacheHit.map((item) => ({ ...item, quantidade: { ...item.quantidade } })));
    } else {
      setItens([]);
    }

    const clienteNormalizado = clienteSelecionado;
    const requestId = Symbol('estoque');
    latestRequestRef.current = requestId;
    const controller = new AbortController();

    const fetchEstoque = async () => {
      try {
        setLoadingCliente(true);
        setMessage(null);
        const response = await fetch(`/api/inventario/cliente?cliente=${encodeURIComponent(clienteNormalizado)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao carregar estoque do tipo de estoque');
        }
        const data = (await response.json()) as EstoqueResponse;
        const linhas = data.estoque.map<InventarioProdutoInput>((record) => ({
          produto: record.produto,
          quantidade: { ...record.quantidade },
        }));
        cacheRef.current.set(
          clienteNormalizado,
          linhas.map((item) => ({ ...item, quantidade: { ...item.quantidade } })),
        );
        if (latestRequestRef.current === requestId) {
          setItens(linhas);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setMessage(error instanceof Error ? error.message : 'Falha ao carregar estoque');
        }
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoadingCliente(false);
        }
      }
    };

    fetchEstoque();
    return () => {
      controller.abort();
    };
  }, [clienteSelecionado]);

  const totalItens = useMemo(() => itens.length, [itens]);
  const podeAdicionar = clienteValido && !loadingCliente && !confirming;
  const podeCalcular =
    clienteSelecionado &&
    itens.length > 0 &&
    !loadingCliente &&
    !calculando &&
    !confirming;

  const assegurarClienteSelecionado = (): string | null => {
    if (clienteSelecionado) {
      return clienteSelecionado;
    }
    const valor = clienteInput.trim();
    if (!valor) {
      return null;
    }
    const normalizado =
      options.clientes.find(
        (nome) => nome.toLowerCase() === valor.toLowerCase(),
      ) ?? null;
    if (normalizado) {
      setClienteSelecionado(normalizado);
      return normalizado;
    }
    return null;
  };

  const obterItensValidos = (): InventarioProdutoInput[] | null => {
    const preenchidos = itens.filter(
      (item) => item.produto.trim().length > 0,
    );
    if (preenchidos.length === 0) {
      setMessage('Informe ao menos um produto antes de continuar.');
      return null;
    }
    if (preenchidos.length !== itens.length) {
      setMessage('Preencha o nome de todos os produtos antes de continuar.');
      return null;
    }
    return preenchidos.map((item) => ({
      produto: item.produto.trim(),
      quantidade: { ...item.quantidade },
    }));
  };

  const handleAddProduto = () => {
    setItens((prev) => [
      ...prev,
      {
        produto: '',
        quantidade: { ...QUANTIDADE_VAZIA },
      },
    ]);
  };

  const handleItemChange = (index: number, item: InventarioProdutoInput) => {
    setItens((prev) => prev.map((current, idx) => (idx === index ? item : current)));
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePreview = async () => {
    if (!clienteSelecionado) {
      const resolved = assegurarClienteSelecionado();
      if (!resolved) {
        setMessage('Selecione um tipo de estoque válido para continuar');
        return;
      }
    }

    const itensValidos = obterItensValidos();
    if (!itensValidos) {
      return;
    }

    try {
      setCalculando(true);
      setMessage(null);
      const cliente = clienteSelecionado ?? assegurarClienteSelecionado();
      if (!cliente) {
        setMessage('Selecione um tipo de estoque válido para continuar');
        return;
      }

      const response = await fetch('/api/inventario/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente,
          itens: itensValidos,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular diferenças');
      }
      setPreview(data as PreviewResponse);
      setConfirmationOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao simular inventário');
    } finally {
      setCalculando(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    try {
      setConfirming(true);
      const cliente = clienteSelecionado ?? assegurarClienteSelecionado();
      if (!cliente) {
        setMessage('Selecione um tipo de estoque válido para continuar');
        return;
      }

      const itensValidos = obterItensValidos();
      if (!itensValidos) {
        setConfirming(false);
        return;
      }

      const response = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente, itens: itensValidos }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar inventário');
      }
      setConfirmationOpen(false);
      setPreview(null);
      setMessage('Inventário registrado com sucesso!');
      await recarregarEstoque();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao registrar inventário');
    } finally {
      setConfirming(false);
      setCalculando(false);
    }
  };

  const recarregarEstoque = async () => {
    if (!clienteSelecionado) return;
    try {
      const response = await fetch(`/api/inventario/cliente?cliente=${encodeURIComponent(clienteSelecionado)}`);
      if (!response.ok) return;
      const data = (await response.json()) as EstoqueResponse;
      const linhas = data.estoque.map<InventarioProdutoInput>((record) => ({
        produto: record.produto,
        quantidade: { ...record.quantidade },
      }));
      setItens(linhas);
      cacheRef.current.set(
        clienteSelecionado,
        linhas.map((item) => ({ ...item, quantidade: { ...item.quantidade } })),
      );
    } catch {
      // Ignorar erro silenciosamente
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <LoadingOverlay isLoading={optionsLoading || loadingCliente} message="Carregando inventário..." />
      <InventarioHeader title="Inventário de Estoque" />

      <main className="max-w-5xl mx-auto px-4 pb-28 pt-8 space-y-8">
        {message && (
          <div
            className={`border rounded-lg px-4 py-3 ${
              message.includes('sucesso')
                ? 'border-green-500/60 bg-green-900/20 text-green-200'
                : 'border-red-500/60 bg-red-900/20 text-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <section className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <AutocompleteInput
              value={clienteInput}
              onChange={(value) => {
                setClienteInput(value);
                if (value.length === 0) {
                  setClienteSelecionado(null);
                  setItens([]);
                  setPreview(null);
                }
              }}
              onSelect={(value) => {
                const normalizado =
                  options.clientes.find(
                    (nome) => nome.toLowerCase() === value.toLowerCase(),
                  ) ?? value;
                setClienteInput(normalizado);
                setClienteSelecionado(normalizado);
                setPreview(null);
              }}
              options={options.clientes}
              placeholder="Digite o tipo de estoque..."
              label="Tipo de Estoque"
              required
              disabled={optionsLoading || confirming}
            />

            <div className="rounded-lg border border-blue-700 bg-blue-900/20 px-4 py-3 text-sm text-blue-100">
              Informe os produtos e quantidades encontrados no estoque físico. Ao confirmar, o sistema atualizará o estoque automaticamente.
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-200">
            Produtos ({totalItens})
          </h2>

          <div className="space-y-4">
            {itens.map((item, index) => (
              <InventarioProductRow
                key={index}
                item={item}
                onChange={(value) => handleItemChange(index, value)}
                onRemove={() => handleRemoveItem(index)}
                produtoOptions={options.produtos}
                disabled={confirming}
              />
            ))}
            {itens.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/30 px-4 py-6 text-center text-sm text-gray-500">
                Nenhum produto selecionado. Clique em &quot;Adicionar produto&quot; para começar.
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddProduto}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={!podeAdicionar}
            >
              Adicionar produto
            </button>
          </div>
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex max-w-5xl justify-end px-4 pb-4">
          <button
            type="button"
            onClick={handlePreview}
            className="pointer-events-auto w-full rounded-xl bg-green-600 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            disabled={!podeCalcular}
          >
            {calculando ? 'Calculando...' : 'Calcular diferenças'}
          </button>
        </div>
      </div>

      <InventarioConfirmationModal
        isOpen={confirmationOpen}
        diffs={preview?.diffs ?? []}
        produtosNaoInformados={preview?.produtosNaoInformados ?? []}
        onConfirm={handleConfirm}
        onClose={() => setConfirmationOpen(false)}
        loading={confirming}
      />
    </div>
  );
}
