'use client';

import { useState, useEffect } from 'react';

interface EtiquetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: string;
  dataFabricacao: string;
  congeladoInicial?: boolean;
  cliente?: string;
  lote: number;
  rowId?: number;
  onSuccess?: () => void;
}

export default function EtiquetaModal({
  isOpen,
  onClose,
  produto,
  dataFabricacao,
  congeladoInicial = false,
  cliente,
  lote,
  rowId,
  onSuccess,
}: EtiquetaModalProps) {
  const [diasValidade, setDiasValidade] = useState(21);
  const [diasValidadeCongelado, setDiasValidadeCongelado] = useState(90);
  const [congelado, setCongelado] = useState(congeladoInicial);
  const [mostrarTextoCongelado, setMostrarTextoCongelado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nomeEtiqueta, setNomeEtiqueta] = useState(produto);

  // Função para obter o nome padrão na etiqueta baseado no produto
  const getNomeEtiquetaPadrao = (produtoNome: string): string => {
    // Normalizar para comparação (remover espaços extras e converter para minúsculas)
    const produtoNormalizado = produtoNome.trim().toLowerCase();
    
    // Se for "HB Brioche 50g 10cm", retornar "HB Smash Brioche 50g 10cm"
    if (produtoNormalizado === 'hb brioche 50g 10cm') {
      return 'HB Smash Brioche 50g 10cm';
    }
    
    // Caso contrário, retornar o nome do produto original
    return produtoNome;
  };

  // Resetar estado quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setDiasValidade(21);
      setDiasValidadeCongelado(90);
      setError(null);
      setNomeEtiqueta(getNomeEtiquetaPadrao(produto));
      setLoadingFlags(true);
      
      // Buscar flags do cliente no banco de dados
      const buscarFlagsCliente = async () => {
        if (!cliente || cliente.trim() === '') {
          // Se não tem cliente, usar valores padrão
          setCongelado(congeladoInicial);
          setMostrarTextoCongelado(false);
          setLoadingFlags(false);
          return;
        }

        try {
          const res = await fetch(`/api/clientes/flags-etiqueta?cliente=${encodeURIComponent(cliente)}`);
          const data = await res.json();
          
          if (res.ok && data) {
            // Usar valores do banco, com fallback para congeladoInicial se não tiver flag
            setCongelado(data.tem_validade_congelado ?? congeladoInicial);
            setMostrarTextoCongelado(data.tem_texto_congelado ?? false);
          } else {
            // Se der erro, usar valores padrão
            setCongelado(congeladoInicial);
            setMostrarTextoCongelado(false);
          }
        } catch (err) {
          // Se der erro, usar valores padrão
          console.error('Erro ao buscar flags do cliente:', err);
          setCongelado(congeladoInicial);
          setMostrarTextoCongelado(false);
        } finally {
          setLoadingFlags(false);
        }
      };

      buscarFlagsCliente();
    }
  }, [isOpen, produto, congeladoInicial, cliente]);

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
          nomeEtiqueta: nomeEtiqueta.trim() || produto,
          dataFabricacao,
          diasValidade,
          diasValidadeCongelado,
          congelado,
          mostrarTextoCongelado,
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

  if (!isOpen) return null;

  const isLoading = loading || loadingFlags;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {loadingFlags && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-white text-sm">Carregando informações do cliente...</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-icons">label</span>
            Gerar Etiqueta
            {loadingFlags && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
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

          {/* Nome na Etiqueta */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nome na Etiqueta
            </label>
            <input
              type="text"
              value={nomeEtiqueta}
              onChange={(e) => setNomeEtiqueta(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
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
              Dias de Validade (Temperatura Ambiente)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={diasValidade}
              onChange={(e) => setDiasValidade(parseInt(e.target.value) || 21)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Dias de Validade Congelado */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Dias de Validade (Congelado)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={diasValidadeCongelado}
              onChange={(e) => setDiasValidadeCongelado(parseInt(e.target.value) || 90)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Switch Validade Congelado */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Validade Congelado
            </label>
            <button
              type="button"
              onClick={() => setCongelado(!congelado)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                congelado ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              disabled={isLoading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  congelado ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Switch Congelado */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              Congelado
            </label>
            <button
              type="button"
              onClick={() => setMostrarTextoCongelado(!mostrarTextoCongelado)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mostrarTextoCongelado ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              disabled={isLoading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mostrarTextoCongelado ? 'translate-x-6' : 'translate-x-1'
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
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
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


