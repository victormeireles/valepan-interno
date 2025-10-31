'use client';

import { useState, useEffect } from 'react';

interface EtiquetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: string;
  dataFabricacao: string;
  congeladoInicial?: boolean;
  lote: number;
  rowId?: number;
  onSuccess?: () => void;
}

export default function EtiquetaModal({
  isOpen,
  onClose,
  produto,
  dataFabricacao,
  congeladoInicial = true,
  lote,
  rowId,
  onSuccess,
}: EtiquetaModalProps) {
  const [diasValidade, setDiasValidade] = useState(21);
  const [congelado, setCongelado] = useState(congeladoInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar estado quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setDiasValidade(21);
      setCongelado(congeladoInicial);
      setError(null);
    }
  }, [isOpen, congeladoInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/etiqueta/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto,
          dataFabricacao,
          diasValidade,
          congelado,
          lote,
          rowId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar etiqueta');
      }

      // Abrir HTML em nova aba
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Fechar modal e notificar sucesso
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar etiqueta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    console.log('EtiquetaModal: isOpen = false');
    return null;
  }

  console.log('EtiquetaModal: renderizando com', { produto, lote, dataFabricacao });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-icons">label</span>
            Gerar Etiqueta
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-md text-red-100 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Produto
            </label>
            <input
              type="text"
              value={produto}
              readOnly
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm cursor-not-allowed"
            />
          </div>

          {/* Data de Fabricação */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Data de Fabricação
            </label>
            <input
              type="text"
              value={dataFabricacao.split('-').reverse().join('/')}
              readOnly
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm cursor-not-allowed"
            />
          </div>

          {/* Lote */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Lote
            </label>
            <input
              type="text"
              value={lote}
              readOnly
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm cursor-not-allowed"
            />
          </div>

          {/* Dias de Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Dias de Validade
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={diasValidade}
              onChange={(e) => setDiasValidade(parseInt(e.target.value) || 21)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Switch Congelado */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Congelado
            </label>
            <button
              type="button"
              onClick={() => setCongelado(!congelado)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                congelado ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              disabled={loading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  congelado ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors font-medium text-sm"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Gerando...
                </>
              ) : (
                <>
                  <span className="material-icons text-sm">print</span>
                  Gerar Etiqueta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


