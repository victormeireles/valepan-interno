'use client';

import { useState, useEffect } from 'react';
import {
  createInsumo,
  updateInsumo,
  type Insumo,
} from '@/app/actions/insumos-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';

interface InsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumo?: Insumo;
  onSaved?: () => void;
}

export default function InsumoModal({
  isOpen,
  onClose,
  insumo,
  onSaved,
}: InsumoModalProps) {
  const [nome, setNome] = useState('');
  const [custoUnitario, setCustoUnitario] = useState(0);
  const [unidadeId, setUnidadeId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      if (insumo) {
        setNome(insumo.nome);
        setCustoUnitario(insumo.custo_unitario);
        setUnidadeId(insumo.unidade_id);
        setAtivo(insumo.ativo);
      } else {
        setNome('');
        setCustoUnitario(0);
        setUnidadeId('');
        setAtivo(true);
      }
      setError('');
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, insumo]);

  if (!isOpen && !animating) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!nome.trim()) {
        throw new Error('Nome é obrigatório');
      }

      if (custoUnitario < 0) {
        throw new Error('Custo unitário não pode ser negativo');
      }

      if (!unidadeId) {
        throw new Error('Unidade é obrigatória');
      }

      const payload = {
        nome: nome.trim(),
        custo_unitario: custoUnitario,
        unidade_id: unidadeId,
        ativo,
      };

      const response = insumo
        ? await updateInsumo({ id: insumo.id, ...payload })
        : await createInsumo(payload);

      if (!response.success) {
        throw new Error(response.error as string);
      }

      onSaved?.();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar insumo';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      if (!insumo) {
        setNome('');
        setCustoUnitario(0);
        setUnidadeId('');
        setAtivo(true);
      }
      setError('');
    }, 200);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {insumo ? 'Editar Insumo' : 'Novo Insumo'}
            </h2>
            <p className="text-sm text-gray-500">
              {insumo ? 'Atualize os dados do insumo.' : 'Preencha os dados para cadastrar.'}
            </p>
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
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-icons text-sm">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Ex: Farinha de Trigo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Custo Unitário <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={custoUnitario}
                    onChange={(e) => setCustoUnitario(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pl-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="0,00"
                    required
                  />
                </div>
                {custoUnitario > 0 && (
                  <p className="text-xs text-gray-500 ml-1">
                    {formatCurrency(custoUnitario)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Status
                </label>
                <div className="flex items-center h-[50px]">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Unidade <span className="text-red-500">*</span>
              </label>
              <SelectRemoteAutocomplete
                value={unidadeId}
                onChange={setUnidadeId}
                stage="unidades"
                label=""
                placeholder="Selecione a unidade..."
                required
              />
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
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span>{insumo ? 'Salvar Alterações' : 'Criar Insumo'}</span>
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

