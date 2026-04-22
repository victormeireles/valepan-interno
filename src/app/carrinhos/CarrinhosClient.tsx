'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CarrinhoRow } from '@/app/actions/carrinhos-actions';
import { createCarrinho, updateCarrinho } from '@/app/actions/carrinhos-actions';

type FilterKey = 'todos' | 'disponiveis' | 'em_uso' | 'reparos' | 'inativos';

const CAPACIDADE_PADRAO_NOVO_CARRINHO = '20';

function parseIntSafe(value: string, fallback: number): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** No banco existem duas colunas históricas; no produto bandeja = lata (mesma medida). */
function capacidadeUnificada(c: CarrinhoRow): number {
  return Math.max(c.bandejas, c.quantidade_latas);
}

function CarrinhoCard({
  c,
  onSaved,
}: {
  c: CarrinhoRow;
  onSaved: () => void;
}) {
  const [numero, setNumero] = useState(String(c.numero));
  const [capacidade, setCapacidade] = useState(String(capacidadeUnificada(c)));
  const [precisaReparos, setPrecisaReparos] = useState(c.precisa_reparos);
  const [emUso, setEmUso] = useState(c.em_uso);
  const [latasOcupadas, setLatasOcupadas] = useState(String(c.latas_ocupadas));
  const [ativo, setAtivo] = useState(c.ativo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNumero(String(c.numero));
    setCapacidade(String(capacidadeUnificada(c)));
    setPrecisaReparos(c.precisa_reparos);
    setEmUso(c.em_uso);
    setLatasOcupadas(String(c.latas_ocupadas));
    setAtivo(c.ativo);
  }, [c]);

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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Carrinho #{numero || '—'}</span>
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
          <span className="text-slate-600">Capacidade máxima (bandejas = latas)</span>
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
          <span className="text-slate-700">Em uso (fermentação, forno ou embalagem)</span>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-slate-600">Quantidade no carrinho agora (mesma unidade)</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            value={latasOcupadas}
            onChange={(e) => setLatasOcupadas(e.target.value)}
            inputMode="numeric"
            disabled={!emUso}
            placeholder={emUso ? 'Ex.: 20' : 'Marque “Em uso” para informar'}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={precisaReparos} onChange={(e) => setPrecisaReparos(e.target.checked)} />
          <span className="text-slate-700">Precisa de reparos</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="text-slate-700">Ativo no cadastro</span>
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
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

export default function CarrinhosClient({
  initialList,
  loadError,
}: {
  initialList: CarrinhoRow[];
  loadError?: string;
}) {
  const [list, setList] = useState<CarrinhoRow[]>(initialList);
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [novoNumero, setNovoNumero] = useState('');
  const [novoCapacidade, setNovoCapacidade] = useState(CAPACIDADE_PADRAO_NOVO_CARRINHO);
  const [novoPrecisaReparos, setNovoPrecisaReparos] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const ativos = list.filter((x) => x.ativo);
    const emUso = ativos.filter((x) => x.em_uso).length;
    const livres = ativos.filter((x) => !x.em_uso).length;
    const reparos = list.filter((x) => x.precisa_reparos).length;
    const inativos = list.filter((x) => !x.ativo).length;
    return { total: list.length, ativos: ativos.length, livres, emUso, reparos, inativos };
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((c) => {
      switch (filter) {
        case 'disponiveis':
          return c.ativo && !c.em_uso;
        case 'em_uso':
          return c.ativo && c.em_uso;
        case 'reparos':
          return c.precisa_reparos;
        case 'inativos':
          return !c.ativo;
        default:
          return true;
      }
    });
  }, [list, filter]);

  const reload = useCallback(async () => {
    const mod = await import('@/app/actions/carrinhos-actions');
    const res = await mod.getCarrinhos();
    if (res.ok) setList(res.list);
  }, []);

  const criar = useCallback(async () => {
    setCreating(true);
    setCreateError(null);
    const n = parseIntSafe(novoNumero, 0);
    if (n <= 0) {
      setCreateError('Informe um número válido para o carrinho.');
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Como usar o cadastro</p>
        <p className="mt-2 leading-relaxed">
          Cada carrinho tem um <strong>número</strong> fixo. A <strong>capacidade máxima</strong> usa a mesma unidade
          para bandejas e latas (são equivalentes). Quando carregar o carrinho (fermentação, retorno do forno ou caminho
          para embalagem), marque <strong>Em uso</strong> e a <strong>quantidade no carrinho agora</strong>. Ao
          esvaziar, desmarque <strong>Em uso</strong> — as latas ocupadas zeram automaticamente. Use{' '}
          <strong>Precisa de reparos</strong> para manutenção e <strong>Inativo</strong> para carrinhos fora de linha.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-semibold text-slate-900">{stats.livres}</div>
          <div className="text-xs text-slate-600">Disponíveis (livres)</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-semibold text-amber-800">{stats.emUso}</div>
          <div className="text-xs text-slate-600">Em uso agora</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-semibold text-rose-800">{stats.reparos}</div>
          <div className="text-xs text-slate-600">Com reparo pendente</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-semibold text-slate-700">{stats.inativos}</div>
          <div className="text-xs text-slate-600">Inativos</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['todos', 'Todos'],
            ['disponiveis', 'Disponíveis'],
            ['em_uso', 'Em uso'],
            ['reparos', 'Reparos'],
            ['inativos', 'Inativos'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Novo carrinho</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Número *</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value)}
              placeholder="Ex.: 12"
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-slate-600">Capacidade máxima (bandejas = latas)</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={novoCapacidade}
              onChange={(e) => setNovoCapacidade(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={novoPrecisaReparos} onChange={(e) => setNovoPrecisaReparos(e.target.checked)} />
            <span>Já precisa de reparos</span>
          </label>
        </div>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={criar}
            disabled={creating}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {creating ? 'Criando…' : 'Criar carrinho'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-500">Nenhum carrinho neste filtro.</p>
        ) : (
          filtered.map((c) => <CarrinhoCard key={c.id} c={c} onSaved={reload} />)
        )}
      </div>
    </div>
  );
}
