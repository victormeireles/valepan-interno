'use client';

import { useEffect, useId, useState } from 'react';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import { ajustarInsumoSaldo } from '@/app/actions/insumo-estoque-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatInsumoQuantidade } from '@/features/insumo-estoque/utils/formatters';

type Props = {
  isOpen: boolean;
  item: InsumoSaldoComDetalhes | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function InsumoAjusteModal({ isOpen, item, onClose, onSaved }: Props) {
  const titleId = useId();
  const [novoSaldo, setNovoSaldo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setAnimating(true);
      setNovoSaldo(String(item.quantidade));
      setObservacao('');
      setError('');
    } else if (!isOpen) {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  if ((!isOpen && !animating) || !item) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const parsed = Number(novoSaldo.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      setError('Informe um saldo válido');
      setLoading(false);
      return;
    }

    const result = await ajustarInsumoSaldo(item.insumoId, parsed, observacao);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onSaved();
    onClose();
    setLoading(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900">
              Ajustar saldo
            </h2>
            <p className="mt-1 text-sm text-stone-600">{item.nome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="material-icons text-base" aria-hidden="true">
                error
              </span>
              {error}
            </div>
          ) : null}

          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Saldo atual
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-stone-900">
              {formatInsumoQuantidade(item.quantidade, item.unidadeResumida)}
            </p>
          </div>

          <Input
            id="novo-saldo"
            label="Novo saldo"
            type="number"
            step="0.001"
            min="0"
            numeric
            required
            value={novoSaldo}
            onChange={(event) => setNovoSaldo(event.target.value)}
          />

          <Input
            id="observacao-ajuste"
            label="Observação"
            required
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Motivo do ajuste..."
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Salvando…' : 'Confirmar ajuste'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
