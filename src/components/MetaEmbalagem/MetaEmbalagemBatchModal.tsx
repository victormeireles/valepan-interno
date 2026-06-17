'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

type BatchPreviewItem = {
  linha: number;
  acao: 'criar' | 'alterar' | 'sem_mudanca' | 'erro';
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao: string;
  assadeira?: string;
  modoQuantidade: 'latas' | 'unidades';
  latasNova: number;
  latasAtual?: number;
  unidadesNova?: number;
  unidadesAtual?: number;
  caixasDerivadas?: number;
  erro?: string;
};

type BatchPreviewResult = {
  items: BatchPreviewItem[];
  resumo: {
    criar: number;
    alterar: number;
    semMudanca: number;
    erros: number;
  };
  canApply: boolean;
};

type Step = 'input' | 'preview';

const FORMAT_HINT =
  'data produção;data etiqueta;tipo estoque;produto;latas/un;assadeira;observação';

const EXAMPLE = `2026-06-09;2026-06-09;Valepan;HB Brioche 65g;1000;;
2026-06-09;2026-06-09;Valepan;HB Gergelim 65g;350;;lata nova`;

interface MetaEmbalagemBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MetaEmbalagemBatchModal({
  isOpen,
  onClose,
  onSuccess,
}: MetaEmbalagemBatchModalProps) {
  const textareaId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('input');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<BatchPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('input');
    setText('');
    setPreview(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        if (step === 'preview') {
          setStep('input');
          setPreview(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, loading, step, onClose]);

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('Cole ao menos uma linha de metas.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/embalagem/pedido/batch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao analisar lote');
      setPreview(data as BatchPreviewResult);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao analisar lote');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview?.canApply) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/embalagem/pedido/batch/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar metas');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar metas');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-modal-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-2xl sm:rounded-2xl border border-gray-700 bg-gray-950 text-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4">
          <div>
            <h2 id="batch-modal-title" className="text-lg font-semibold">
              {step === 'input' ? 'Importar metas em lote' : 'Confirmar importação'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {step === 'input'
                ? 'Cole uma linha por meta. Metas existentes terão a quantidade atualizada.'
                : 'Revise as alterações antes de aplicar.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (loading ? undefined : step === 'preview' ? setStep('input') : onClose())}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span className="material-icons text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'input' ? (
            <div className="space-y-3">
              <label htmlFor={textareaId} className="block text-sm font-medium text-gray-200">
                Metas (formato CSV com ponto e vírgula)
              </label>
              <p className="text-xs text-gray-500" id={`${textareaId}-hint`}>
                {FORMAT_HINT}
              </p>
              <p className="text-xs text-gray-600">
                Assadeira vazia usa a padrão do produto. Produtos sem assadeira: informe unidades na coluna latas/un.
              </p>
              <textarea
                id={textareaId}
                aria-describedby={`${textareaId}-hint`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder={EXAMPLE}
                className="min-h-[220px] w-full resize-y rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 font-mono text-sm leading-relaxed text-white placeholder:text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setText(EXAMPLE)}
                disabled={loading}
                className="text-xs text-blue-400 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Inserir exemplo
              </button>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                role="status"
                aria-live="polite"
              >
                <ResumoBadge label="Criar" count={preview.resumo.criar} tone="green" />
                <ResumoBadge label="Alterar" count={preview.resumo.alterar} tone="amber" />
                <ResumoBadge label="Sem mudança" count={preview.resumo.semMudanca} tone="gray" />
                <ResumoBadge label="Erros" count={preview.resumo.erros} tone="red" />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-800">
                <div className="max-h-[45vh] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Ação</th>
                        <th className="px-3 py-2 font-medium">Produto</th>
                        <th className="px-3 py-2 font-medium hidden sm:table-cell">Estoque</th>
                        <th className="px-3 py-2 font-medium hidden md:table-cell">Assadeira</th>
                        <th className="px-3 py-2 font-medium text-right tabular-nums">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {preview.items.map((item) => (
                        <PreviewRow key={`${item.linha}-${item.produto}-${item.acao}`} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!preview.canApply && preview.resumo.erros === 0 && (
                <p className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3 text-sm text-gray-400">
                  Nenhuma meta nova ou alterada — nada a aplicar.
                </p>
              )}
            </div>
          ) : null}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-700/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-gray-800 px-5 py-4 sm:flex-row sm:justify-between">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setPreview(null);
                setError(null);
              }}
              disabled={loading}
              className="min-h-[44px] rounded-lg border border-gray-700 px-5 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Voltar e editar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px] rounded-lg border border-gray-700 px-5 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}

          {step === 'input' ? (
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading || !text.trim()}
              className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Analisando…' : 'Revisar alterações'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !preview?.canApply}
              className="min-h-[44px] rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Aplicando…' : 'Confirmar importação'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function ResumoBadge({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'green' | 'amber' | 'gray' | 'red';
}) {
  const styles = {
    green: 'border-green-800/60 bg-green-950/30 text-green-200',
    amber: 'border-amber-800/60 bg-amber-950/30 text-amber-200',
    gray: 'border-gray-700 bg-gray-900/50 text-gray-300',
    red: 'border-red-800/60 bg-red-950/30 text-red-200',
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${styles}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{count}</div>
    </div>
  );
}

function PreviewRow({ item }: { item: BatchPreviewItem }) {
  const acaoLabel = {
    criar: 'Criar',
    alterar: 'Alterar',
    sem_mudanca: 'Igual',
    erro: 'Erro',
  }[item.acao];

  const acaoClass = {
    criar: 'text-green-400',
    alterar: 'text-amber-400',
    sem_mudanca: 'text-gray-500',
    erro: 'text-red-400',
  }[item.acao];

  const qtyDisplay = (() => {
    if (item.acao === 'erro') return '—';

    if (item.modoQuantidade === 'unidades') {
      const nova = item.unidadesNova ?? 0;
      const atual = item.unidadesAtual;
      if (item.acao === 'alterar' && atual != null) {
        return `${formatQty(atual)} un → ${formatQty(nova)} un`;
      }
      return `${formatQty(nova)} un`;
    }

    if (item.acao === 'alterar' && item.latasAtual != null) {
      return `${formatQty(item.latasAtual)} lt → ${formatQty(item.latasNova)} lt`;
    }
    return `${formatQty(item.latasNova)} lt`;
  })();

  return (
    <tr className="bg-gray-950/40 hover:bg-gray-900/40">
      <td className="px-3 py-2.5 tabular-nums text-gray-500">{item.linha}</td>
      <td className={`px-3 py-2.5 font-medium ${acaoClass}`}>
        <span className="sr-only">Ação: </span>
        {acaoLabel}
      </td>
      <td className="px-3 py-2.5">
        <div className="font-medium text-white">{item.produto || '—'}</div>
        {item.observacao ? (
          <div className="text-xs text-gray-500">{item.observacao}</div>
        ) : null}
        {item.caixasDerivadas != null && item.caixasDerivadas > 0 ? (
          <div className="text-xs text-gray-600">≈ {item.caixasDerivadas} cx</div>
        ) : null}
        {item.assadeira ? (
          <div className="text-xs text-gray-500 md:hidden">Assadeira: {item.assadeira}</div>
        ) : null}
        {item.erro ? (
          <div className="mt-1 text-xs text-red-400">{item.erro}</div>
        ) : null}
        <div className="mt-0.5 text-xs text-gray-600 sm:hidden">
          {item.tipoEstoque}
        </div>
      </td>
      <td className="hidden px-3 py-2.5 text-gray-400 sm:table-cell">{item.tipoEstoque}</td>
      <td className="hidden px-3 py-2.5 text-gray-400 md:table-cell">
        {item.assadeira ?? (item.modoQuantidade === 'unidades' ? '—' : 'padrão')}
      </td>
      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{qtyDisplay}</td>
    </tr>
  );
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
