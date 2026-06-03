'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EstoqueMovimentoOrigem, EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { ORIGEM_COLORS, ORIGEM_LABELS } from '@/domain/estoque/movimento-display';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export default function EstoqueAuditoriaPage() {
  const [movimentos, setMovimentos] = useState<EstoqueMovimentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origem, setOrigem] = useState<EstoqueMovimentoOrigem | ''>('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (origem) params.set('origem', origem);
      if (de) params.set('de', `${de}T00:00:00.000Z`);
      if (ate) params.set('ate', `${ate}T23:59:59.999Z`);
      params.set('limit', '200');

      const res = await fetch(`/api/estoque/movimentos?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Erro ao carregar movimentos');
      }
      setMovimentos(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [origem, de, ate]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Auditoria de estoque</h1>
          <p className="mt-1 text-sm text-gray-600">
            Histórico de alterações no estoque por tipo de estoque e produto.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Origem</span>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value as EstoqueMovimentoOrigem | '')}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="">Todas</option>
              {(Object.keys(ORIGEM_LABELS) as EstoqueMovimentoOrigem[]).map((key) => (
                <option key={key} value={key}>
                  {ORIGEM_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">De</span>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Até</span>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void carregar()}
              className="rounded bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Filtrar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-600">Carregando...</p>
        ) : movimentos.length === 0 ? (
          <p className="text-gray-600">Nenhum movimento encontrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Data/hora</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Tipo estoque</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Produto</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Delta</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Saldo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimentos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                      {formatDateTime(mov.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{mov.tipoEstoqueNome}</td>
                    <td className="px-4 py-3 text-gray-900">{mov.produtoNome}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      cx {formatDelta(mov.delta.caixas)} · pct {formatDelta(mov.delta.pacotes)} · un{' '}
                      {formatDelta(mov.delta.unidades)} · kg {formatDelta(mov.delta.kg)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatQuantidade(mov.saldo)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORIGEM_COLORS[mov.origem]}`}
                      >
                        {ORIGEM_LABELS[mov.origem]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
