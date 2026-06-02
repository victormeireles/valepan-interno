'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteAssadeira, updateAssadeira, type AssadeiraRow } from '@/app/actions/assadeiras-actions';
import {
  saveAssadeiraClienteBloqueios,
  saveProdutoLatasPermitidas,
  type ClienteLatasRow,
  type ProdutoLatasRow,
} from '@/app/actions/latas-cadastro-actions';
import {
  LATAS_FIELD_CLASS,
  buildProdutoLataMapForAssadeira,
  defaultUnidadesPorLata,
  extractPesoKey,
  mergeVinculosForProduto,
  vinculosPayloadChanged,
  type EntryState,
} from './latas-edit-utils';

type TabId = 'dados' | 'produtos' | 'clientes';

type Props = {
  open: boolean;
  assadeira: AssadeiraRow;
  produtos: ProdutoLatasRow[];
  clientes: ClienteLatasRow[];
  bloqueadosClienteIds: string[];
  assadeirasSorted: AssadeiraRow[];
  onClose: () => void;
  onRefreshProdutos: () => Promise<void>;
  onRefreshAssadeiras: () => Promise<void>;
  onRefreshBloqueios: () => Promise<void>;
  onMessage: (m: { type: 'ok' | 'err'; text: string } | null) => void;
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dados', label: 'Dados', icon: 'tune' },
  { id: 'produtos', label: 'Produtos', icon: 'bakery_dining' },
  { id: 'clientes', label: 'Exclusões', icon: 'block' },
];

export default function EditarLataPanel({
  open,
  assadeira,
  produtos,
  clientes,
  bloqueadosClienteIds,
  assadeirasSorted,
  onClose,
  onRefreshProdutos,
  onRefreshAssadeiras,
  onRefreshBloqueios,
  onMessage,
}: Props) {
  const [tab, setTab] = useState<TabId>('dados');
  const [nome, setNome] = useState(assadeira.nome);
  const [numeroBuracos, setNumeroBuracos] = useState(String(assadeira.numero_buracos ?? 0));
  const [quantidadeLatas, setQuantidadeLatas] = useState(String(assadeira.quantidade_latas ?? 0));
  const [descricao, setDescricao] = useState(assadeira.descricao ?? '');
  const [ativo, setAtivo] = useState(assadeira.ativo);
  const [map, setMap] = useState<Record<string, EntryState>>(() =>
    buildProdutoLataMapForAssadeira(produtos, assadeira.id),
  );
  const [mapBloqueioCliente, setMapBloqueioCliente] = useState<Record<string, boolean>>({});
  const [buscaProdutos, setBuscaProdutos] = useState('');
  const [pesoSelecionado, setPesoSelecionado] = useState('');
  const [buscaClientesExclusao, setBuscaClientesExclusao] = useState('');
  const [savingLata, setSavingLata] = useState(false);
  const [savingCompat, setSavingCompat] = useState(false);
  const [savingBloqueios, setSavingBloqueios] = useState(false);
  const [deletingLata, setDeletingLata] = useState(false);

  const busy = savingLata || savingCompat || savingBloqueios || deletingLata;
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab('dados');
    setNome(assadeira.nome);
    setNumeroBuracos(String(assadeira.numero_buracos ?? 0));
    setQuantidadeLatas(String(assadeira.quantidade_latas ?? 0));
    setDescricao(assadeira.descricao ?? '');
    setAtivo(assadeira.ativo);
    setMap(buildProdutoLataMapForAssadeira(produtos, assadeira.id));
    const m: Record<string, boolean> = {};
    for (const c of clientes) {
      m[c.id] = bloqueadosClienteIds.includes(c.id);
    }
    setMapBloqueioCliente(m);
    setBuscaProdutos('');
    setPesoSelecionado('');
    setBuscaClientesExclusao('');
  }, [open, assadeira, produtos, clientes, bloqueadosClienteIds]);

  const buracosPreview = useMemo(() => {
    const br = Math.round(Number(numeroBuracos.trim().replace(',', '.')) || 0);
    return br > 0 ? br : null;
  }, [numeroBuracos]);

  const produtosFiltradosPainel = useMemo(() => {
    const q = buscaProdutos.toLowerCase().trim();
    const base = [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!q) return base;
    return base.filter(
      (p) => p.nome.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q),
    );
  }, [produtos, buscaProdutos]);

  const opcoesPesoProdutos = useMemo(() => {
    const pesos = new Set<string>();
    for (const p of produtos) {
      const peso = extractPesoKey(`${p.nome} ${p.codigo ?? ''}`);
      if (peso) pesos.add(peso);
    }
    return [...pesos].sort((a, b) => {
      const na = Number(a.replace('g', ''));
      const nb = Number(b.replace('g', ''));
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b, 'pt-BR');
    });
  }, [produtos]);

  const clientesFiltradosExclusao = useMemo(() => {
    const q = buscaClientesExclusao.toLowerCase().trim();
    const base = [...clientes].sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia, 'pt-BR'));
    if (!q) return base;
    return base.filter(
      (c) =>
        c.nome_fantasia.toLowerCase().includes(q) || c.razao_social.toLowerCase().includes(q),
    );
  }, [clientes, buscaClientesExclusao]);

  const nProdutosCompatMarcados = useMemo(
    () => Object.values(map).filter((e) => e.checked).length,
    [map],
  );

  const nClientesExclusaoMarcados = useMemo(
    () => clientes.filter((c) => mapBloqueioCliente[c.id]).length,
    [clientes, mapBloqueioCliente],
  );

  const aplicarSelecaoPorPeso = useCallback(
    (checked: boolean) => {
      if (!pesoSelecionado) return;
      setMap((prev) => {
        const next = { ...prev };
        for (const p of produtos) {
          const peso = extractPesoKey(`${p.nome} ${p.codigo ?? ''}`);
          if (peso !== pesoSelecionado) continue;
          const atual = next[p.id] ?? { checked: false, unidades: '' };
          const unidadesDefault = defaultUnidadesPorLata(assadeira, p);
          next[p.id] = {
            checked,
            unidades: checked ? atual.unidades || unidadesDefault : '',
          };
        }
        return next;
      });
    },
    [pesoSelecionado, produtos, assadeira],
  );

  const handleSaveLata = async (): Promise<boolean> => {
    setSavingLata(true);
    onMessage(null);
    const qlRaw = quantidadeLatas.trim();
    const ql = parseInt(qlRaw, 10);
    if (qlRaw === '' || !Number.isFinite(ql) || ql < 0) {
      onMessage({ type: 'err', text: 'Informe a quantidade de latas (número inteiro ≥ 0).' });
      setSavingLata(false);
      setTab('dados');
      return false;
    }
    if (!nome.trim()) {
      onMessage({ type: 'err', text: 'Informe o nome da lata.' });
      setSavingLata(false);
      setTab('dados');
      return false;
    }
    const nbRaw = numeroBuracos.trim();
    const nb = parseInt(nbRaw, 10);
    if (nbRaw === '' || !Number.isFinite(nb) || nb < 0) {
      onMessage({ type: 'err', text: 'Informe o número de buracos (inteiro ≥ 0).' });
      setSavingLata(false);
      setTab('dados');
      return false;
    }
    const res = await updateAssadeira({
      id: assadeira.id,
      nome,
      codigo: assadeira.codigo?.trim() ? assadeira.codigo.trim() : null,
      ordem: assadeira.ordem,
      ativo,
      numeroBuracos: nb,
      quantidadeLatas: ql,
      descricao: descricao.trim() || null,
      diametroBuracosMm:
        assadeira.diametro_buracos_mm != null && Number.isFinite(Number(assadeira.diametro_buracos_mm))
          ? Number(assadeira.diametro_buracos_mm)
          : null,
    });
    setSavingLata(false);
    if (!res.success) {
      onMessage({ type: 'err', text: res.error ?? 'Erro ao guardar a lata.' });
      setTab('dados');
      return false;
    }
    await onRefreshAssadeiras();
    return true;
  };

  const handleSaveCompat = async (): Promise<boolean> => {
    setSavingCompat(true);
    onMessage(null);
    for (const p of produtos) {
      const entry = map[p.id] ?? { checked: false, unidades: '' };
      const merged = mergeVinculosForProduto(p, assadeira.id, entry, assadeirasSorted);
      if (merged === 'invalid') {
        onMessage({
          type: 'err',
          text: `«${p.nome}»: indique unidades inteiras > 0 para cada produto marcado.`,
        });
        setSavingCompat(false);
        setTab('produtos');
        return false;
      }
      if (!vinculosPayloadChanged(p.vinculos, merged)) continue;
      const res = await saveProdutoLatasPermitidas({ produtoId: p.id, vinculos: merged });
      if (!res.success) {
        onMessage({ type: 'err', text: res.error ?? `Erro ao guardar «${p.nome}».` });
        setSavingCompat(false);
        setTab('produtos');
        return false;
      }
    }
    setSavingCompat(false);
    await onRefreshProdutos();
    return true;
  };

  const handleSaveBloqueios = async (): Promise<boolean> => {
    setSavingBloqueios(true);
    onMessage(null);
    const ids = clientes.filter((c) => mapBloqueioCliente[c.id]).map((c) => c.id);
    const res = await saveAssadeiraClienteBloqueios({
      assadeiraId: assadeira.id,
      clienteIdsBloqueados: ids,
    });
    setSavingBloqueios(false);
    if (!res.success) {
      onMessage({ type: 'err', text: res.error ?? 'Erro ao guardar exclusões.' });
      setTab('clientes');
      return false;
    }
    await onRefreshBloqueios();
    return true;
  };

  const handleSaveAll = async () => {
    const okLata = await handleSaveLata();
    if (!okLata) return;
    const okCompat = await handleSaveCompat();
    if (!okCompat) return;
    const okBloqueios = await handleSaveBloqueios();
    if (!okBloqueios) return;
    onMessage({ type: 'ok', text: 'Lata atualizada com sucesso.' });
    onClose();
  };

  const handleDeleteLata = async () => {
    const ok = window.confirm(
      `Excluir a lata "${assadeira.nome}"? Remove vínculos com produtos e exclusões de clientes.`,
    );
    if (!ok) return;
    setDeletingLata(true);
    onMessage(null);
    const res = await deleteAssadeira({ id: assadeira.id });
    setDeletingLata(false);
    if (!res.success) {
      onMessage({ type: 'err', text: res.error ?? 'Erro ao excluir a lata.' });
      return;
    }
    onMessage({ type: 'ok', text: 'Lata excluída.' });
    onClose();
    await onRefreshProdutos();
    await onRefreshBloqueios();
    await onRefreshAssadeiras();
  };

  if (!open || !portalReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          aria-label="Fechar"
          disabled={busy}
          onClick={() => !busy && onClose()}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="editar-lata-titulo"
          className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
            <PanelHeaderTitle assadeira={assadeira} buracosPreview={buracosPreview} />
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              aria-label="Fechar"
            >
              <span className="material-icons">close</span>
            </button>
          </header>

          <nav
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/80 px-3 py-2 sm:px-4"
            aria-label="Secções"
          >
            {TABS.map((t) => {
              const badge =
                t.id === 'produtos'
                  ? nProdutosCompatMarcados
                  : t.id === 'clientes'
                    ? nClientesExclusaoMarcados
                    : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span className="material-icons text-base">{t.icon}</span>
                  {t.label}
                  {badge != null && badge > 0 ? (
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {tab === 'dados' && (
              <div className="space-y-5">
                <p className="text-sm text-slate-600">
                  Buracos definem unidades por lata na ordem de produção e no cálculo de caixas.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome" required className="sm:col-span-2">
                    <input
                      className={LATAS_FIELD_CLASS}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      disabled={busy}
                    />
                  </Field>
                  <Field
                    label="N.º de buracos"
                    required
                    hint="Unidades por lata (prioridade na ordem de produção)."
                  >
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={LATAS_FIELD_CLASS}
                      value={numeroBuracos}
                      onChange={(e) => setNumeroBuracos(e.target.value)}
                      disabled={busy}
                    />
                  </Field>
                  <Field label="Quantidade de latas" required hint="Capacidade em latas.">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={LATAS_FIELD_CLASS}
                      value={quantidadeLatas}
                      onChange={(e) => setQuantidadeLatas(e.target.value)}
                      disabled={busy}
                    />
                  </Field>
                  <Field label="Descrição" className="sm:col-span-2">
                    <textarea
                      rows={2}
                      className={`${LATAS_FIELD_CLASS} min-h-[4rem] resize-y`}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      disabled={busy}
                    />
                  </Field>
                </div>
                {buracosPreview != null ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
                    <span className="font-semibold">{buracosPreview} un./lata</span> na ordem de
                    produção e estimativa de caixas.
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
                    Com buracos em zero, usa-se «Un. / lata» de cada produto compatível.
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    disabled={busy}
                  />
                  <span className="text-sm font-medium text-slate-800">Lata ativa</span>
                </label>
              </div>
            )}

            {tab === 'produtos' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Produtos que podem usar esta lata na ordem de produção.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="material-icons text-slate-400">search</span>
                  <input
                    type="text"
                    placeholder="Filtrar produtos…"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    value={buscaProdutos}
                    onChange={(e) => setBuscaProdutos(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
                  <span className="text-xs font-semibold text-blue-900">Por peso</span>
                  <select
                    value={pesoSelecionado}
                    onChange={(e) => setPesoSelecionado(e.target.value)}
                    disabled={busy || opcoesPesoProdutos.length === 0}
                    className="min-w-[100px] rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">Peso…</option>
                    {opcoesPesoProdutos.map((peso) => (
                      <option key={peso} value={peso}>
                        {peso}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !pesoSelecionado}
                    onClick={() => aplicarSelecaoPorPeso(true)}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Marcar
                  </button>
                  <button
                    type="button"
                    disabled={busy || !pesoSelecionado}
                    onClick={() => aplicarSelecaoPorPeso(false)}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Desmarcar
                  </button>
                  <button
                    type="button"
                    disabled={busy || nProdutosCompatMarcados === 0}
                    onClick={() =>
                      setMap((prev) => {
                        const next = { ...prev };
                        for (const p of produtos) next[p.id] = { checked: false, unidades: '' };
                        return next;
                      })
                    }
                    className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Limpar tudo
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-10 p-2" />
                        <th className="p-2 font-semibold">Produto</th>
                        <th className="w-28 p-2 text-right font-semibold">Un. / lata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosFiltradosPainel.map((p) => {
                        const e = map[p.id] ?? { checked: false, unidades: '' };
                        const unidadesDefault = defaultUnidadesPorLata(assadeira, p);
                        return (
                          <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                            <td className="p-2 align-middle">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600"
                                checked={e.checked}
                                disabled={busy}
                                onChange={(ev) => {
                                  const checked = ev.target.checked;
                                  setMap((prev) => {
                                    const cur = prev[p.id] ?? { checked: false, unidades: '' };
                                    return {
                                      ...prev,
                                      [p.id]: {
                                        checked,
                                        unidades: checked ? cur.unidades || unidadesDefault : '',
                                      },
                                    };
                                  });
                                }}
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <div className="font-medium text-slate-900">{p.nome}</div>
                              <div className="font-mono text-[11px] text-slate-500">{p.codigo}</div>
                            </td>
                            <td className="p-2 align-middle text-right">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                className="ml-auto w-full max-w-[5.5rem] rounded-lg border border-slate-200 px-2 py-1 text-right text-sm tabular-nums"
                                value={e.unidades}
                                disabled={busy || !e.checked}
                                onChange={(ev) =>
                                  setMap((prev) => ({
                                    ...prev,
                                    [p.id]: { checked: true, unidades: ev.target.value },
                                  }))
                                }
                                placeholder="—"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'clientes' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Clientes que <strong>não</strong> podem usar esta lata na ordem.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="material-icons text-slate-400">search</span>
                  <input
                    type="text"
                    placeholder="Filtrar clientes…"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    value={buscaClientesExclusao}
                    onChange={(e) => setBuscaClientesExclusao(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {clientes.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">Sem clientes carregados.</p>
                  ) : (
                    clientesFiltradosExclusao.map((c) => (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50 ${
                          c.ativo === false ? 'opacity-60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-rose-600"
                          checked={Boolean(mapBloqueioCliente[c.id])}
                          disabled={busy}
                          onChange={(e) =>
                            setMapBloqueioCliente((prev) => ({ ...prev, [c.id]: e.target.checked }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{c.nome_fantasia}</span>
                          <span className="block truncate text-xs text-slate-500">{c.razao_social}</span>
                          {c.ativo === false && (
                            <span className="text-[11px] text-rose-600">Inativo</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDeleteLata()}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {deletingLata ? 'Excluindo…' : 'Excluir'}
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveAll()}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {busy ? 'A guardar…' : 'Salvar tudo'}
              </button>
            </div>
          </footer>
        </aside>
    </div>,
    document.body,
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PanelHeaderTitle({
  assadeira,
  buracosPreview,
}: {
  assadeira: AssadeiraRow;
  buracosPreview: number | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editar lata</p>
      <h2 id="editar-lata-titulo" className="truncate text-lg font-bold text-slate-900">
        {assadeira.nome}
      </h2>
      <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
        {buracosPreview != null ? `${buracosPreview} buracos` : 'Sem buracos'} ·{' '}
        {assadeira.quantidade_latas ?? 0} qtd. latas
        {!assadeira.ativo ? ' · Inativa' : ''}
      </p>
    </div>
  );
}
