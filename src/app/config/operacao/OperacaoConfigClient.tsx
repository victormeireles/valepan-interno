'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';

type Draft = Omit<ConfigOperacaoSnapshot, 'updatedAt' | 'turnos'>;

const TURNO_ROWS: {
  inicioKey: keyof Draft;
  fimKey: keyof Draft;
  label: string;
}[] = [
  {
    inicioKey: 'horarioInicioProducao',
    fimKey: 'horarioFimProducao',
    label: 'Fermentação',
  },
  { inicioKey: 'horarioInicioForno', fimKey: 'horarioFimForno', label: 'Forno' },
  {
    inicioKey: 'horarioInicioEmbalagem',
    fimKey: 'horarioFimEmbalagem',
    label: 'Embalagem',
  },
];

function snapshotToDraft(snapshot: ConfigOperacaoSnapshot): Draft {
  return {
    horarioInicioProducao: snapshot.horarioInicioProducao,
    horarioFimProducao: snapshot.horarioFimProducao,
    horarioInicioForno: snapshot.horarioInicioForno,
    horarioFimForno: snapshot.horarioFimForno,
    horarioInicioEmbalagem: snapshot.horarioInicioEmbalagem,
    horarioFimEmbalagem: snapshot.horarioFimEmbalagem,
    tempoMedioFermentacaoMin: snapshot.tempoMedioFermentacaoMin,
    tempoMedioResfriamentoMin: snapshot.tempoMedioResfriamentoMin,
  };
}

export default function OperacaoConfigClient() {
  const [draft, setDraft] = useState<Draft>(snapshotToDraft(DEFAULT_CONFIG_OPERACAO));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/operacao');
      const data = (await res.json()) as ConfigOperacaoSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar');
      setDraft(snapshotToDraft(data));
      setUpdatedAt(data.updatedAt);
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

  const setClock = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setMinutes = (key: 'tempoMedioFermentacaoMin' | 'tempoMedioResfriamentoMin', value: string) => {
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
          ...draft,
          tempoMedioFermentacaoMin: Number(draft.tempoMedioFermentacaoMin),
          tempoMedioResfriamentoMin: Number(draft.tempoMedioResfriamentoMin),
        }),
      });
      const data = (await res.json()) as ConfigOperacaoSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setDraft(snapshotToDraft(data));
      setUpdatedAt(data.updatedAt);
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

  return (
    <div className="max-w-2xl">
      <ConfigPageHeader
        title="Operação"
        description="Horários do 1º turno e tempos médios usados no painel e no fluxo."
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

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-800">1º turno</h2>
          <p className="text-xs text-stone-500">
            Se o fim for menor que o início, vale o dia seguinte (ex.: 7h → 5h).
          </p>
          <div className="space-y-3">
            {TURNO_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr_1fr] sm:items-end"
              >
                <p className="text-sm font-medium text-stone-700 sm:pb-2.5">{row.label}</p>
                <Input
                  type="time"
                  label="Início"
                  numeric
                  value={draft[row.inicioKey]}
                  onChange={(event) => setClock(row.inicioKey, event.target.value)}
                  disabled={loading || saving}
                />
                <Input
                  type="time"
                  label="Fim"
                  numeric
                  value={draft[row.fimKey]}
                  onChange={(event) => setClock(row.fimKey, event.target.value)}
                  disabled={loading || saving}
                />
              </div>
            ))}
          </div>
        </section>

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
              disabled={loading || saving}
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
              disabled={loading || saving}
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
          <Button type="button" onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
