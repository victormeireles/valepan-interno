'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
  getAssadeiras,
  type AssadeiraRow,
} from '@/app/actions/assadeiras-actions';
import {
  getClientesLatas,
  getProdutosLatas,
  saveProdutoLatasPermitidas,
  toggleProdutoLatasConferido,
  updateClienteSomenteLataAntiga,
  type ClienteLatasRow,
  type ProdutoLatasRow,
} from '@/app/actions/latas-cadastro-actions';
import GerenciarAssadeirasModal from './GerenciarAssadeirasModal';

type Tab = 'produtos' | 'clientes';

interface LatasCadastroClientProps {
  produtosInicial: ProdutoLatasRow[];
  clientesInicial: ClienteLatasRow[];
  assadeirasInicial: AssadeiraRow[];
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type StatusCadastro = 'ok' | 'incompleto' | 'vazio';

function CadastroBadge({ status }: { status: StatusCadastro }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        OK
      </span>
    );
  }
  if (status === 'incompleto') {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
        Incompleto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      Sem lata
    </span>
  );
}

type EntryState = { checked: boolean; unidades: string };

function buildInitialMap(
  row: ProdutoLatasRow,
  assadeiras: AssadeiraRow[],
): Record<string, EntryState> {
  const m: Record<string, EntryState> = {};
  for (const a of assadeiras) {
    const v = row.vinculos.find((x) => x.assadeira_id === a.id);
    m[a.id] = {
      checked: !!v,
      unidades: v ? String(v.unidades_por_assadeira) : '',
    };
  }
  return m;
}

export default function LatasCadastroClient({
  produtosInicial,
  clientesInicial,
  assadeirasInicial,
}: LatasCadastroClientProps) {
  const [tab, setTab] = useState<Tab>('produtos');
  const [produtos, setProdutos] = useState(produtosInicial);
  const [clientes, setClientes] = useState(clientesInicial);
  const [assadeiras, setAssadeiras] = useState(assadeirasInicial);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingBatchProdutos, setSavingBatchProdutos] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const produtoSaveFns = useRef<Map<string, () => Promise<boolean>>>(new Map());
  const [modalAssadeirasOpen, setModalAssadeirasOpen] = useState(false);

  const produtosFiltrados = useMemo(() => {
    const q = buscaProduto.toLowerCase().trim();
    if (!q) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q),
    );
  }, [produtos, buscaProduto]);

  const clientesFiltrados = useMemo(() => {
    const q = buscaCliente.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome_fantasia.toLowerCase().includes(q) ||
        c.razao_social.toLowerCase().includes(q),
    );
  }, [clientes, buscaCliente]);

  const refreshProdutos = async () => {
    const list = await getProdutosLatas();
    setProdutos(list);
  };

  const refreshClientes = async () => {
    const list = await getClientesLatas();
    setClientes(list);
  };

  const refreshAssadeiras = async () => {
    const r = await getAssadeiras();
    if (r.ok) setAssadeiras(r.list);
  };

  const persistProdutoLatasMap = useCallback(
    async (p: ProdutoLatasRow, map: Record<string, EntryState>): Promise<boolean> => {
      const vinculos: { assadeiraId: string; unidadesPorAssadeira: number }[] = [];
      for (const [assadeiraId, e] of Object.entries(map)) {
        if (!e.checked) continue;
        const u = parseOptionalInt(e.unidades);
        if (u == null) {
          setMsg({
            type: 'err',
            text: `Produto «${p.nome}»: preencha unidades inteiras maiores que zero para cada lata marcada.`,
          });
          return false;
        }
        vinculos.push({ assadeiraId, unidadesPorAssadeira: u });
      }

      const res = await saveProdutoLatasPermitidas({ produtoId: p.id, vinculos });
      if (!res.success) {
        setMsg({
          type: 'err',
          text: res.error ?? `Erro ao salvar o produto «${p.nome}».`,
        });
        return false;
      }
      return true;
    },
    [],
  );

  const registerProdutoSave = useCallback((id: string, fn: () => Promise<boolean>) => {
    produtoSaveFns.current.set(id, fn);
    return () => {
      produtoSaveFns.current.delete(id);
    };
  }, []);

  const handleSalvarTodosProdutos = async () => {
    setSavingBatchProdutos(true);
    setMsg(null);
    for (const p of produtosFiltrados) {
      const fn = produtoSaveFns.current.get(p.id);
      if (!fn) continue;
      const ok = await fn();
      if (!ok) {
        setSavingBatchProdutos(false);
        return;
      }
    }
    await refreshProdutos();
    setMsg({ type: 'ok', text: 'Latas dos produtos foram salvas.' });
    setSavingBatchProdutos(false);
  };

  const handleToggleConferido = async (produtoId: string, conferido: boolean) => {
    setSavingId(produtoId);
    setMsg(null);
    const res = await toggleProdutoLatasConferido(produtoId, conferido);
    setSavingId(null);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao atualizar conferência.' });
      return;
    }
    setMsg({ type: 'ok', text: 'Conferência atualizada.' });
    await refreshProdutos();
  };

  const handleToggleCliente = async (c: ClienteLatasRow, next: boolean) => {
    setSavingId(c.id);
    setMsg(null);
    const res = await updateClienteSomenteLataAntiga(c.id, next);
    setSavingId(null);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao salvar cliente.' });
      return;
    }
    setMsg({ type: 'ok', text: 'Cliente atualizado.' });
    await refreshClientes();
  };

  const vinculosKey = (p: ProdutoLatasRow) =>
    p.vinculos.map((v) => `${v.assadeira_id}:${v.unidades_por_assadeira}`).join('|');

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Latas" icon="🥖" />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        {msg && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="flex gap-2 border-b border-gray-200 pb-1">
          <button
            type="button"
            onClick={() => setTab('produtos')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              tab === 'produtos'
                ? 'bg-white text-gray-900 shadow-sm border border-b-0 border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Por produto
          </button>
          <button
            type="button"
            onClick={() => setTab('clientes')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              tab === 'clientes'
                ? 'bg-white text-gray-900 shadow-sm border border-b-0 border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Por cliente
          </button>
        </div>

        {tab === 'produtos' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 flex-1">
                <span className="material-icons text-gray-400">search</span>
                <input
                  type="text"
                  placeholder="Buscar produto por nome ou código..."
                  className="flex-1 outline-none text-gray-700 font-medium"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setModalAssadeirasOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                <span className="material-icons text-lg text-gray-600">tune</span>
                Latas cadastradas
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-3 font-semibold text-gray-600">Produto</th>
                      <th className="p-3 font-semibold text-gray-600 text-center w-28">Cadastro</th>
                      <th className="p-3 font-semibold text-gray-600 min-w-[200px]">
                        Latas permitidas
                      </th>
                      <th className="p-3 font-semibold text-gray-600 text-center w-28">Conferido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map((p) => (
                      <ProdutoLatasRowEditor
                        key={`${p.id}-${vinculosKey(p)}-${p.latas_cadastro_conferido}`}
                        row={p}
                        assadeiras={assadeiras}
                        savingBatch={savingBatchProdutos}
                        savingConferido={savingId === p.id}
                        registerSave={registerProdutoSave}
                        persistMap={persistProdutoLatasMap}
                        onToggleConferido={handleToggleConferido}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2">
              <button
                type="button"
                disabled={savingBatchProdutos || produtosFiltrados.length === 0}
                onClick={() => void handleSalvarTodosProdutos()}
                className="w-full rounded-2xl bg-gray-900 px-6 py-4 text-base font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {savingBatchProdutos ? (
                  <>
                    <span className="material-icons text-xl animate-spin">refresh</span>
                    Salvando latas dos produtos…
                  </>
                ) : (
                  <>
                    <span className="material-icons text-xl">save</span>
                    Salvar alterações dos produtos
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500">
                Aplica as latas permitidas e unidades de todos os produtos listados acima (respeita o
                filtro de busca).
              </p>
            </div>
          </div>
        )}

        {tab === 'clientes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <span className="material-icons text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar cliente por nome fantasia ou razão social..."
                className="flex-1 outline-none text-gray-700 font-medium"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-3 font-semibold text-gray-600">Cliente</th>
                      <th className="p-3 font-semibold text-gray-600 text-center w-48">
                        Só lata antiga
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{c.nome_fantasia}</div>
                          <div className="text-xs text-gray-500">{c.razao_social}</div>
                          {c.ativo === false && (
                            <span className="inline-block mt-1 text-xs text-rose-600">Inativo</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={c.somente_lata_antiga}
                              disabled={savingId === c.id}
                              onChange={(e) => handleToggleCliente(c, e.target.checked)}
                            />
                            <span className="text-gray-700">Obrigatório</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <GerenciarAssadeirasModal
        open={modalAssadeirasOpen}
        onClose={() => {
          setModalAssadeirasOpen(false);
          void refreshAssadeiras();
        }}
        onSaved={(list) => setAssadeiras(list)}
      />
    </div>
  );
}

function ProdutoLatasRowEditor({
  row,
  assadeiras,
  savingBatch,
  savingConferido,
  registerSave,
  persistMap,
  onToggleConferido,
}: {
  row: ProdutoLatasRow;
  assadeiras: AssadeiraRow[];
  savingBatch: boolean;
  savingConferido: boolean;
  registerSave: (id: string, fn: () => Promise<boolean>) => () => void;
  persistMap: (p: ProdutoLatasRow, map: Record<string, EntryState>) => Promise<boolean>;
  onToggleConferido: (produtoId: string, conferido: boolean) => void;
}) {
  const [painelAberto, setPainelAberto] = useState(false);
  const [map, setMap] = useState<Record<string, EntryState>>(() =>
    buildInitialMap(row, assadeiras),
  );

  useEffect(() => {
    setMap((prev) => {
      const next = { ...prev };
      for (const a of assadeiras) {
        if (next[a.id] === undefined) {
          const v = row.vinculos.find((x) => x.assadeira_id === a.id);
          next[a.id] = {
            checked: !!v,
            unidades: v ? String(v.unidades_por_assadeira) : '',
          };
        }
      }
      return next;
    });
  }, [assadeiras, row.vinculos, row.id]);

  const salvarEste = useCallback(
    () => persistMap(row, map),
    [persistMap, row, map],
  );

  useEffect(() => {
    return registerSave(row.id, salvarEste);
  }, [row.id, salvarEste, registerSave]);

  const statusDisplay: StatusCadastro = useMemo(() => {
    if (!painelAberto) {
      return row.vinculos.length > 0 ? 'ok' : 'vazio';
    }
    let anyChecked = false;
    for (const a of assadeiras) {
      const e = map[a.id];
      if (!e?.checked) continue;
      anyChecked = true;
      if (parseOptionalInt(e.unidades) == null) return 'incompleto';
    }
    if (!anyChecked) return 'vazio';
    return 'ok';
  }, [painelAberto, row.vinculos.length, assadeiras, map]);

  const assadeirasOrdenadas = useMemo(
    () => [...assadeiras].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [assadeiras],
  );

  const resumo = useMemo(() => {
    if (row.vinculos.length === 0) return '—';
    return row.vinculos.map((v) => `${v.nome} (${v.unidades_por_assadeira})`).join(', ');
  }, [row.vinculos]);

  const colCount = 4;

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/80">
        <td className="p-3 align-top">
          <div className="font-medium text-gray-900">{row.nome}</div>
          <div className="text-xs text-gray-500">{row.codigo}</div>
        </td>
        <td className="p-3 align-middle text-center">
          <CadastroBadge status={statusDisplay} />
        </td>
        <td className="p-3 align-top">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={painelAberto}
                disabled={savingBatch}
                onChange={(e) => setPainelAberto(e.target.checked)}
              />
              <span className="text-gray-800 font-medium">Selecionar latas</span>
            </label>
            {!painelAberto && (
              <div className="text-xs text-gray-500 line-clamp-2" title={resumo}>
                {resumo}
              </div>
            )}
          </div>
        </td>
        <td className="p-3 align-middle text-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            checked={row.latas_cadastro_conferido}
            disabled={savingConferido || savingBatch}
            onChange={(e) => onToggleConferido(row.id, e.target.checked)}
            title="Cadastro de latas conferido"
          />
        </td>
      </tr>
      {painelAberto && (
        <tr className="border-b border-gray-100 bg-slate-50/90">
          <td colSpan={colCount} className="p-4">
            {assadeirasOrdenadas.length === 0 ? (
              <p className="text-sm text-amber-800">
                Nenhuma lata cadastrada. Use o botão &quot;Latas cadastradas&quot; para criar tipos de
                assadeira.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Marque as latas que este produto pode usar e, em cada uma, informe{' '}
                  <strong className="font-semibold text-gray-800">
                    quantas unidades do produto cabem nessa lata
                  </strong>
                  .
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {assadeirasOrdenadas.map((a) => {
                    const e = map[a.id] ?? { checked: false, unidades: '' };
                    const fieldId = `unidades-lata-${row.id}-${a.id}`;
                    return (
                      <div
                        key={a.id}
                        className={`rounded-xl border px-3 py-3 flex flex-col gap-3 ${
                          a.ativo ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-100/80 opacity-80'
                        }`}
                      >
                        <div className="flex gap-2 items-start">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 mt-0.5 shrink-0"
                            checked={e.checked}
                            disabled={savingBatch}
                            onChange={(ev) => {
                              const checked = ev.target.checked;
                              setMap((m) => ({
                                ...m,
                                [a.id]: {
                                  checked,
                                  unidades: checked ? m[a.id]?.unidades ?? '' : '',
                                },
                              }));
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="text-sm font-medium text-gray-900 block">
                              {a.nome}
                              {!a.ativo && (
                                <span className="ml-1 text-xs font-normal text-gray-500">(inativa)</span>
                              )}
                            </span>
                            <p className="text-xs text-gray-500 leading-snug line-clamp-2" title={a.descricao ?? undefined}>
                              {a.numero_buracos} buraco(s)
                              {a.diametro_buracos_mm != null
                                ? ` · ø ${Number(a.diametro_buracos_mm)} mm`
                                : ''}
                              {a.descricao?.trim()
                                ? ` · ${a.descricao.trim()}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label
                            htmlFor={fieldId}
                            className={`block text-xs font-medium text-gray-600 ${
                              !e.checked ? 'opacity-50' : ''
                            }`}
                          >
                            Unidades do produto que cabem nesta lata
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id={fieldId}
                              type="number"
                              min={1}
                              step={1}
                              inputMode="numeric"
                              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center font-medium tabular-nums disabled:bg-gray-100 disabled:text-gray-400"
                              placeholder="Ex.: 12"
                              value={e.unidades}
                              onChange={(ev) =>
                                setMap((m) => ({
                                  ...m,
                                  [a.id]: { ...e, unidades: ev.target.value },
                                }))
                              }
                              disabled={!e.checked || savingBatch}
                              aria-describedby={e.checked ? `${fieldId}-hint` : undefined}
                            />
                            <span
                              className={`text-xs text-gray-500 shrink-0 ${!e.checked ? 'opacity-50' : ''}`}
                            >
                              un.
                            </span>
                          </div>
                          <p id={`${fieldId}-hint`} className="text-[11px] text-gray-500 leading-snug">
                            {e.checked
                              ? 'Número inteiro ≥ 1 (ex.: pães, unidades de venda).'
                              : 'Marque a lata acima para informar a capacidade.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
