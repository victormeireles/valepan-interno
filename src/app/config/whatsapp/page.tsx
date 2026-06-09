'use client';

import { useCallback, useEffect, useState } from 'react';

type ConfigResponse = {
  embalagem: boolean;
  fermentacao: boolean;
  forno: boolean;
  saidas: boolean;
  updatedAt: string | null;
  zapiConnected: boolean;
};

type ToggleKey = keyof Pick<ConfigResponse, 'embalagem' | 'fermentacao' | 'forno' | 'saidas'>;

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: 'embalagem', label: 'Embalagem', description: 'Avisos ao salvar produção de embalagem' },
  { key: 'fermentacao', label: 'Fermentação', description: 'Avisos ao salvar produção de fermentação' },
  { key: 'forno', label: 'Forno', description: 'Avisos ao salvar produção de forno' },
  { key: 'saidas', label: 'Saídas', description: 'Avisos ao registrar ou atualizar saídas' },
];

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/whatsapp');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar');
      setConfig(data);
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
    load();
  }, [load]);

  const handleToggle = async (key: ToggleKey) => {
    if (!config || savingKey) return;
    const next = !config[key];
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch('/api/config/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setConfig(data);
      setMessage({
        type: 'ok',
        text: `${TOGGLES.find((t) => t.key === key)?.label}: ${next ? 'ligado' : 'desligado'}`,
      });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao salvar',
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-3xl bg-[#0a0e14] text-gray-100 px-4 py-8 sm:p-8 border border-white/10 shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Notificações WhatsApp</h1>
        <p className="text-sm text-gray-400 mb-6">
          Com o envio desligado, a produção continua sendo salva normalmente — apenas a mensagem no
          grupo não é enviada.
        </p>

        {config && (
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-6 ${
              config.zapiConnected
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${config.zapiConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
            />
            Z-API {config.zapiConnected ? 'Conectada' : 'Desconectada'}
          </div>
        )}

        {message && (
          <p
            className={`mb-4 text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          {loading && <p className="text-gray-400 text-sm">Carregando…</p>}
          {!loading &&
            config &&
            TOGGLES.map(({ key, label, description }) => {
              const on = config[key];
              const busy = savingKey === key;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={busy}
                    onClick={() => handleToggle(key)}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                      on ? 'bg-[#e67e22]' : 'bg-gray-600'
                    } ${busy ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        on ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
        </div>

        {config?.updatedAt && (
          <p className="mt-4 text-xs text-gray-600">
            Atualizado: {new Date(config.updatedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  );
}
