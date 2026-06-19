'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import { resolverInsumoPendencia } from '@/app/actions/insumo-estoque-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  formatCurrency,
  formatDate,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  isOpen: boolean;
  pendencia: InsumoPendenciaComEmpresa | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function InsumoResolverPendenciaModal({
  isOpen,
  pendencia,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [insumoId, setInsumoId] = useState('');
  const [fatorConversao, setFatorConversao] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && pendencia) {
      setAnimating(true);
      setInsumoId('');
      setFatorConversao('1');
      setError('');
    } else if (!isOpen) {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pendencia]);

  const preview = useMemo(() => {
    if (!pendencia) return null;
    const fator = Number(fatorConversao.replace(',', '.'));
    if (!Number.isFinite(fator) || fator <= 0) return null;

    const qtdNf = Number(pendencia.quantidade_nf);
    const qtdConvertida = calcularQuantidadeEntrada(qtdNf, fator);
    let custo = 0;
    try {
      custo = calcularCustoUnitarioEntrada(Number(pendencia.valor_total_item), qtdConvertida);
    } catch {
      return null;
    }

    return { qtdNf, fator, qtdConvertida, custo };
  }, [pendencia, fatorConversao]);

  if ((!isOpen && !animating) || !pendencia) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const fator = Number(fatorConversao.replace(',', '.'));
    const result = await resolverInsumoPendencia(pendencia.id, insumoId, fator);
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
              Vincular produto Omie
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              NF {pendencia.numero_nf || '—'} • {pendencia.empresaNome}
            </p>
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

          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <p className="font-mono text-xs text-stone-500">
              {pendencia.omie_codigo_produto || pendencia.omie_id_produto}
            </p>
            <p className="mt-1 font-medium text-stone-900">
              {pendencia.descricao_produto || 'Produto sem descrição'}
            </p>
            <p className="mt-2 font-mono tabular-nums">
              {formatInsumoQuantidade(Number(pendencia.quantidade_nf), pendencia.unidade_nf ?? undefined)}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Emissão: {formatDate(pendencia.data_emissao_nf)}
            </p>
          </div>

          <SelectRemoteAutocomplete
            value={insumoId}
            onChange={setInsumoId}
            stage="insumos"
            label="Insumo"
            placeholder="Buscar insumo..."
            required
          />

          <Input
            id="fator-conversao"
            label="Fator de conversão"
            type="number"
            step="0.000001"
            min="0.000001"
            numeric
            required
            value={fatorConversao}
            onChange={(event) => setFatorConversao(event.target.value)}
            hint="Quantidade NF × fator = quantidade no estoque do insumo"
          />

          {preview ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-mono tabular-nums">
                {formatInsumoQuantidade(preview.qtdNf, pendencia.unidade_nf ?? undefined)} ×{' '}
                {preview.fator.toLocaleString('pt-BR')} ={' '}
                {formatInsumoQuantidade(preview.qtdConvertida)}
              </p>
              <p className="mt-1 font-mono tabular-nums">
                Custo: {formatCurrency(preview.custo)}/unidade
              </p>
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !insumoId}>
              {loading ? 'Registrando…' : 'Confirmar e registrar entrada'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
