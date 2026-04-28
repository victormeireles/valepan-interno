'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CarrinhoRow } from '@/app/actions/carrinhos-actions';
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
  list: CarrinhoRow[];
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
  initialList: CarrinhoRow[];
  loadError?: string;
}) {
  const [list, setList] = useState<CarrinhoRow[]>(initialList);
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Em uso</h2>
        {emUsoRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            Nenhum carrinho em uso.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {emUsoRows.map((c) => (
              <CarrinhoNumeroTile
                key={c.id}
                numero={c.numero}
                tone={c.ativo && c.precisa_reparos ? 'manutencao' : 'em_uso'}
              />
            ))}
          </div>
        )}
      </section>

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
