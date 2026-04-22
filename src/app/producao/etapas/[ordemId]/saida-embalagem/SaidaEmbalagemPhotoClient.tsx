'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUploader from '@/components/PhotoUploader';
import {
  appendFotoToSaidaEmbalagemStepLog,
  upsertSaidaEmbalagemCaixasRecebidas,
} from '@/app/actions/producao-etapas-actions';
import type { MetaCaixasSaidaEmbalagem } from '@/lib/utils/production-conversions';

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
    <div className="mt-5 space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900">Caixas entregues</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Marque quantas caixas foram entregues e compare com o esperado do lote.
          </p>
        </div>

        <div className="flex flex-wrap items-baseline gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Sinalizador: deveriam ser entregues
          </span>
          <span className="text-lg font-semibold text-slate-900 tabular-nums">{metaCaixas.resumo}</span>
        </div>
        {metaCaixas.subtexto && (
          <p className="text-xs text-slate-500 leading-snug">{metaCaixas.subtexto}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex-1 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-700">Caixas entregues (conferência)</span>
            <input
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="0"
            />
          </label>
          <button
            type="button"
            disabled={savingCaixas}
            onClick={() => void handleSalvarCaixas()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 disabled:opacity-60 shrink-0"
          >
            {savingCaixas ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar contagem'
            )}
          </button>
        </div>

        {comparavel && diff != null && !igualAoPlanejado && (
          <p
            className={`text-sm font-medium tabular-nums ${
              diff < 0 ? 'text-amber-800' : 'text-sky-800'
            }`}
          >
            Diferença em relação ao planejado:{' '}
            {diff > 0 ? '+' : ''}
            {Number.isInteger(diff) ? diff : Math.round(diff * 100) / 100} caixa(s).
          </p>
        )}
        {comparavel && igualAoPlanejado && (
          <p className="text-sm font-medium text-emerald-800">Conferência igual ao planejado.</p>
        )}

        {caixasMessage && (
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {caixasMessage}
          </p>
        )}
        {caixasError && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {caixasError}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Foto do lote (saída da embalagem)</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Produto <strong>{produtoNome}</strong>. Use a câmera ou galeria e salve para vincular ao lote.
        </p>
      </div>

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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando foto...
            </>
          ) : (
            'Salvar foto do lote'
          )}
        </button>
      </div>

      {message && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}
      </div>
    </div>
  );
}
