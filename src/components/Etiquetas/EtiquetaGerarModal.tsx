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
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import {
  extractCalendarDate,
  formatISODateBr,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

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

const readOnlyInputClass = 'bg-stone-50 text-text-muted cursor-not-allowed';

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
    const fabricacao = extractCalendarDate(initialValues.dataFabricacao)
      || initialValues.dataFabricacao;
    setDataFabricacao(fabricacao);
    setOrdemProducaoId(initialValues.ordemProducaoId);

    void loadPrefill(
      initialValues.produtoId,
      initialValues.tipoEstoqueId,
      fabricacao,
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

  const handleBackdropClick = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-stone-900/50"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="etiqueta-modal-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="etiqueta-modal-title"
            className="flex items-center gap-2 text-xl font-semibold text-text-strong"
          >
            <span className="material-icons text-accent" aria-hidden>
              label
            </span>
            {title}
          </h2>
          <IconButton
            icon="close"
            label="Fechar"
            onClick={onClose}
            disabled={submitting}
          />
        </div>

        {error ? (
          <Toast tone="error" className="mb-4">
            {error}
          </Toast>
        ) : null}

        {loadingPrefill && mode !== 'manual' ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-accent motion-reduce:animate-none"
              aria-hidden
            />
            Carregando configurações...
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'manual' ? (
            <EtiquetaManualFormFields
              values={manualValues}
              onChange={setManualValues}
              disabled={isBusy}
            />
          ) : (
            <>
              <Input
                label="Produto"
                value={initialValues?.produtoNome ?? ''}
                readOnly
                className={readOnlyInputClass}
              />
              <Input
                label="Tipo de estoque"
                value={tipoEstoqueNome}
                readOnly
                className={readOnlyInputClass}
              />
              <Input
                label="Data de fabricação"
                value={formatISODateBr(dataFabricacao)}
                readOnly
                className={readOnlyInputClass}
              />
            </>
          )}

          {(produto || mode === 'manual') && (
            <>
              <Input
                id="nome-etiqueta"
                label="Nome na etiqueta"
                type="text"
                value={nomeEtiqueta}
                onChange={(e) => setNomeEtiqueta(e.target.value)}
                maxLength={120}
                disabled={isBusy || !produto}
              />

              <Input
                label="Lote"
                value={String(lote)}
                readOnly
                className={readOnlyInputClass}
              />

              <Input
                id="dias-validade"
                label="Dias de validade (ambiente)"
                type="number"
                min={1}
                max={365}
                value={diasValidade}
                onChange={(e) => setDiasValidade(parseInt(e.target.value, 10) || 21)}
                numeric
                disabled={isBusy || !produto}
              />

              <Input
                id="dias-validade-cong"
                label="Dias de validade (congelado)"
                type="number"
                min={1}
                max={365}
                value={diasValidadeCongelado}
                onChange={(e) =>
                  setDiasValidadeCongelado(parseInt(e.target.value, 10) || 90)
                }
                numeric
                disabled={isBusy || !produto}
              />

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
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon="print"
              fullWidth
              disabled={isBusy || !produto}
            >
              {submitting ? 'Gerando...' : 'Gerar e imprimir'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
