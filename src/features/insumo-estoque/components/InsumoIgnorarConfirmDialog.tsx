'use client';

import { Button } from '@/components/ui/Button';

export type InsumoIgnorarConfirmModo = 'produto' | 'produto-ou-fornecedor';

type InsumoIgnorarConfirmDialogProps = {
  open: boolean;
  modo: InsumoIgnorarConfirmModo;
  produtoLabel: string;
  fornecedorLabel: string | null;
  pendenciaCount: number;
  busy?: boolean;
  onCancel: () => void;
  onIgnorarProduto: () => void;
  onIgnorarFornecedor: () => void;
};

function mensagemSomenteProduto(pendenciaCount: number, produtoLabel: string): string {
  if (pendenciaCount === 1) {
    return 'Ignorar esta pendência? Ela não aparecerá mais na fila.';
  }
  return `Ignorar ${pendenciaCount} pendências de ${produtoLabel}? Elas não aparecerão mais na fila.`;
}

function rotuloBotaoSomenteProduto(produtoLabel: string): string {
  return /^\d+\s+produtos$/.test(produtoLabel)
    ? 'Ignorar só estes produtos'
    : 'Ignorar só este produto';
}

/** "Nome (CNPJ)" — mono só no trecho do CNPJ. */
function FornecedorLabelComCnpj({ label }: { label: string }) {
  const open = label.lastIndexOf(' (');
  if (open < 0 || !label.endsWith(')')) return <>{label}</>;
  return (
    <>
      {label.slice(0, open + 2)}
      <span className="font-mono tabular-nums">{label.slice(open + 2, -1)}</span>)
    </>
  );
}

export default function InsumoIgnorarConfirmDialog({
  open,
  modo,
  produtoLabel,
  fornecedorLabel,
  pendenciaCount,
  busy = false,
  onCancel,
  onIgnorarProduto,
  onIgnorarFornecedor,
}: InsumoIgnorarConfirmDialogProps) {
  if (!open) return null;

  const titulo =
    modo === 'produto-ou-fornecedor' ? 'Ignorar produto ou fornecedor' : 'Ignorar pendências';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="ignorar-confirm-title"
        aria-describedby="ignorar-confirm-desc"
        className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="ignorar-confirm-title" className="text-lg font-semibold text-text-strong">
          {titulo}
        </h2>
        <p id="ignorar-confirm-desc" className="mt-2 text-sm text-text-muted">
          {modo === 'produto'
            ? mensagemSomenteProduto(pendenciaCount, produtoLabel)
            : `Como deseja ignorar ${produtoLabel}? Pendências não aparecerão mais na fila.`}
        </p>
        {modo === 'produto-ou-fornecedor' && fornecedorLabel ? (
          <p className="mt-3 text-sm text-text-strong">
            Fornecedor: <FornecedorLabelComCnpj label={fornecedorLabel} />
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy}
            className="text-stone-500 hover:text-stone-700"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          {modo === 'produto' ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={busy}
              onClick={onIgnorarProduto}
            >
              Ignorar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={busy}
                onClick={onIgnorarProduto}
              >
                {rotuloBotaoSomenteProduto(produtoLabel)}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={busy}
                onClick={onIgnorarFornecedor}
              >
                Ignorar tudo deste fornecedor
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
