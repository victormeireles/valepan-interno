'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  createAssadeira,
  deactivateAssadeira,
  updateAssadeira,
  type Assadeira,
} from '@/app/actions/assadeiras-actions';
import AssadeiraCapacityPreview from '@/components/Assadeiras/AssadeiraCapacityPreview';

type AssadeiraModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assadeira?: Assadeira;
  onSaved?: () => void;
};

type FieldErrors = Partial<Record<string, string>>;

const inputClassName =
  'w-full min-h-11 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all';

export default function AssadeiraModal({
  isOpen,
  onClose,
  assadeira,
  onSaved,
}: AssadeiraModalProps) {
  const titleId = useId();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidadesPorAssadeira, setUnidadesPorAssadeira] = useState(1);
  const [quantidade, setQuantidade] = useState(0);
  const [ordem, setOrdem] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [diametro, setDiametro] = useState<number | ''>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [animating, setAnimating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef('');

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const next = {
        nome: assadeira?.nome ?? '',
        descricao: assadeira?.descricao ?? '',
        unidadesPorAssadeira: assadeira?.unidades_por_assadeira ?? 1,
        quantidade: assadeira?.quantidade ?? 0,
        ordem: assadeira?.ordem ?? 0,
        ativo: assadeira?.ativo ?? true,
        diametro: (assadeira?.diametro_buracos_mm ?? '') as number | '',
      };
      setNome(next.nome);
      setDescricao(next.descricao);
      setUnidadesPorAssadeira(next.unidadesPorAssadeira);
      setQuantidade(next.quantidade);
      setOrdem(next.ordem);
      setAtivo(next.ativo);
      setDiametro(next.diametro);
      setShowAdvanced(Boolean(assadeira?.diametro_buracos_mm || (assadeira?.ordem ?? 0) > 0));
      setError('');
      setFieldErrors({});
      setDirty(false);
      initialSnapshot.current = JSON.stringify(next);
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, assadeira]);

  useEffect(() => {
    if (!isOpen) return;
    const current = JSON.stringify({
      nome,
      descricao,
      unidadesPorAssadeira,
      quantidade,
      ordem,
      ativo,
      diametro,
    });
    setDirty(current !== initialSnapshot.current);
  }, [
    isOpen,
    nome,
    descricao,
    unidadesPorAssadeira,
    quantidade,
    ordem,
    ativo,
    diametro,
  ]);

  if (!isOpen && !animating) return null;

  const validateClient = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!nome.trim()) errors.nome = 'Nome é obrigatório';
    if (!Number.isInteger(unidadesPorAssadeira) || unidadesPorAssadeira < 1) {
      errors.unidades_por_assadeira = 'Informe ao menos 1 pão por assadeira';
    }
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      errors.quantidade = 'Quantidade não pode ser negativa';
    }
    if (diametro !== '' && (typeof diametro !== 'number' || diametro <= 0)) {
      errors.diametro_buracos_mm = 'Diâmetro deve ser positivo';
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
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      unidades_por_assadeira: unidadesPorAssadeira,
      quantidade,
      ordem,
      ativo,
      diametro_buracos_mm: diametro === '' ? null : diametro,
    };

    try {
      const response = assadeira
        ? await updateAssadeira(assadeira.id, payload)
        : await createAssadeira(payload);

      if (!response.success) {
        throw new Error(response.error);
      }

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar assadeira');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!assadeira) return;
    if (!confirm(`Desativar a assadeira "${assadeira.nome}"?`)) return;

    setLoading(true);
    setError('');
    try {
      const response = await deactivateAssadeira(assadeira.id);
      if (!response.success) throw new Error(response.error);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar assadeira');
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
              {assadeira ? 'Editar assadeira' : 'Nova assadeira'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {assadeira
                ? 'Atualize tipo, capacidade e estoque.'
                : 'Cadastre um tipo de assadeira.'}
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

          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-900 mb-2">
                Identificação
              </legend>
              <div className="space-y-1.5">
                <label htmlFor="assadeira-nome" className="text-sm font-semibold text-gray-700 ml-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  id="assadeira-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onBlur={() => setFieldErrors((prev) => ({ ...prev, ...validateClient() }))}
                  className={inputClassName}
                  required
                />
                {fieldErrors.nome && (
                  <p role="alert" className="text-xs text-rose-600 ml-1">
                    {fieldErrors.nome}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assadeira-descricao" className="text-sm font-semibold text-gray-700 ml-1">
                  Descrição
                </label>
                <textarea
                  id="assadeira-descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className={inputClassName}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-900 mb-2">
                Capacidade
              </legend>
              <div className="space-y-1.5">
                <label
                  htmlFor="assadeira-paes"
                  className="text-sm font-semibold text-gray-700 ml-1"
                >
                  Pães por assadeira <span className="text-red-500">*</span>
                </label>
                <input
                  id="assadeira-paes"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={unidadesPorAssadeira}
                  onChange={(e) =>
                    setUnidadesPorAssadeira(parseInt(e.target.value, 10) || 0)
                  }
                  className={`${inputClassName} tabular-nums`}
                  required
                />
                {fieldErrors.unidades_por_assadeira && (
                  <p role="alert" className="text-xs text-rose-600 ml-1">
                    {fieldErrors.unidades_por_assadeira}
                  </p>
                )}
              </div>
              <AssadeiraCapacityPreview paesPorAssadeira={unidadesPorAssadeira} />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-900 mb-2">
                Estoque
              </legend>
              <div className="space-y-1.5">
                <label
                  htmlFor="assadeira-quantidade"
                  className="text-sm font-semibold text-gray-700 ml-1"
                >
                  Quantidade de assadeiras <span className="text-red-500">*</span>
                </label>
                <input
                  id="assadeira-quantidade"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 0)}
                  className={`${inputClassName} tabular-nums`}
                  required
                />
                {fieldErrors.quantidade && (
                  <p role="alert" className="text-xs text-rose-600 ml-1">
                    {fieldErrors.quantidade}
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-700"
                aria-expanded={showAdvanced}
              >
                <span className="material-icons text-base">
                  {showAdvanced ? 'expand_less' : 'expand_more'}
                </span>
                Configuração avançada
              </button>
              {showAdvanced && (
                <div className="space-y-4 pl-1">
                  <div className="space-y-1.5">
                    <label htmlFor="assadeira-ordem" className="text-sm font-semibold text-gray-700 ml-1">
                      Ordem de exibição
                    </label>
                    <input
                      id="assadeira-ordem"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={ordem}
                      onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 0)}
                      className={`${inputClassName} tabular-nums`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="assadeira-diametro" className="text-sm font-semibold text-gray-700 ml-1">
                      Diâmetro do pão (mm)
                    </label>
                    <input
                      id="assadeira-diametro"
                      type="number"
                      min={0}
                      step={0.1}
                      inputMode="decimal"
                      value={diametro}
                      onChange={(e) =>
                        setDiametro(e.target.value === '' ? '' : parseFloat(e.target.value))
                      }
                      className={`${inputClassName} tabular-nums`}
                    />
                    {fieldErrors.diametro_buracos_mm && (
                      <p role="alert" className="text-xs text-rose-600 ml-1">
                        {fieldErrors.diametro_buracos_mm}
                      </p>
                    )}
                  </div>
                  <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Ativa</span>
                  </label>
                </div>
              )}
            </fieldset>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
              {assadeira && assadeira.ativo && (
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
                    <span>{assadeira ? 'Salvar alterações' : 'Criar assadeira'}</span>
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
