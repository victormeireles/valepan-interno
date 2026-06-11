'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildLegacyEtiquetaGerarBody } from '@/domain/etiquetas/etiqueta-legacy-payload';
import {
  resolveEtiquetaConfig,
  type EtiquetaProdutoInput,
  type EtiquetaTipoInput,
} from '@/domain/etiquetas/etiqueta-resolver';
import EtiquetaManualFormFields, {
  type ManualFormValues,
} from '@/components/Etiquetas/EtiquetaManualFormFields';
import EtiquetaModalToggleField from '@/components/Etiquetas/EtiquetaModalToggleField';
import { loadEtiquetaPrefillData } from '@/components/Etiquetas/etiqueta-prefill-loader';
import { formatISODateBr, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export type EtiquetaGerarModalMode = 'fila' | 'manual' | 'reimprimir';

export type EtiquetaGerarInitialValues = {
  produtoId: string;
  produtoNome: string;
  tipoEstoqueId: string;
  tipoEstoqueNome: string;
  dataFabricacao: string;
  ordemProducaoId?: string;
};

type EtiquetaGerarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: EtiquetaGerarModalMode;
  initialValues?: EtiquetaGerarInitialValues;
  onSuccess?: () => void;
};

const scrimClass = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
const panelClass = 'bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto';
const inputClass =
  'min-h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const readOnlyClass =
  'min-h-11 w-full rounded-lg border border-gray-300 px-3 bg-gray-50 text-gray-600 cursor-not-allowed';
const labelClass = 'text-sm font-medium text-gray-700';
const primaryButtonClass =
  'min-h-11 inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryButtonClass =
  'min-h-11 inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50';

export default function EtiquetaGerarModal({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSuccess,
}: EtiquetaGerarModalProps) {
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [produto, setProduto] = useState<EtiquetaProdutoInput | null>(null);
  const [tipo, setTipo] = useState<EtiquetaTipoInput | null>(null);
  const [produtoId, setProdutoId] = useState('');
  const [tipoEstoqueId, setTipoEstoqueId] = useState('');
  const [tipoEstoqueNome, setTipoEstoqueNome] = useState('');
  const [dataFabricacao, setDataFabricacao] = useState('');
  const [ordemProducaoId, setOrdemProducaoId] = useState<string | undefined>();

  const [nomeEtiqueta, setNomeEtiqueta] = useState('');
  const [diasValidade, setDiasValidade] = useState(21);
  const [diasValidadeCongelado, setDiasValidadeCongelado] = useState(90);
  const [congelado, setCongelado] = useState(false);
  const [mostrarTextoCongelado, setMostrarTextoCongelado] = useState(false);
  const [lote, setLote] = useState(0);

  const [manualValues, setManualValues] = useState<ManualFormValues>({
    produtoId: '',
    produtoNome: '',
    tipoEstoqueId: '',
    tipoEstoqueNome: '',
    dataFabricacao: '',
  });

  const applyResolved = useCallback(
    (
      produtoInput: EtiquetaProdutoInput,
      tipoInput: EtiquetaTipoInput,
      fabricacao: string,
    ) => {
      const resolved = resolveEtiquetaConfig({
        produto: produtoInput,
        tipo: tipoInput,
        dataFabricacao: fabricacao,
      });
      setNomeEtiqueta(resolved.nomeEtiqueta);
      setDiasValidade(resolved.diasValidade);
      setDiasValidadeCongelado(resolved.diasValidadeCongelado);
      setCongelado(resolved.congelado);
      setMostrarTextoCongelado(resolved.mostrarTextoCongelado);
      setLote(resolved.lote);
    },
    [],
  );

  const loadPrefill = useCallback(
    async (prodId: string, tipoId: string, fabricacao: string) => {
      setLoadingPrefill(true);
      setError(null);
      try {
        const { produto: produtoInput, tipo: tipoInput } = await loadEtiquetaPrefillData(
          prodId,
          tipoId,
        );
        setProduto(produtoInput);
        setTipo(tipoInput);
        applyResolved(produtoInput, tipoInput, fabricacao);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoadingPrefill(false);
      }
    },
    [applyResolved],
  );

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSubmitting(false);

    if (mode === 'manual') {
      setProduto(null);
      setTipo(null);
      setProdutoId('');
      setTipoEstoqueId('');
      setTipoEstoqueNome('');
      setDataFabricacao(getTodayISOInBrazilTimezone());
      setOrdemProducaoId(undefined);
      setNomeEtiqueta('');
      setDiasValidade(21);
      setDiasValidadeCongelado(90);
      setCongelado(false);
      setMostrarTextoCongelado(false);
      setLote(0);
      setManualValues({
        produtoId: '',
        produtoNome: '',
        tipoEstoqueId: '',
        tipoEstoqueNome: '',
        dataFabricacao: getTodayISOInBrazilTimezone(),
      });
      return;
    }

    if (!initialValues) return;

    setProdutoId(initialValues.produtoId);
    setTipoEstoqueId(initialValues.tipoEstoqueId);
    setTipoEstoqueNome(initialValues.tipoEstoqueNome);
    setDataFabricacao(initialValues.dataFabricacao);
    setOrdemProducaoId(initialValues.ordemProducaoId);

    void loadPrefill(
      initialValues.produtoId,
      initialValues.tipoEstoqueId,
      initialValues.dataFabricacao,
    );
  }, [isOpen, mode, initialValues, loadPrefill]);

  useEffect(() => {
    if (!isOpen || mode !== 'manual') return;
    if (!manualValues.produtoId || !manualValues.tipoEstoqueId || !manualValues.dataFabricacao) {
      return;
    }

    setProdutoId(manualValues.produtoId);
    setTipoEstoqueId(manualValues.tipoEstoqueId);
    setTipoEstoqueNome(manualValues.tipoEstoqueNome);
    setDataFabricacao(manualValues.dataFabricacao);
    setOrdemProducaoId(undefined);

    void loadPrefill(
      manualValues.produtoId,
      manualValues.tipoEstoqueId,
      manualValues.dataFabricacao,
    );
  }, [isOpen, mode, manualValues, loadPrefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto || !tipo || !dataFabricacao) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resolved = resolveEtiquetaConfig({
        produto,
        tipo,
        dataFabricacao,
        overrides: {
          nomeEtiqueta,
          diasValidade,
          diasValidadeCongelado,
        },
      });

      const body = buildLegacyEtiquetaGerarBody({
        produtoNome: produto.nome,
        tipoEstoqueNome,
        dataFabricacao,
        resolved: {
          nomeEtiqueta: resolved.nomeEtiqueta,
          diasValidade: resolved.diasValidade,
          diasValidadeCongelado: resolved.diasValidadeCongelado,
          congelado,
          mostrarTextoCongelado,
          lote: resolved.lote,
        },
      });

      const gerarRes = await fetch('/api/etiqueta/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const gerarData = await gerarRes.json();

      if (!gerarRes.ok) {
        throw new Error(gerarData.error || 'Erro ao gerar etiqueta');
      }

      const blob = new Blob([gerarData.html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');

      if (mode !== 'reimprimir') {
        const registrarRes = await fetch('/api/etiquetas/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ordemProducaoId: mode === 'fila' ? ordemProducaoId : undefined,
            produtoId,
            tipoEstoqueId,
            dataFabricacao,
            modo: mode === 'manual' ? 'manual' : 'pedido',
          }),
        });
        const registrarData = await registrarRes.json();
        if (!registrarRes.ok) {
          throw new Error(registrarData.error || 'Erro ao registrar etiqueta');
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar etiqueta');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isBusy = loadingPrefill || submitting;
  const title =
    mode === 'manual'
      ? 'Gerar etiqueta manual'
      : mode === 'reimprimir'
        ? 'Reimprimir etiqueta'
        : 'Gerar etiqueta';

  return (
    <div className={scrimClass} role="dialog" aria-modal="true" aria-labelledby="etiqueta-modal-title">
      <div className={panelClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="etiqueta-modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icons" aria-hidden>
              label
            </span>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Fechar"
            disabled={submitting}
          >
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
          >
            {error}
          </div>
        )}

        {loadingPrefill && mode !== 'manual' && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
            Carregando configurações...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'manual' ? (
            <EtiquetaManualFormFields
              values={manualValues}
              onChange={setManualValues}
              disabled={isBusy}
            />
          ) : (
            <>
              <div>
                <label className={`block mb-1 ${labelClass}`}>Produto</label>
                <input
                  type="text"
                  value={initialValues?.produtoNome ?? ''}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
              <div>
                <label className={`block mb-1 ${labelClass}`}>Tipo de estoque</label>
                <input
                  type="text"
                  value={tipoEstoqueNome}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
              <div>
                <label className={`block mb-1 ${labelClass}`}>Data de fabricação</label>
                <input
                  type="text"
                  value={formatISODateBr(dataFabricacao)}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
            </>
          )}

          {(produto || mode === 'manual') && (
            <>
              <div>
                <label htmlFor="nome-etiqueta" className={`block mb-1 ${labelClass}`}>
                  Nome na etiqueta
                </label>
                <input
                  id="nome-etiqueta"
                  type="text"
                  value={nomeEtiqueta}
                  onChange={(e) => setNomeEtiqueta(e.target.value)}
                  maxLength={120}
                  className={inputClass}
                  disabled={isBusy || !produto}
                />
              </div>

              <div>
                <label className={`block mb-1 ${labelClass}`}>Lote</label>
                <input type="text" value={lote} readOnly className={readOnlyClass} />
              </div>

              <div>
                <label htmlFor="dias-validade" className={`block mb-1 ${labelClass}`}>
                  Dias de validade (ambiente)
                </label>
                <input
                  id="dias-validade"
                  type="number"
                  min={1}
                  max={365}
                  value={diasValidade}
                  onChange={(e) => setDiasValidade(parseInt(e.target.value, 10) || 21)}
                  className={inputClass}
                  disabled={isBusy || !produto}
                />
              </div>

              <div>
                <label htmlFor="dias-validade-cong" className={`block mb-1 ${labelClass}`}>
                  Dias de validade (congelado)
                </label>
                <input
                  id="dias-validade-cong"
                  type="number"
                  min={1}
                  max={365}
                  value={diasValidadeCongelado}
                  onChange={(e) =>
                    setDiasValidadeCongelado(parseInt(e.target.value, 10) || 90)
                  }
                  className={inputClass}
                  disabled={isBusy || !produto}
                />
              </div>

              <EtiquetaModalToggleField
                label="Validade congelado"
                checked={congelado}
                onChange={setCongelado}
                disabled={isBusy || !produto}
              />

              <EtiquetaModalToggleField
                label="Texto congelado na etiqueta"
                checked={mostrarTextoCongelado}
                onChange={setMostrarTextoCongelado}
                disabled={isBusy || !produto}
              />
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={secondaryButtonClass}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={isBusy || !produto}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Gerando...
                </>
              ) : (
                <>
                  <span className="material-icons text-base" aria-hidden>
                    print
                  </span>
                  Gerar e imprimir
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
