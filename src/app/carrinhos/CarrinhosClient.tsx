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

/** Atualiza texto de tempo na etapa (minutos visíveis sem esperar um minuto exato em dev). */
function usePeriodicNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    setNow(Date.now());
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

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
            <span className="text-sm font-semibold text-slate-800">#{numero || '—'}</span>
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
            <span className="text-xs text-slate-600">
              No carrinho: {ocup} / {cap}
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
          <span className="text-slate-600">Capacidade (bandejas = latas)</span>
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
          <span className="text-slate-600">Quantidade agora</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            value={latasOcupadas}
            onChange={(e) => setLatasOcupadas(e.target.value)}
            inputMode="numeric"
            disabled={!emUso}
            placeholder={emUso ? 'Ex.: 20' : '—'}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={precisaReparos} onChange={(e) => setPrecisaReparos(e.target.checked)} />
          <span className="text-slate-700">Precisa de reparos</span>
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
  return etapa === 'fermentacao' ? 'Fermentação' : 'Resfriamento';
}

/** Retorna ISO do início mais antigo na etapa (maior tempo nesta etapa). */
function inicioEtapaMaisAntigo(occs: CarrinhoUsoOcorrencia[], etapa: CarrinhoUsoEtapa): string | null {
  const filtradas = occs.filter((o) => o.etapa === etapa);
  let best: string | null = null;
  let bestMs = Number.POSITIVE_INFINITY;
  for (const o of filtradas) {
    const iso = o.etapa_inicio_iso?.trim();
    if (!iso) continue;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) continue;
    if (t < bestMs) {
      bestMs = t;
      best = iso;
    }
  }
  return best;
}

const MS_HORA = 60 * 60 * 1000;
const WARN_MIN_MS = 2 * MS_HORA;
const DANGER_MIN_MS = 3 * MS_HORA;

function formatDuracaoNaEtapa(elapsedMs: number): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return '—';
  const totalMin = Math.floor(elapsedMs / 60_000);
  const d = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

type NivelDuracaoEtapa = 'ok' | 'warning' | 'danger';

function nivelDuracaoEtapa(elapsedMs: number): NivelDuracaoEtapa {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 'ok';
  if (elapsedMs > DANGER_MIN_MS) return 'danger';
  if (elapsedMs > WARN_MIN_MS) return 'warning';
  return 'ok';
}

function usoResumoOuManual(occs: CarrinhoUsoOcorrencia[]): string {
  if (occs.length === 0) return 'Marcação manual';
  const set = new Set(occs.map((o) => o.etapa));
  const order: CarrinhoUsoEtapa[] = ['fermentacao', 'pos_forno'];
  const parts = order.filter((e) => set.has(e)).map(etiquetaEtapaCurta);
  return parts.length > 0 ? parts.join(' · ') : 'Em uso';
}

function carrinhosNaEtapaOrdenados(
  emUsoList: CarrinhoComUsoDetalhe[],
  etapa: CarrinhoUsoEtapa,
): { c: CarrinhoComUsoDetalhe; etapaInicioIso: string | null }[] {
  const rows = emUsoList
    .filter((c) => (c.uso_ocorrencias ?? []).some((o) => o.etapa === etapa))
    .map((c) => ({
      c,
      etapaInicioIso: inicioEtapaMaisAntigo(c.uso_ocorrencias ?? [], etapa),
    }));

  return rows.sort((a, b) => {
    const ta = a.etapaInicioIso ? Date.parse(a.etapaInicioIso) : Number.NaN;
    const tb = b.etapaInicioIso ? Date.parse(b.etapaInicioIso) : Number.NaN;
    const aOk = Number.isFinite(ta);
    const bOk = Number.isFinite(tb);
    if (aOk && bOk && ta !== tb) return ta - tb;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.c.numero - b.c.numero;
  });
}

function hrefEtapaProducao(ordemId: string, etapa: CarrinhoUsoEtapa): string {
  if (etapa === 'fermentacao') return `/producao/etapas/${ordemId}/fermentacao`;
  return `/producao/etapas/${ordemId}/entrada-embalagem`;
}

function shellsCarrinhoEmUsoCard(
  manut: boolean,
  tempo: NivelDuracaoEtapa,
): {
  shell: string;
  focusRing: string;
  tempoClass: string;
} {
  if (tempo === 'danger') {
    return {
      shell:
        'border-rose-500/85 bg-rose-50 text-rose-950 ring-1 ring-rose-400/50 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.25)]',
      focusRing: 'focus-visible:ring-rose-600',
      tempoClass: 'text-rose-950 font-semibold',
    };
  }
  if (tempo === 'warning') {
    return {
      shell:
        'border-amber-500/85 bg-amber-50 text-amber-950 ring-1 ring-amber-300/55 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)]',
      focusRing: 'focus-visible:ring-amber-600',
      tempoClass: 'text-amber-950 font-semibold',
    };
  }
  if (manut) {
    return {
      shell: 'border-orange-400 bg-orange-50 text-orange-950 ring-1 ring-orange-300/50',
      focusRing: 'focus-visible:ring-orange-600',
      tempoClass: 'text-slate-700 font-medium',
    };
  }
  return {
    shell: 'border-blue-200 bg-blue-50/90 text-blue-950 ring-1 ring-blue-200/50',
    focusRing: 'focus-visible:ring-blue-500',
    tempoClass: 'text-slate-700 font-medium',
  };
}

function CarrinhoEmUsoCard({
  c,
  etapaInicioIso,
  secaoNome,
  onSelect,
  nowMs,
}: {
  c: CarrinhoComUsoDetalhe;
  etapaInicioIso: string | null;
  secaoNome: string;
  onSelect: () => void;
  nowMs: number;
}) {
  const manut = c.ativo && c.precisa_reparos;
  const t0 = etapaInicioIso ? Date.parse(etapaInicioIso) : NaN;
  const elapsedMs = Number.isFinite(t0) ? Math.max(0, nowMs - t0) : NaN;
  const tempoFmt = formatDuracaoNaEtapa(elapsedMs);
  const nivel = nivelDuracaoEtapa(elapsedMs);
  /** Destaque temporal prevalece sobre manutenção na borda/fundo */
  const { shell, focusRing, tempoClass } = shellsCarrinhoEmUsoCard(manut, nivel);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Carrinho ${c.numero}, secção ${secaoNome}. Tempo nesta etapa: ${tempoFmt}. Abrir detalhes.`}
      className={`flex min-w-[6.85rem] max-w-[12rem] min-h-[52px] flex-col gap-0.5 rounded-lg border px-2 py-2 text-left shadow-sm transition hover:brightness-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${focusRing} ${shell}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-sm font-bold tabular-nums leading-none">#{c.numero}</span>
        {manut && (
          <span className="shrink-0 rounded bg-orange-200/90 px-1 py-0.5 text-[9px] font-semibold uppercase leading-none text-orange-950">
            Reparo
          </span>
        )}
      </div>
      <span className={`text-[10px] tabular-nums leading-tight ${tempoClass}`}>{tempoFmt}</span>
    </button>
  );
}

/** Carrinho em uso sem fermentação nem pós-forno nos logs (marcação manual). */
function CarrinhoEmUsoCardOutros({ c, onSelect }: { c: CarrinhoComUsoDetalhe; onSelect: () => void }) {
  const occs = c.uso_ocorrencias ?? [];
  const resumo = usoResumoOuManual(occs);
  const manut = c.ativo && c.precisa_reparos;
  const shell = manut
    ? 'border-orange-400 bg-orange-50 text-orange-950 ring-1 ring-orange-300/50'
    : 'border-blue-200 bg-blue-50/90 text-blue-950 ring-1 ring-blue-200/50';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Carrinho ${c.numero}, ${resumo}. Abrir detalhes.`}
      className={`flex min-w-[6.85rem] max-w-[11.5rem] flex-col gap-0.5 rounded-lg border px-2 py-2 text-left shadow-sm transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${shell}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-sm font-bold tabular-nums leading-none">#{c.numero}</span>
        {manut && (
          <span className="shrink-0 rounded bg-orange-200/90 px-1 py-0.5 text-[9px] font-semibold uppercase leading-none text-orange-950">
            Reparo
          </span>
        )}
      </div>
      <span className="line-clamp-2 text-[10px] font-medium leading-tight text-slate-700">{resumo}</span>
    </button>
  );
}

function CarrinhoUsoDetalheModal({
  open,
  onClose,
  carrinho,
  nowMs,
}: {
  open: boolean;
  onClose: () => void;
  carrinho: CarrinhoComUsoDetalhe | null;
  nowMs: number;
}) {
  if (!open || !carrinho) return null;

  const occs = carrinho.uso_ocorrencias ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-md flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Carrinho #{carrinho.numero}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {occs.length === 0 ? (
            <p className="text-sm text-slate-600">
              Este carrinho está marcado como em uso, mas não há registo detalhado nas etapas (pode
              ser marcação manual).
            </p>
          ) : (
            <ul className="space-y-4">
              {occs.map((o, idx) => (
                <li
                  key={`${o.etapa}-${o.ordem_producao_id}-${o.fermentacao_log_id ?? ''}-${o.saida_forno_log_id ?? ''}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        o.etapa === 'fermentacao'
                          ? 'bg-violet-100 text-violet-900'
                          : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      {etiquetaEtapaCurta(o.etapa)}
                    </span>
                    <Link
                      href={hrefEtapaProducao(o.ordem_producao_id, o.etapa)}
                      onClick={onClose}
                      className="text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
                    >
                      Abrir etapa na OP
                    </Link>
                  </div>
                  <dl className="space-y-1.5 text-sm text-slate-800">
                    {(() => {
                      const t0 = o.etapa_inicio_iso ? Date.parse(o.etapa_inicio_iso) : NaN;
                      const elapsed = Number.isFinite(t0) ? Math.max(0, nowMs - t0) : NaN;
                      const txt = formatDuracaoNaEtapa(elapsed);
                      const niv = nivelDuracaoEtapa(elapsed);
                      const cor =
                        niv === 'danger'
                          ? 'text-rose-800'
                          : niv === 'warning'
                            ? 'text-amber-900'
                            : 'text-slate-800';
                      return (
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Tempo nesta etapa</dt>
                          <dd className={`font-semibold tabular-nums ${cor}`}>
                            {txt}
                          </dd>
                        </div>
                      );
                    })()}
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Produto</dt>
                      <dd className="font-medium">{o.produto_nome?.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Lote (OP)</dt>
                      <dd className="font-mono text-xs">{o.lote_codigo?.trim() || o.ordem_producao_id}</dd>
                    </div>
                    {o.etapa === 'fermentacao' && (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Assadeiras (latas LT)</dt>
                        <dd>
                          {o.assadeiras_total != null ? (
                            <span className="tabular-nums font-semibold">{o.assadeiras_total}</span>
                          ) : (
                            <span className="text-slate-500">Não indicado no registo</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {o.etapa === 'pos_forno' && (
                      <>
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Latas na saída do forno</dt>
                          <dd>
                            {o.assadeiras_total != null ? (
                              <span className="tabular-nums font-semibold">{o.assadeiras_total}</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                            <span className="text-slate-500"> (bandejas / LT)</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Ainda por embalar</dt>
                          <dd>
                            {o.latas_restantes_embalagem != null ? (
                              <span className="tabular-nums font-semibold text-amber-900">
                                {o.latas_restantes_embalagem}
                              </span>
                            ) : (
                              '—'
                            )}
                            <span className="text-slate-500"> lata(s)</span>
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CarrinhoNumeroTile({
  numero,
  tone,
}: {
  numero: number;
  tone: 'em_uso' | 'disponivel' | 'inativo' | 'manutencao';
}) {
  const classes =
    tone === 'manutencao'
      ? 'border-orange-500 bg-orange-200 text-orange-950 ring-1 ring-orange-500/40'
      : tone === 'em_uso'
      ? 'border-blue-200 bg-blue-50 text-blue-900'
      : tone === 'inativo'
        ? 'border-slate-300 bg-slate-100 text-slate-700'
        : 'border-slate-200 bg-white text-slate-900';
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-semibold shadow-sm ${classes}`}
      title={`Carrinho ${numero}`}
    >
      {numero}
    </div>
  );
}

function ListaCarrinhosModal({
  open,
  onClose,
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
                  placeholder="Ex.: 12"
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
                  placeholder="Ex.: 1"
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Até *</span>
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  value={novoNumeroFinal}
                  onChange={(e) => setNovoNumeroFinal(e.target.value)}
                  placeholder="Ex.: 20"
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
                  placeholder="Ex.: 20"
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
                        <button
                          type="button"
                          onClick={() => setEditingId(expandido ? null : c.id)}
                          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {expandido ? 'Fechar' : 'Editar'}
                        </button>
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
  const [detalheCarrinho, setDetalheCarrinho] = useState<CarrinhoComUsoDetalhe | null>(null);
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

  const emUsoRows = useMemo(() => list.filter((c) => c.ativo && c.em_uso), [list]);
  const nowMs = usePeriodicNow(30_000);

  const carrinhosFermentacao = useMemo(
    () => carrinhosNaEtapaOrdenados(emUsoRows, 'fermentacao'),
    [emUsoRows],
  );
  const carrinhosResfriamento = useMemo(
    () => carrinhosNaEtapaOrdenados(emUsoRows, 'pos_forno'),
    [emUsoRows],
  );
  const carrinhosEmUsoOutros = useMemo(
    () =>
      emUsoRows.filter(
        (c) =>
          !(c.uso_ocorrencias ?? []).some(
            (o) => o.etapa === 'fermentacao' || o.etapa === 'pos_forno',
          ),
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

      <section className="flex flex-col gap-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Em uso</h2>
        {emUsoRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            Nenhum carrinho em uso.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-violet-900">Fermentação</h3>
                <p className="text-xs text-slate-500">
                  Mais tempo nesta etapa primeiro; aviso acima de 2&nbsp;h, alerta forte acima de 3&nbsp;h.
                </p>
              </div>
              {carrinhosFermentacao.length === 0 ? (
                <p className="rounded-lg border border-dashed border-violet-200/80 bg-violet-50/40 px-4 py-5 text-center text-sm text-slate-600">
                  Nenhum carrinho nesta fermentação.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {carrinhosFermentacao.map(({ c, etapaInicioIso }) => (
                    <CarrinhoEmUsoCard
                      key={c.id}
                      c={c}
                      etapaInicioIso={etapaInicioIso}
                      secaoNome="fermentação"
                      nowMs={nowMs}
                      onSelect={() => setDetalheCarrinho(c)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-sky-900">Resfriamento (pós-forno)</h3>
                <p className="text-xs text-slate-500">
                  Mais tempo nesta etapa primeiro; mesmos limites de 2&nbsp;h e 3&nbsp;h.
                </p>
              </div>
              {carrinhosResfriamento.length === 0 ? (
                <p className="rounded-lg border border-dashed border-sky-200/80 bg-sky-50/40 px-4 py-5 text-center text-sm text-slate-600">
                  Nenhum carrinho no resfriamento.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {carrinhosResfriamento.map(({ c, etapaInicioIso }) => (
                    <CarrinhoEmUsoCard
                      key={c.id}
                      c={c}
                      etapaInicioIso={etapaInicioIso}
                      secaoNome="resfriamento (pós-forno)"
                      nowMs={nowMs}
                      onSelect={() => setDetalheCarrinho(c)}
                    />
                  ))}
                </div>
              )}
            </div>

            {carrinhosEmUsoOutros.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Outros em uso</h3>
                  <p className="text-xs text-slate-500">
                    Carrinhos marcados em uso sem registo em fermentação ou pós-forno.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {carrinhosEmUsoOutros.map((c) => (
                    <CarrinhoEmUsoCardOutros
                      key={c.id}
                      c={c}
                      onSelect={() => setDetalheCarrinho(c)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <CarrinhoUsoDetalheModal
        open={detalheCarrinho != null}
        onClose={() => setDetalheCarrinho(null)}
        carrinho={detalheCarrinho}
        nowMs={nowMs}
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
                numero={c.numero}
                tone={c.ativo && c.precisa_reparos ? 'manutencao' : 'disponivel'}
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
              <CarrinhoNumeroTile key={c.id} numero={c.numero} tone="inativo" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
