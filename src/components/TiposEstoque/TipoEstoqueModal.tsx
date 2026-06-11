'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  createTipoEstoque,
  deactivateTipoEstoque,
  updateTipoEstoque,
  type TipoEstoqueAdmin,
} from '@/app/actions/tipos-estoque-actions';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tipo?: TipoEstoqueAdmin;
  onSaved?: () => void;
};

const inputClassName =
  'w-full min-h-11 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all';

export default function TipoEstoqueModal({ isOpen, onClose, tipo, onSaved }: Props) {
  const titleId = useId();
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [possuiEtiqueta, setPossuiEtiqueta] = useState(false);
  const [congelado, setCongelado] = useState(false);
  const [mostrarTextoCongelado, setMostrarTextoCongelado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [animating, setAnimating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef('');

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const next = {
        nome: tipo?.nome ?? '',
        ativo: tipo?.ativo ?? true,
        possuiEtiqueta: tipo?.possui_etiqueta ?? false,
        congelado: tipo?.congelado ?? false,
        mostrarTextoCongelado: tipo?.mostrar_texto_congelado ?? false,
      };
      setNome(next.nome);
      setAtivo(next.ativo);
      setPossuiEtiqueta(next.possuiEtiqueta);
      setCongelado(next.congelado);
      setMostrarTextoCongelado(next.mostrarTextoCongelado);
      setError('');
      setFieldErrors({});
      setDirty(false);
      initialSnapshot.current = JSON.stringify(next);
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, tipo]);

  useEffect(() => {
    if (!isOpen) return;
    const current = JSON.stringify({
      nome,
      ativo,
      possuiEtiqueta,
      congelado,
      mostrarTextoCongelado,
    });
    setDirty(current !== initialSnapshot.current);
  }, [isOpen, nome, ativo, possuiEtiqueta, congelado, mostrarTextoCongelado]);

  if (!isOpen && !animating) return null;

  const validateClient = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!nome.trim()) errors.nome = 'Nome é obrigatório';
    return errors;
  };

  const handleClose = () => {
    if (dirty && !confirm('Descartar alterações não salvas?')) return;
    onClose();
  };

  const buildPayload = () => ({
    nome: nome.trim(),
    ativo,
    possui_etiqueta: possuiEtiqueta,
    congelado,
    mostrar_texto_congelado: mostrarTextoCongelado,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateClient();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = tipo
        ? await updateTipoEstoque(tipo.id, buildPayload())
        : await createTipoEstoque(buildPayload());

      if (!response.success) throw new Error(response.error);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar tipo de estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!tipo) return;
    if (!confirm('Desativar este tipo de estoque?')) return;

    setLoading(true);
    setError('');
    try {
      const response = await deactivateTipoEstoque(tipo.id);
      if (!response.success) throw new Error(response.error);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar tipo de estoque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden transition-all duration-300 transform max-h-[90dvh] flex flex-col ${
          isOpen ? 'translate-y-0 md:scale-100' : 'translate-y-4 md:scale-95'
        }`}
      >
        <div className="bg-gray-50/50 px-6 md:px-8 py-5 border-b border-gray-100 flex justify-between items-start gap-4 shrink-0">
          <div>
            <h2 id={titleId} className="text-xl md:text-2xl font-bold text-gray-900">
              {tipo ? 'Editar tipo de estoque' : 'Novo tipo de estoque'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure regras de etiqueta e armazenamento para cada destino de estoque.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 flex-1">
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <span className="material-icons text-sm">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="tipo-nome" className="text-sm font-semibold text-gray-700 ml-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                id="tipo-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClassName}
                maxLength={100}
                required
              />
              {fieldErrors.nome && (
                <p role="alert" className="text-xs text-rose-600 ml-1">
                  {fieldErrors.nome}
                </p>
              )}
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-900 mb-1">Regras de etiqueta</legend>

              <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={possuiEtiqueta}
                  onChange={(e) => setPossuiEtiqueta(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">Possui etiqueta</span>
              </label>

              <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={congelado}
                  onChange={(e) => setCongelado(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">Congelado</span>
              </label>

              <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarTextoCongelado}
                  onChange={(e) => setMostrarTextoCongelado(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Mostrar texto indicando congelado na etiqueta
                </span>
              </label>
            </fieldset>

            <label className="flex min-h-11 items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Tipo ativo</span>
            </label>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
              {tipo && tipo.ativo && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={loading}
                  className="sm:mr-auto min-h-11 px-4 py-3 text-sm font-semibold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-all disabled:opacity-50"
                >
                  Desativar
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 min-h-11 px-6 py-3 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] min-h-11 px-6 py-3 text-white bg-gray-900 rounded-xl font-semibold shadow-lg hover:bg-gray-800 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span>{tipo ? 'Salvar alterações' : 'Criar tipo'}</span>
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
