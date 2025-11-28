'use client';

import { useState, useEffect } from 'react';
import { createProductionOrder } from '@/app/actions/producao-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';

interface NovaOrdemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NovaOrdemModal({ isOpen, onClose }: NovaOrdemModalProps) {
  const [produtoId, setProdutoId] = useState('');
  const [qtdPlanejada, setQtdPlanejada] = useState(1);
  const [prioridade, setPrioridade] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !animating) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!produtoId) {
      setError('Selecione um produto');
      setLoading(false);
      return;
    }

    try {
      const res = await createProductionOrder({
        produtoId,
        qtdPlanejada,
        prioridade
      });

      if (!res.success) {
        throw new Error(res.error as string);
      }

      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar ordem';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setProdutoId('');
      setQtdPlanejada(1);
      setPrioridade(0);
      setError('');
    }, 200);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {/* Header */}
        <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nova Ordem</h2>
            <p className="text-sm text-gray-500">Preencha os dados para iniciar.</p>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2 animate-shake">
              <span className="material-icons text-sm">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Produto</label>
              <div className="relative">
                <SelectRemoteAutocomplete
                  value={produtoId}
                  onChange={setProdutoId}
                  stage="produtos"
                  label="" 
                  placeholder="Busque o produto..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Quantidade</label>
                <div className="relative group">
                  <input
                    type="number"
                    min="1"
                    value={qtdPlanejada}
                    onChange={(e) => setQtdPlanejada(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">un</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Prioridade</label>
                <div className="relative">
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value={0}>Normal</option>
                    <option value={1}>Alta</option>
                    <option value={2}>Urgente</option>
                  </select>
                  <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] px-6 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <span>Criar Ordem</span>
                    <span className="material-icons text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
