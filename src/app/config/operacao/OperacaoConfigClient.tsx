'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import OperacaoTurnosSection from './OperacaoTurnosSection';
import {
  operacaoTurnoDraftManager,
  type OperacaoFormDraft,
} from './operacao-turno-draft';

const HEADER_DESCRIPTION =
  'Turnos por etapa e tempos médios usados no painel e no fluxo.';

export default function OperacaoConfigClient() {
  const [draft, setDraft] = useState<OperacaoFormDraft>(
    operacaoTurnoDraftManager.fromSnapshot(DEFAULT_CONFIG_OPERACAO),
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const applySnapshot = (snapshot: ConfigOperacaoSnapshot) => {
    setDraft(operacaoTurnoDraftManager.fromSnapshot(snapshot));
    setUpdatedAt(snapshot.updatedAt);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/operacao');
      const data = (await res.json()) as ConfigOperacaoSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar');
      applySnapshot(data);
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao carregar',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setMinutes = (
    key: 'tempoMedioFermentacaoMin' | 'tempoMedioResfriamentoMin',
    value: string,
  ) => {
    const parsed = Number(value);
    setDraft((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : current[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/config/operacao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...operacaoTurnoDraftManager.toPatch(draft),
          tempoMedioFermentacaoMin: Number(draft.tempoMedioFermentacaoMin),
          tempoMedioResfriamentoMin: Number(draft.tempoMedioResfriamentoMin),
        }),
      });
      const data = (await res.json()) as ConfigOperacaoSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      applySnapshot(data);
      setMessage({ type: 'ok', text: 'Parâmetros salvos.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao salvar',
      });
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <div className="max-w-2xl">
      <ConfigPageHeader
        title="Operação"
        description={HEADER_DESCRIPTION}
        icon="schedule"
      />

      <Card padding="lg" className="space-y-6">
        {loading ? <p className="text-sm text-stone-500">Carregando…</p> : null}

        {message ? (
          <p
            className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        <OperacaoTurnosSection
          drafts={draft.etapas}
          disabled={busy}
          onChange={(etapas) => setDraft((current) => ({ ...current, etapas }))}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-800">Tempos médios</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="number"
              min={1}
              step={1}
              numeric
              label="Fermentação (min)"
              value={draft.tempoMedioFermentacaoMin}
              onChange={(event) =>
                setMinutes('tempoMedioFermentacaoMin', event.target.value)
              }
              disabled={busy}
            />
            <Input
              type="number"
              min={1}
              step={1}
              numeric
              label="Resfriamento (min)"
              value={draft.tempoMedioResfriamentoMin}
              onChange={(event) =>
                setMinutes('tempoMedioResfriamentoMin', event.target.value)
              }
              disabled={busy}
            />
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          {updatedAt ? (
            <p className="text-xs text-stone-500">
              Atualizado: {new Date(updatedAt).toLocaleString('pt-BR')}
            </p>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => void handleSave()} disabled={busy}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
