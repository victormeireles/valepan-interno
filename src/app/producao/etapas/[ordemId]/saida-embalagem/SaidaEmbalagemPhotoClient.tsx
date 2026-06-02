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
  /** URLs já gravadas em `producao_etapas_log.fotos` (etapa saída embalagem). */
  initialFotosSalvas: string[];
};

export default function SaidaEmbalagemPhotoClient({
  ordemProducaoId,
  produtoNome,
  metaCaixas,
  initialCaixasRecebidas,
  initialFotosSalvas,
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
  const [fotosSalvas, setFotosSalvas] = useState<string[]>(initialFotosSalvas);

  useEffect(() => {
    setCaixasField(initialCaixasRecebidas != null ? String(initialCaixasRecebidas) : '');
  }, [initialCaixasRecebidas]);

  useEffect(() => {
    setFotosSalvas(initialFotosSalvas);
  }, [initialFotosSalvas]);

  const handleSalvar = async () => {
    setError(null);
    setMessage(null);

    const raw = caixasField.trim();
    if (raw === '') {
      setError('Informe quantas caixas foram embaladas (use 0 se necessário).');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setError('Use um número inteiro maior ou igual a zero.');
      return;
    }

    setSaving(true);
    try {
      const caixasRes = await upsertSaidaEmbalagemCaixasRecebidas({
        ordem_producao_id: ordemProducaoId,
        caixas_recebidas: n,
      });
      if (!caixasRes.success) {
        throw new Error(caixasRes.error || 'Falha ao salvar quantidade de caixas.');
      }

      const partesSucesso = ['Quantidade de caixas salva.'];

      if (photoFile) {
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
          const photoUrl = uploadJson.photoUrl;
          if (!photoUrl) {
            throw new Error('Upload sem URL de foto retornada');
          }

          const appendRes = await appendFotoToSaidaEmbalagemStepLog({
            ordem_producao_id: ordemProducaoId,
            photoUrl,
          });
          if (!appendRes.success) {
            throw new Error(appendRes.error || 'Falha ao vincular foto ao lote');
          }

          setFotosSalvas((prev) => (prev.includes(photoUrl) ? prev : [...prev, photoUrl]));
          setPhotoFile(null);
          setUploaderKey((k) => k + 1);
          partesSucesso.push('Foto anexada.');
        } catch (photoErr) {
          const msg =
            photoErr instanceof Error ? photoErr.message : 'Erro ao enviar a foto.';
          setError(
            `Quantidade de caixas foi salva, mas a foto não foi enviada: ${msg}`,
          );
          router.refresh();
          return;
        }
      }

      setMessage(partesSucesso.join(' '));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
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

  const pctBarra =
    comparavel && metaNum != null && metaNum > 0
      ? Math.min(100, (informado! / metaNum) * 100)
      : informado != null && informado > 0
        ? 100
        : 0;

  return (
    <div className="mt-2 space-y-2">
      {metaNum != null && informado != null && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-indigo-950 sm:text-xs">
            <span>Saída de embalagem (caixas)</span>
            <span className="tabular-nums">
              {Math.round(pctBarra)}% da referência
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 sm:h-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-300"
              style={{ width: `${pctBarra}%` }}
            />
          </div>
        </div>
      )}

      <div className={`${CARD_FORM_BLOCK} border-slate-200`}>
        <p className={FORM_SECTION_TITLE}>Caixas embaladas</p>
        <p className="sr-only">Conferir com a referência do planejado.</p>

        <div className="flex flex-wrap items-baseline gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
            Referência
          </span>
          <span className="text-base font-semibold tabular-nums text-slate-900 sm:text-lg">{metaCaixas.resumo}</span>
        </div>
        {metaCaixas.subtexto && (
          <p className="text-[11px] leading-snug text-slate-500 sm:text-xs">{metaCaixas.subtexto}</p>
        )}

        <div className="min-w-0">
          <label className={FORM_FIELD_LABEL} htmlFor="saida-embalagem-caixas">
            Quantidade embalada
          </label>
          <input
            id="saida-embalagem-caixas"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            disabled={saving}
            value={caixasField}
            onChange={(e) => {
              setCaixasField(e.target.value);
              setError(null);
              setMessage(null);
            }}
            className={`${INPUT_COMPACT_LINE} tabular-nums`}
            placeholder="0"
          />
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
      </div>

      <div className={`${CARD_FORM_BLOCK} border-slate-200 bg-slate-50/80`}>
        <p className={FORM_SECTION_TITLE}>Foto do lote</p>
        <p className="text-xs text-slate-500 sm:text-sm">
          {produtoNome}. Foto opcional — se escolher uma imagem, ela é enviada ao tocar em Salvar.
        </p>

        {fotosSalvas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
              Fotos já registradas ({fotosSalvas.length})
            </p>
            <ul className="flex flex-wrap gap-2">
              {fotosSalvas.map((url) => (
                <li key={url} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URLs externas (ex.: Drive) */}
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

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
      </div>

      <div className="flex flex-col gap-2 sm:items-stretch">
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
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSalvar()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60 sm:ml-auto sm:w-auto sm:min-w-[10rem] sm:self-end"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              …
            </>
          ) : (
            'Salvar'
          )}
        </button>
      </div>
    </div>
  );
}
