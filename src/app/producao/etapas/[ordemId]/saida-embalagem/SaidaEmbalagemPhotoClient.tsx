'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUploader from '@/components/PhotoUploader';
import {
  appendFotoToSaidaEmbalagemStepLog,
  upsertSaidaEmbalagemCaixasRecebidas,
} from '@/app/actions/producao-etapas-actions';
import type { MetaCaixasSaidaEmbalagem } from '@/lib/utils/production-conversions';
import {
  CARD_FORM_BLOCK,
  FORM_FIELD_LABEL,
  FORM_SECTION_TITLE,
  INPUT_COMPACT_LINE,
} from '@/components/Producao/production-step-form-classes';

type Props = {
  ordemProducaoId: string;
  produtoNome: string;
  metaCaixas: MetaCaixasSaidaEmbalagem;
  initialCaixasRecebidas: number | null;
};

export default function SaidaEmbalagemPhotoClient({
  ordemProducaoId,
  produtoNome,
  metaCaixas,
  initialCaixasRecebidas,
}: Props) {
  const router = useRouter();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaderKey, setUploaderKey] = useState(0);

  const [caixasField, setCaixasField] = useState(
    initialCaixasRecebidas != null ? String(initialCaixasRecebidas) : '',
  );
  const [savingCaixas, setSavingCaixas] = useState(false);
  const [caixasMessage, setCaixasMessage] = useState<string | null>(null);
  const [caixasError, setCaixasError] = useState<string | null>(null);

  useEffect(() => {
    setCaixasField(initialCaixasRecebidas != null ? String(initialCaixasRecebidas) : '');
  }, [initialCaixasRecebidas]);

  const handleSalvarCaixas = async () => {
    const raw = caixasField.trim();
    if (raw === '') {
      setCaixasError('Informe quantas caixas foram entregues (use 0 se necessário).');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setCaixasError('Use um número inteiro maior ou igual a zero.');
      return;
    }
    setSavingCaixas(true);
    setCaixasError(null);
    setCaixasMessage(null);
    try {
      const res = await upsertSaidaEmbalagemCaixasRecebidas({
        ordem_producao_id: ordemProducaoId,
        caixas_recebidas: n,
      });
      if (!res.success) {
        throw new Error(res.error || 'Falha ao salvar');
      }
      setCaixasMessage('Quantidade de caixas entregues salva.');
      router.refresh();
    } catch (e) {
      setCaixasError(e instanceof Error ? e.message : 'Erro ao salvar contagem.');
    } finally {
      setSavingCaixas(false);
    }
  };

  const handleSalvarFoto = async () => {
    if (!photoFile) {
      setError('Selecione ou tire uma foto antes de salvar.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      fd.append('etapa', 'saida_embalagem');
      fd.append('ordemProducaoId', ordemProducaoId);

      const uploadRes = await fetch('/api/upload/producao-photo', {
        method: 'POST',
        body: fd,
      });
      const uploadJson: { error?: string; photoUrl?: string } = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || 'Falha ao enviar foto');
      }
      if (!uploadJson.photoUrl) {
        throw new Error('Upload sem URL de foto retornada');
      }

      const appendRes = await appendFotoToSaidaEmbalagemStepLog({
        ordem_producao_id: ordemProducaoId,
        photoUrl: uploadJson.photoUrl,
      });
      if (!appendRes.success) {
        throw new Error(appendRes.error || 'Falha ao vincular foto ao lote');
      }

      setMessage('Foto do lote salva com sucesso na etapa de saída da embalagem.');
      setPhotoFile(null);
      setUploaderKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar foto do lote.');
    } finally {
      setSaving(false);
    }
  };

  const informado =
    caixasField.trim() === '' ? null : Math.round(Number(caixasField));
  const metaNum = metaCaixas.caixasEsperadas;
  const comparavel =
    metaNum != null && informado != null && Number.isFinite(informado);
  const diff = comparavel && metaNum != null ? informado - metaNum : null;
  const igualAoPlanejado =
    comparavel && metaNum != null && Math.abs(informado! - metaNum) < 0.001;

  return (
    <div className="mt-2 space-y-2">
      <div className={`${CARD_FORM_BLOCK} border-slate-200`}>
        <p className={FORM_SECTION_TITLE}>Caixas</p>
        <p className="sr-only">Conferir com o esperado do lote.</p>

        <div className="flex flex-wrap items-baseline gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
            Esperado
          </span>
          <span className="text-base font-semibold tabular-nums text-slate-900 sm:text-lg">{metaCaixas.resumo}</span>
        </div>
        {metaCaixas.subtexto && (
          <p className="text-[11px] leading-snug text-slate-500 sm:text-xs">{metaCaixas.subtexto}</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className={FORM_FIELD_LABEL} htmlFor="saida-embalagem-caixas">
              Entregues
            </label>
            <input
              id="saida-embalagem-caixas"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={savingCaixas}
              value={caixasField}
              onChange={(e) => {
                setCaixasField(e.target.value);
                setCaixasError(null);
                setCaixasMessage(null);
              }}
              className={`${INPUT_COMPACT_LINE} tabular-nums`}
              placeholder="0"
            />
          </div>
          <button
            type="button"
            disabled={savingCaixas}
            onClick={() => void handleSalvarCaixas()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60 sm:text-sm"
          >
            {savingCaixas ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                …
              </>
            ) : (
              'Salvar'
            )}
          </button>
        </div>

        {comparavel && diff != null && !igualAoPlanejado && (
          <p
            className={`text-xs font-medium tabular-nums sm:text-sm ${
              diff < 0 ? 'text-amber-800' : 'text-sky-800'
            }`}
          >
            Δ {diff > 0 ? '+' : ''}
            {Number.isInteger(diff) ? diff : Math.round(diff * 100) / 100} cx
          </p>
        )}
        {comparavel && igualAoPlanejado && (
          <p className="text-xs font-medium text-emerald-800 sm:text-sm">Igual ao planejado.</p>
        )}

        {caixasMessage && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 sm:text-sm">
            {caixasMessage}
          </p>
        )}
        {caixasError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800 sm:text-sm">
            {caixasError}
          </p>
        )}
      </div>

      <div className={`${CARD_FORM_BLOCK} border-slate-200 bg-slate-50/80`}>
        <p className={FORM_SECTION_TITLE}>Foto do lote</p>
        <p className="text-xs text-slate-500 sm:text-sm">
          {produtoNome}
          <span className="sr-only"> Câmera ou galeria; salvar vincula ao lote.</span>
        </p>

        <PhotoUploader
          key={uploaderKey}
          loading={saving}
          disabled={saving}
          onPhotoSelect={(file) => {
            setPhotoFile(file);
            setError(null);
            setMessage(null);
          }}
          onPhotoRemove={() => {
            setPhotoFile(null);
            setError(null);
          }}
        />

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving || !photoFile}
            onClick={() => void handleSalvarFoto()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                …
              </>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>

        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 sm:text-sm">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800 sm:text-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
