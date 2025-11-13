import { EstoqueDiff, Quantidade } from '@/domain/types/inventario';

interface InventarioConfirmationModalProps {
  isOpen: boolean;
  diffs: EstoqueDiff[];
  produtosNaoInformados: string[];
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function InventarioConfirmationModal({
  isOpen,
  diffs,
  produtosNaoInformados,
  onConfirm,
  onClose,
  loading = false,
}: InventarioConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-950 text-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-800">
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Confirmar Inventário</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </header>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <section className="space-y-3">
            {diffs.map((diff) => (
              <div
                key={diff.produto}
                className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
              >
                <h3 className="text-sm font-semibold text-white">
                  {diff.produto}
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs uppercase tracking-wide text-gray-400 sm:grid-cols-2">
                  <ResumoQuantidade label="Estoque atual" quantidade={diff.anterior} />
                  <ResumoQuantidade label="Inventário informado" quantidade={diff.novo} />
                </div>
              </div>
            ))}
            {diffs.length === 0 && (
              <p className="text-center text-sm text-gray-500">
                Nenhuma diferença encontrada.
              </p>
            )}
          </section>

          {produtosNaoInformados.length > 0 && (
            <section className="rounded-xl border border-yellow-700 bg-yellow-900/20 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-yellow-200">
                Produtos que serão zerados
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-yellow-100">
                {produtosNaoInformados.map((produto) => (
                  <li key={produto}>{produto}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="flex justify-between items-center gap-3 px-5 py-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Confirmar inventário'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ResumoQuantidade({
  label,
  quantidade,
}: {
  label: string;
  quantidade?: Quantidade | null;
}) {
  const resumo = formatQuantidade(quantidade);

  return (
    <p className="flex items-center justify-between rounded-lg border border-gray-850 bg-gray-900/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      <span>{label}:</span>
      <span className="text-sm text-white">{resumo}</span>
    </p>
  );
}

function formatQuantidade(quantidade?: Quantidade | null): string {
  if (!quantidade) return '—';
  const partes: string[] = [];
  if (quantidade.caixas) partes.push(`${quantidade.caixas} cx`);
  if (quantidade.pacotes) partes.push(`${quantidade.pacotes} pct`);
  if (quantidade.unidades) partes.push(`${quantidade.unidades} un`);
  if (quantidade.kg) partes.push(`${quantidade.kg.toFixed(2)} kg`);

  if (partes.length === 0) {
    return '0 cx';
  }

  return partes.join(' + ');
}

