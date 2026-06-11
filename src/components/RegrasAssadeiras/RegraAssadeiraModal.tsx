'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import {
  createCategoriaAssadeiraRegra,
  deactivateCategoriaAssadeiraRegra,
  updateCategoriaAssadeiraRegra,
  type CategoriaAssadeiraRegra,
  type CategoriaOption,
} from '@/app/actions/categoria-assadeira-regras-actions';
import AssadeiraCapacityPreview from '@/components/Assadeiras/AssadeiraCapacityPreview';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  regra?: CategoriaAssadeiraRegra;
  categorias: CategoriaOption[];
  assadeirasAtivas: Assadeira[];
  onSaved?: () => void;
};

const inputClassName =
  'w-full min-h-11 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all';

export default function RegraAssadeiraModal({
  isOpen,
  onClose,
  regra,
  categorias,
  assadeirasAtivas,
  onSaved,
}: Props) {
  const titleId = useId();
  const [categoriaId, setCategoriaId] = useState('');
  const [pesoG, setPesoG] = useState<number | ''>('');
  const [assadeiraId, setAssadeiraId] = useState('');
  const [usarPadrao, setUsarPadrao] = useState(true);
  const [override, setOverride] = useState<number | ''>('');
  const [ordem, setOrdem] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [animating, setAnimating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef('');

  const selectedAssadeira = useMemo(
    () => assadeirasAtivas.find((a) => a.id === assadeiraId) ?? null,
    [assadeirasAtivas, assadeiraId],
  );

  const fatorEfetivo = resolveUnidadesPorAssadeiraEfetiva({
    produto: usarPadrao ? null : override === '' ? null : override,
    assadeira: selectedAssadeira?.unidades_por_assadeira,
  });

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const next = {
        categoriaId: regra?.categoria_id ?? categorias[0]?.id ?? '',
        pesoG: regra?.peso_g ?? '',
        assadeiraId: regra?.assadeira_id ?? assadeirasAtivas[0]?.id ?? '',
        usarPadrao: regra ? regra.unidades_por_assadeira == null : true,
        override: regra?.unidades_por_assadeira ?? '',
        ordem: regra?.ordem ?? 0,
        ativo: regra?.ativo ?? true,
      };
      setCategoriaId(next.categoriaId);
      setPesoG(next.pesoG as number | '');
      setAssadeiraId(next.assadeiraId);
      setUsarPadrao(next.usarPadrao);
      setOverride(next.override as number | '');
      setOrdem(next.ordem);
      setAtivo(next.ativo);
      setError('');
      setFieldErrors({});
      setDirty(false);
      initialSnapshot.current = JSON.stringify(next);
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, regra, categorias, assadeirasAtivas]);

  useEffect(() => {
    if (!isOpen) return;
    const current = JSON.stringify({
      categoriaId,
      pesoG,
      assadeiraId,
      usarPadrao,
      override,
      ordem,
      ativo,
    });
    setDirty(current !== initialSnapshot.current);
  }, [isOpen, categoriaId, pesoG, assadeiraId, usarPadrao, override, ordem, ativo]);

  if (!isOpen && !animating) return null;

  const validateClient = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!categoriaId) errors.categoria_id = 'Selecione uma categoria';
    if (pesoG === '' || !Number.isInteger(pesoG) || pesoG < 1) {
      errors.peso_g = 'Informe o peso em gramas (mínimo 1 g)';
    }
    if (!assadeiraId) errors.assadeira_id = 'Selecione uma assadeira';
    if (!usarPadrao) {
      if (override === '' || !Number.isInteger(override) || override < 1) {
        errors.unidades_por_assadeira = 'Informe ao menos 1 pão por assadeira';
      }
    }
    return errors;
  };

  const handleClose = () => {
    if (dirty && !confirm('Descartar alterações não salvas?')) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateClient();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError('');

    const payload = {
      categoria_id: categoriaId,
      peso_g: pesoG as number,
      assadeira_id: assadeiraId,
      usar_padrao: usarPadrao,
      unidades_por_assadeira: usarPadrao ? null : (override as number),
      ordem,
      ativo,
    };

    try {
      const response = regra
        ? await updateCategoriaAssadeiraRegra(regra.id, payload)
        : await createCategoriaAssadeiraRegra(payload);

      if (!response.success) throw new Error(response.error);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar regra');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!regra) return;
    if (!confirm('Desativar esta regra de assadeira?')) return;

    setLoading(true);
    setError('');
    try {
      const response = await deactivateCategoriaAssadeiraRegra(regra.id);
      if (!response.success) throw new Error(response.error);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar regra');
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
              {regra ? 'Editar regra' : 'Nova regra'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Vincule categoria + peso a um tipo de assadeira.
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
              <label htmlFor="regra-categoria" className="text-sm font-semibold text-gray-700 ml-1">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                id="regra-categoria"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className={inputClassName}
                required
              >
                {categorias.length === 0 ? (
                  <option value="">Nenhuma categoria ativa</option>
                ) : (
                  categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))
                )}
              </select>
              {fieldErrors.categoria_id && (
                <p role="alert" className="text-xs text-rose-600 ml-1">
                  {fieldErrors.categoria_id}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="regra-peso" className="text-sm font-semibold text-gray-700 ml-1">
                Peso (g) <span className="text-red-500">*</span>
              </label>
              <input
                id="regra-peso"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={pesoG}
                onChange={(e) =>
                  setPesoG(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                className={`${inputClassName} tabular-nums`}
                required
              />
              {fieldErrors.peso_g && (
                <p role="alert" className="text-xs text-rose-600 ml-1">
                  {fieldErrors.peso_g}
                </p>
              )}
              <p className="text-xs text-gray-500 ml-1">
                Gramas inteiras. Deve coincidir com o peso resolvido do produto (ERP ou nome).
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="regra-assadeira" className="text-sm font-semibold text-gray-700 ml-1">
                Assadeira <span className="text-red-500">*</span>
              </label>
              <select
                id="regra-assadeira"
                value={assadeiraId}
                onChange={(e) => setAssadeiraId(e.target.value)}
                className={inputClassName}
                required
              >
                {assadeirasAtivas.length === 0 ? (
                  <option value="">Nenhuma assadeira ativa</option>
                ) : (
                  assadeirasAtivas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))
                )}
              </select>
              {fieldErrors.assadeira_id && (
                <p role="alert" className="text-xs text-rose-600 ml-1">
                  {fieldErrors.assadeira_id}
                </p>
              )}
            </div>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-900 mb-2">
                Pães por assadeira
              </legend>
              <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarPadrao}
                  onChange={(e) => setUsarPadrao(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Usar padrão da assadeira
                  {selectedAssadeira?.unidades_por_assadeira != null && (
                    <span className="text-gray-500">
                      {' '}
                      ({selectedAssadeira.unidades_por_assadeira} pães)
                    </span>
                  )}
                </span>
              </label>
              {!usarPadrao && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="regra-override"
                    className="text-sm font-semibold text-gray-700 ml-1"
                  >
                    Override <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="regra-override"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={override}
                    onChange={(e) =>
                      setOverride(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className={`${inputClassName} tabular-nums`}
                  />
                  {fieldErrors.unidades_por_assadeira && (
                    <p role="alert" className="text-xs text-rose-600 ml-1">
                      {fieldErrors.unidades_por_assadeira}
                    </p>
                  )}
                </div>
              )}
              {fatorEfetivo != null && (
                <AssadeiraCapacityPreview paesPorAssadeira={fatorEfetivo} />
              )}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="regra-ordem" className="text-sm font-semibold text-gray-700 ml-1">
                Ordem de prioridade
              </label>
              <input
                id="regra-ordem"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 0)}
                className={`${inputClassName} tabular-nums`}
              />
            </div>

            <label className="flex min-h-11 items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Regra ativa</span>
            </label>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
              {regra && regra.ativo && (
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
                disabled={loading || categorias.length === 0 || assadeirasAtivas.length === 0}
                className="flex-[2] min-h-11 px-6 py-3 text-white bg-gray-900 rounded-xl font-semibold shadow-lg hover:bg-gray-800 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span>{regra ? 'Salvar alterações' : 'Criar regra'}</span>
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
