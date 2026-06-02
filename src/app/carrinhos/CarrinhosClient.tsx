'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CarrinhoComUsoDetalhe,
  CarrinhoRow,
  CarrinhoUsoEtapa,
  CarrinhoUsoOcorrencia,
} from '@/app/actions/carrinhos-actions';
import { createCarrinho, createCarrinhosEmLote, updateCarrinho } from '@/app/actions/carrinhos-actions';

const CAPACIDADE_PADRAO_NOVO_CARRINHO = '20';

function parseIntSafe(value: string, fallback: number): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** No banco existem duas colunas históricas; no produto bandeja = lata (mesma medida). */
function capacidadeUnificada(c: CarrinhoRow): number {
  return Math.max(c.bandejas, c.quantidade_latas);
}

type CardShell = 'neutral' | 'em_uso' | 'inativo';

const SHELL: Record<CardShell, string> = {
  neutral: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
  em_uso: 'rounded-xl border-2 border-amber-400/80 bg-amber-50/90 p-4 shadow-sm ring-1 ring-amber-200/60',
  inativo:
    'rounded-xl border-2 border-violet-400/70 bg-violet-50/80 p-4 shadow-sm ring-1 ring-violet-200/50',
};

function CarrinhoCard({
  c,
  onSaved,
  shell = 'neutral',
  hideHeader = false,
}: {
  c: CarrinhoRow;
  onSaved: () => void;
  shell?: CardShell;
  /** Esconde o bloco de título/badges (útil quando o nome já aparece na linha da lista). */
  hideHeader?: boolean;
}) {
  const [numero, setNumero] = useState(String(c.numero));
  const [capacidade, setCapacidade] = useState(String(capacidadeUnificada(c)));
  const [precisaReparos, setPrecisaReparos] = useState(c.precisa_reparos);
  const [emUso, setEmUso] = useState(c.em_uso);
  const [latasOcupadas, setLatasOcupadas] = useState(String(c.latas_ocupadas));
  const [ativo, setAtivo] = useState(c.ativo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFromRow = useCallback(() => {
    setNumero(String(c.numero));
    setCapacidade(String(capacidadeUnificada(c)));
    setPrecisaReparos(c.precisa_reparos);
    setEmUso(c.em_uso);
    setLatasOcupadas(String(c.latas_ocupadas));
    setAtivo(c.ativo);
  }, [c]);

  useEffect(() => {
    syncFromRow();
  }, [syncFromRow]);

  const salvar = useCallback(async () => {
    setSaving(true);
    setError(null);
    const res = await updateCarrinho({
      id: c.id,
      numero: parseIntSafe(numero, c.numero),
      capacidadeBandejasLatas: parseIntSafe(capacidade, capacidadeUnificada(c)),
      precisaReparos,
      emUso,
      latasOcupadas: parseIntSafe(latasOcupadas, c.latas_ocupadas),
      ativo,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Erro ao salvar.');
      return;
    }
    onSaved();
  }, [
    c.id,
    c.numero,
    c.latas_ocupadas,
    numero,
    capacidade,
    precisaReparos,
    emUso,
    latasOcupadas,
    ativo,
    onSaved,
  ]);

  const cap = parseIntSafe(capacidade, capacidadeUnificada(c));
  const ocup = parseIntSafe(latasOcupadas, c.latas_ocupadas);

  return (
    <div className={SHELL[shell]}>
      {!hideHeader && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Carrinho {numero || '—'}</span>
            {emUso ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                Em uso
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                Livre
              </span>
            )}
            {precisaReparos && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">
                Reparo
              </span>
            )}
            {!ativo && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                Inativo
              </span>
            )}
          </div>
          {cap > 0 && emUso && (
            <span className="text-xs text-slate-600 tabular-nums">
              {ocup} / {cap}
            </span>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Número</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Capacidade</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={capacidade}
            onChange={(e) => setCapacidade(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={emUso}
            onChange={(e) => {
              const v = e.target.checked;
              setEmUso(v);
              if (!v) setLatasOcupadas('0');
            }}
          />
          <span className="text-slate-700">Em uso</span>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-slate-600">Latas ocupadas</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            value={latasOcupadas}
            onChange={(e) => setLatasOcupadas(e.target.value)}
            inputMode="numeric"
            disabled={!emUso}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={precisaReparos} onChange={(e) => setPrecisaReparos(e.target.checked)} />
          <span className="text-slate-700">Reparos</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="text-slate-700">Ativo</span>
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={syncFromRow}
          disabled={saving}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function etiquetaEtapaCurta(etapa: CarrinhoUsoEtapa): string {
  return etapa === 'fermentacao' ? 'Fermentação' : 'Pós-forno';
}

function resumoEtapasUso(occs: CarrinhoUsoOcorrencia[]): string {
  const set = new Set(occs.map((o) => o.etapa));
  const order: CarrinhoUsoEtapa[] = ['fermentacao', 'pos_forno'];
  const parts = order.filter((e) => set.has(e)).map(etiquetaEtapaCurta);
  return parts.length > 0 ? parts.join(' · ') : 'Em uso';
}

function hrefEtapaProducao(ordemId: string, etapa: CarrinhoUsoEtapa): string {
  if (etapa === 'fermentacao') return `/producao/etapas/${ordemId}/fermentacao`;
  return `/producao/etapas/${ordemId}/entrada-embalagem`;
}

function hrefEntradaForno(ordemId: string): string {
  return `/producao/etapas/${ordemId}/entrada-forno`;
}

function CarrinhoEmUsoCard({
  c,
  onSelect,
}: {
  c: CarrinhoComUsoDetalhe;
  onSelect: () => void;
}) {
  const occs = c.uso_ocorrencias ?? [];
  const resumo = resumoEtapasUso(occs);
  const produtoAtual = occs[0]?.produto_nome?.trim() || '';
  const manut = c.ativo && c.precisa_reparos;
  const shell = manut
    ? 'border-orange-400 bg-orange-50 text-orange-950 ring-1 ring-orange-300/50'
    : 'border-blue-200 bg-blue-50/90 text-blue-950 ring-1 ring-blue-200/50';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Carrinho ${c.numero}, ${resumo}. Abrir detalhes.`}
      className={`flex h-[3.1rem] w-[8.9rem] flex-col gap-0.5 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${shell}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-bold tabular-nums leading-none">Carrinho {c.numero}</span>
        {manut && (
          <span
            className="shrink-0 text-[12px] leading-none font-bold text-rose-600"
            title="Precisa de reparo"
            aria-label="Precisa de reparo"
          >
            !
          </span>
        )}
      </div>
      <span className="truncate text-[9px] font-medium leading-tight text-slate-700">{resumo}</span>
      {produtoAtual && (
        <span className="truncate text-[9px] leading-tight text-slate-500">{produtoAtual}</span>
      )}
    </button>
  );
}

function CarrinhoPainelModal({
  open,
  onClose,
  carrinho,
  onReload,
}: {
  open: boolean;
  onClose: () => void;
  carrinho: CarrinhoComUsoDetalhe | null;
  onReload: () => Promise<void>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setBusyKey(null);
      setActionMsg(null);
    }
  }, [open]);

  if (!open || !carrinho) return null;

  const occs = carrinho.uso_ocorrencias ?? [];
  const resumoEtapas = resumoEtapasUso(occs);
  const shell: CardShell =
    !carrinho.ativo ? 'inativo' : carrinho.em_uso ? 'em_uso' : 'neutral';

  const run = async (key: string, fn: () => Promise<{ success: boolean; error?: string } | void>) => {
    setBusyKey(key);
    setActionMsg(null);
    try {
      const res = await fn();
      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        setActionMsg({ type: 'err', text: res.error ?? 'Operação falhou.' });
        setBusyKey(null);
        return;
      }
      await onReload();
      setActionMsg({ type: 'ok', text: 'Operação concluída.' });
    } catch (e) {
      setActionMsg({
        type: 'err',
        text: e instanceof Error ? e.message : 'Erro inesperado.',
      });
    }
    setBusyKey(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[88vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Carrinho {carrinho.numero}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {carrinho.ativo ? (carrinho.em_uso ? resumoEtapas : 'Disponível') : 'Inativo'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {actionMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                actionMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {actionMsg.text}
            </div>
          )}

          {occs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Produção</h3>
              <ul className="space-y-3">
                {occs.map((o, idx) => (
                  <li
                    key={`${o.etapa}-${o.ordem_producao_id}-${o.fermentacao_log_id ?? ''}-${o.saida_forno_log_id ?? ''}-${idx}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          o.etapa === 'fermentacao'
                            ? 'bg-violet-100 text-violet-900'
                            : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {etiquetaEtapaCurta(o.etapa)}
                      </span>
                    </div>
                    <dl className="space-y-1.5 text-sm text-slate-800">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Produto</dt>
                        <dd className="font-medium">{o.produto_nome?.trim() || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Lote</dt>
                        <dd className="font-mono text-xs">{o.lote_codigo?.trim() || o.ordem_producao_id}</dd>
                      </div>
                      {o.etapa === 'fermentacao' && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Assadeiras</dt>
                          <dd className="tabular-nums font-semibold">
                            {o.assadeiras_total != null ? o.assadeiras_total : '—'}
                          </dd>
                        </div>
                      )}
                      {o.etapa === 'pos_forno' && (
                        <>
                          <div>
                            <dt className="text-xs font-medium text-slate-500">Saída forno</dt>
                            <dd className="tabular-nums font-semibold">
                              {o.assadeiras_total != null ? o.assadeiras_total : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium text-slate-500">Restantes</dt>
                            <dd className="tabular-nums font-semibold text-amber-900">
                              {o.latas_restantes_embalagem != null ? o.latas_restantes_embalagem : '—'}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>

                    <div className="flex flex-col gap-2 border-t border-slate-200/80 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ações</p>
                      <div className="flex flex-wrap gap-2">
                        {o.etapa === 'fermentacao' && (
                          <>
                            <Link
                              href={hrefEntradaForno(o.ordem_producao_id)}
                              onClick={onClose}
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                            >
                              Entrada no forno
                            </Link>
                            <Link
                              href={hrefEtapaProducao(o.ordem_producao_id, 'fermentacao')}
                              onClick={onClose}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Ver fermentação
                            </Link>
                            {o.fermentacao_log_id && (
                              <button
                                type="button"
                                disabled={busyKey != null}
                                onClick={() => {
                                  if (
                                    !confirm(
                                      'Perda total neste lote? O carrinho ficará livre.',
                                    )
                                  ) {
                                    return;
                                  }
                                  void run(`perda-ferm-${o.fermentacao_log_id}`, async () => {
                                    const mod = await import('@/app/actions/producao-etapas-actions');
                                    return mod.marcarPerdaTotalCarrinhoEntradaForno({
                                      fermentacao_log_id: o.fermentacao_log_id as string,
                                    });
                                  });
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
                              >
                                Perda total (libertar)
                              </button>
                            )}
                          </>
                        )}
                        {o.etapa === 'pos_forno' && o.saida_forno_log_id && (
                          <>
                            <Link
                              href={hrefEtapaProducao(o.ordem_producao_id, 'pos_forno')}
                              onClick={onClose}
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                            >
                              Entrada na embalagem
                            </Link>
                            <button
                              type="button"
                              disabled={busyKey != null || (o.latas_restantes_embalagem ?? 0) < 1}
                              onClick={() => {
                                const n = o.latas_restantes_embalagem ?? 0;
                                if (
                                  !confirm(
                                    `Registar todas as ${n} latas na embalagem?`,
                                  )
                                ) {
                                  return;
                                }
                                void run(`emb-tudo-${o.saida_forno_log_id}`, async () => {
                                  const mod = await import('@/app/actions/producao-etapas-actions');
                                  return mod.registerEntradaEmbalagemTodasLatasRestantes({
                                    ordem_producao_id: o.ordem_producao_id,
                                    saida_forno_log_id: o.saida_forno_log_id as string,
                                  });
                                });
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Registar tudo na embalagem
                            </button>
                            <button
                              type="button"
                              disabled={busyKey != null || (o.latas_restantes_embalagem ?? 0) < 1}
                              onClick={() => {
                                if (
                                  !confirm(
                                    'Encerrar saldo sem embalagem? O carrinho ficará livre.',
                                  )
                                ) {
                                  return;
                                }
                                void run(`perda-pos-${o.saida_forno_log_id}`, async () => {
                                  const mod = await import('@/app/actions/producao-etapas-actions');
                                  return mod.encerrarSaldoCarrinhoPosFornoAdministrativo({
                                    saida_forno_log_id: o.saida_forno_log_id as string,
                                  });
                                });
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Perda total (sem embalagem)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Cadastro</h3>
            <CarrinhoCard
              c={carrinho}
              shell={shell}
              hideHeader={false}
              onSaved={() => void onReload()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarrinhoNumeroTile({
  c,
  tone,
  onSelect,
}: {
  c: CarrinhoComUsoDetalhe;
  tone: 'em_uso' | 'disponivel' | 'inativo' | 'manutencao';
  onSelect: () => void;
}) {
  const classes =
    tone === 'manutencao'
      ? 'border-orange-400 bg-orange-50 text-orange-950 ring-1 ring-orange-300/50'
      : tone === 'em_uso'
        ? 'border-blue-200 bg-blue-50/90 text-blue-950 ring-1 ring-blue-200/50'
        : tone === 'inativo'
          ? 'border-slate-300 bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/70'
          : 'border-slate-200 bg-white text-slate-900';
  const subtitle =
    tone === 'manutencao'
      ? 'Disponível com reparo'
      : tone === 'inativo'
        ? 'Inativo'
        : tone === 'em_uso'
          ? 'Em uso'
          : 'Disponível';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Carrinho ${c.numero}. Abrir informações e edição.`}
      className={`flex h-[3.1rem] w-[8.9rem] flex-col gap-0.5 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${classes}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-bold tabular-nums leading-none">Carrinho {c.numero}</span>
        {tone === 'manutencao' && (
          <span
            className="shrink-0 text-[12px] leading-none font-bold text-rose-600"
            title="Precisa de reparo"
            aria-label="Precisa de reparo"
          >
            !
          </span>
        )}
      </div>
      <span className="truncate text-[9px] font-medium leading-tight text-slate-700">{subtitle}</span>
    </button>
  );
}

function ListaCarrinhosModal({
  open,
  onClose,
  onAbrirPainel,
  list,
  reload,
  novoNumero,
  setNovoNumero,
  novoNumeroInicial,
  setNovoNumeroInicial,
  novoNumeroFinal,
  setNovoNumeroFinal,
  novoCapacidadeLote,
  setNovoCapacidadeLote,
  novoCapacidade,
  setNovoCapacidade,
  novoPrecisaReparos,
  setNovoPrecisaReparos,
  creating,
  creatingLote,
  createError,
  createRangeError,
  onCriar,
  onCriarLote,
}: {
  open: boolean;
  onClose: () => void;
  onAbrirPainel: (c: CarrinhoComUsoDetalhe) => void;
  list: CarrinhoComUsoDetalhe[];
  reload: () => void;
  novoNumero: string;
  setNovoNumero: (v: string) => void;
  novoNumeroInicial: string;
  setNovoNumeroInicial: (v: string) => void;
  novoNumeroFinal: string;
  setNovoNumeroFinal: (v: string) => void;
  novoCapacidadeLote: string;
  setNovoCapacidadeLote: (v: string) => void;
  novoCapacidade: string;
  setNovoCapacidade: (v: string) => void;
  novoPrecisaReparos: boolean;
  setNovoPrecisaReparos: (v: boolean) => void;
  creating: boolean;
  creatingLote: boolean;
  createError: string | null;
  createRangeError: string | null;
  onCriar: () => void;
  onCriarLote: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setEditingId(null);
  }, [open]);

  if (!open) return null;

  const ordenados = [...list].sort((a, b) => a.numero - b.numero);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Todos os carrinhos</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-medium text-slate-700">Novo</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Número *</span>
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={novoNumero}
                  onChange={(e) => setNovoNumero(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Capacidade</span>
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={novoCapacidade}
                  onChange={(e) => setNovoCapacidade(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={novoPrecisaReparos}
                  onChange={(e) => setNovoPrecisaReparos(e.target.checked)}
                />
                <span>Precisa de reparos</span>
              </label>
            </div>
            {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onCriar}
                disabled={creating}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {creating ? 'Criando…' : 'Criar'}
              </button>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-medium text-slate-700">Novo em lote (intervalo)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">De *</span>
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={novoNumeroInicial}
                  onChange={(e) => setNovoNumeroInicial(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Até *</span>
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={novoNumeroFinal}
                  onChange={(e) => setNovoNumeroFinal(e.target.value)}
                  inputMode="numeric"
                />
              </label>
            </div>
            <div className="mt-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Capacidade *</span>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={novoCapacidadeLote}
                  onChange={(e) => setNovoCapacidadeLote(e.target.value)}
                  inputMode="numeric"
                />
              </label>
            </div>
            {createRangeError && <p className="mt-2 text-sm text-red-600">{createRangeError}</p>}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onCriarLote}
                disabled={creatingLote}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {creatingLote ? 'Criando…' : 'Criar intervalo'}
              </button>
            </div>
          </div>

          <div className="pb-2">
            {ordenados.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhum carrinho cadastrado.</p>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {ordenados.map((c) => {
                  const expandido = editingId === c.id;
                  return (
                    <li key={c.id}>
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <span className="text-sm font-medium text-slate-800">Carrinho {c.numero}</span>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onAbrirPainel(c);
                              onClose();
                            }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100"
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(expandido ? null : c.id)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {expandido ? 'Fechar' : 'Editar'}
                          </button>
                        </div>
                      </div>
                      {expandido && (
                        <div className="border-t border-slate-100 bg-slate-50/60 p-2">
                          <CarrinhoCard
                            c={c}
                            hideHeader
                            shell="neutral"
                            onSaved={() => {
                              void reload();
                              setEditingId(null);
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CarrinhosClient({
  initialList,
  loadError,
}: {
  initialList: CarrinhoComUsoDetalhe[];
  loadError?: string;
}) {
  const [list, setList] = useState<CarrinhoComUsoDetalhe[]>(initialList);
  const [carrinhoPainelId, setCarrinhoPainelId] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const [novoNumero, setNovoNumero] = useState('');
  const [novoCapacidade, setNovoCapacidade] = useState(CAPACIDADE_PADRAO_NOVO_CARRINHO);
  const [novoPrecisaReparos, setNovoPrecisaReparos] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingLote, setCreatingLote] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createRangeError, setCreateRangeError] = useState<string | null>(null);
  const [novoNumeroInicial, setNovoNumeroInicial] = useState('');
  const [novoNumeroFinal, setNovoNumeroFinal] = useState('');
  const [novoCapacidadeLote, setNovoCapacidadeLote] = useState(CAPACIDADE_PADRAO_NOVO_CARRINHO);

  const stats = useMemo(() => {
    const ativos = list.filter((x) => x.ativo);
    const emUso = ativos.filter((x) => x.em_uso).length;
    const livres = ativos.filter((x) => !x.em_uso).length;
    const reparos = list.filter((x) => x.precisa_reparos).length;
    const inativos = list.filter((x) => !x.ativo).length;
    return { livres, emUso, reparos, inativos };
  }, [list]);

  const emUsoRows = useMemo(
    () => list.filter((c) => c.ativo && c.em_uso).sort((a, b) => a.numero - b.numero),
    [list],
  );
  const emUsoFermentacaoRows = useMemo(
    () =>
      emUsoRows.filter((c) =>
        (c.uso_ocorrencias ?? []).some((o) => o.etapa === 'fermentacao'),
      ),
    [emUsoRows],
  );
  const emUsoPosFornoRows = useMemo(
    () =>
      emUsoRows.filter((c) =>
        (c.uso_ocorrencias ?? []).some((o) => o.etapa === 'pos_forno'),
      ),
    [emUsoRows],
  );
  const disponiveisRows = useMemo(
    () => list.filter((c) => c.ativo && !c.em_uso).sort((a, b) => a.numero - b.numero),
    [list],
  );
  const inativosRows = useMemo(
    () => list.filter((c) => !c.ativo).sort((a, b) => a.numero - b.numero),
    [list],
  );

  const reload = useCallback(async () => {
    const mod = await import('@/app/actions/carrinhos-actions');
    const res = await mod.getCarrinhos();
    if (res.ok) setList(res.list);
  }, []);

  const carrinhoPainel = useMemo(
    () => (carrinhoPainelId == null ? null : list.find((x) => x.id === carrinhoPainelId) ?? null),
    [carrinhoPainelId, list],
  );

  useEffect(() => {
    if (carrinhoPainelId != null && !list.some((c) => c.id === carrinhoPainelId)) {
      setCarrinhoPainelId(null);
    }
  }, [list, carrinhoPainelId]);

  const criar = useCallback(async () => {
    setCreating(true);
    setCreateError(null);
    setCreateRangeError(null);
    const n = parseIntSafe(novoNumero, 0);
    if (n <= 0) {
      setCreateError('Número inválido.');
      setCreating(false);
      return;
    }
    const res = await createCarrinho({
      numero: n,
      capacidadeBandejasLatas: parseIntSafe(novoCapacidade, 0),
      precisaReparos: novoPrecisaReparos,
    });
    setCreating(false);
    if (!res.success) {
      setCreateError(res.error || 'Erro ao criar.');
      return;
    }
    setNovoNumero('');
    setNovoCapacidade(CAPACIDADE_PADRAO_NOVO_CARRINHO);
    setNovoPrecisaReparos(false);
    await reload();
  }, [novoNumero, novoCapacidade, novoPrecisaReparos, reload]);

  const criarLote = useCallback(async () => {
    setCreatingLote(true);
    setCreateRangeError(null);
    setCreateError(null);

    const inicio = parseIntSafe(novoNumeroInicial, 0);
    const fim = parseIntSafe(novoNumeroFinal, 0);
    if (inicio <= 0 || fim <= 0 || fim < inicio) {
      setCreateRangeError('Intervalo inválido. Ex.: 1 até 20.');
      setCreatingLote(false);
      return;
    }
    const capacidadeLote = parseIntSafe(novoCapacidadeLote, 0);
    if (capacidadeLote <= 0) {
      setCreateRangeError('Informe a capacidade do lote (maior que zero).');
      setCreatingLote(false);
      return;
    }

    const res = await createCarrinhosEmLote({
      numeroInicial: inicio,
      numeroFinal: fim,
      capacidadeBandejasLatas: capacidadeLote,
      precisaReparos: novoPrecisaReparos,
    });
    setCreatingLote(false);
    if (!res.success) {
      setCreateRangeError(res.error || 'Erro ao criar em lote.');
      return;
    }

    setNovoNumeroInicial('');
    setNovoNumeroFinal('');
    setNovoCapacidadeLote(CAPACIDADE_PADRAO_NOVO_CARRINHO);
    await reload();
  }, [novoNumeroInicial, novoNumeroFinal, novoCapacidadeLote, novoPrecisaReparos, reload]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{stats.emUso}</span> em uso ·{' '}
          <span className="font-medium text-slate-800">{stats.livres}</span> livres ·{' '}
          <span className="font-medium text-violet-800">{stats.inativos}</span> inativos
          {stats.reparos > 0 ? (
            <>
              {' '}
              · <span className="font-medium text-rose-800">{stats.reparos}</span>{' '}
              {stats.reparos === 1 ? 'reparo' : 'reparos'}
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setListaAberta(true)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Lista completa — editar
        </button>
      </div>

      <ListaCarrinhosModal
        open={listaAberta}
        onClose={() => setListaAberta(false)}
        onAbrirPainel={(c) => setCarrinhoPainelId(c.id)}
        list={list}
        reload={reload}
        novoNumero={novoNumero}
        setNovoNumero={setNovoNumero}
        novoNumeroInicial={novoNumeroInicial}
        setNovoNumeroInicial={setNovoNumeroInicial}
        novoNumeroFinal={novoNumeroFinal}
        setNovoNumeroFinal={setNovoNumeroFinal}
        novoCapacidadeLote={novoCapacidadeLote}
        setNovoCapacidadeLote={setNovoCapacidadeLote}
        novoCapacidade={novoCapacidade}
        setNovoCapacidade={setNovoCapacidade}
        novoPrecisaReparos={novoPrecisaReparos}
        setNovoPrecisaReparos={setNovoPrecisaReparos}
        creating={creating}
        creatingLote={creatingLote}
        createError={createError}
        createRangeError={createRangeError}
        onCriar={criar}
        onCriarLote={criarLote}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Em uso — Fermentação
        </h2>
        {emUsoFermentacaoRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            Nenhum carrinho em uso na fermentação.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {emUsoFermentacaoRows.map((c) => (
              <CarrinhoEmUsoCard key={c.id} c={c} onSelect={() => setCarrinhoPainelId(c.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Em uso — Pós-forno
        </h2>
        {emUsoPosFornoRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            Nenhum carrinho em uso no pós-forno.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {emUsoPosFornoRows.map((c) => (
              <CarrinhoEmUsoCard key={c.id} c={c} onSelect={() => setCarrinhoPainelId(c.id)} />
            ))}
          </div>
        )}
      </section>

      <CarrinhoPainelModal
        open={carrinhoPainelId != null && carrinhoPainel != null}
        onClose={() => setCarrinhoPainelId(null)}
        carrinho={carrinhoPainel}
        onReload={reload}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Disponíveis</h2>
        {disponiveisRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            Nenhum carrinho disponível.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disponiveisRows.map((c) => (
              <CarrinhoNumeroTile
                key={c.id}
                c={c}
                tone={c.ativo && c.precisa_reparos ? 'manutencao' : 'disponivel'}
                onSelect={() => setCarrinhoPainelId(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Inativos</h2>
        {inativosRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            Nenhum carrinho inativo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {inativosRows.map((c) => (
              <CarrinhoNumeroTile
                key={c.id}
                c={c}
                tone="inativo"
                onSelect={() => setCarrinhoPainelId(c.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
