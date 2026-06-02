'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { getAssadeiras, type AssadeiraRow } from '@/app/actions/assadeiras-actions';
import {
  getClienteAssadeiraBloqueios,
  getClientesLatas,
  getProdutosLatas,
  saveProdutoLatasPermitidas,
  toggleProdutoLatasConferido,
  updateClienteSomenteLataAntiga,
  type ClienteAssadeiraBloqueioRow,
  type ClienteLatasRow,
  type ProdutoLatasRow,
} from '@/app/actions/latas-cadastro-actions';
import GerenciarAssadeirasModal from './GerenciarAssadeirasModal';
import PorLataTableRow from './PorLataTableRow';

type ProdutoPorLata = { produtoId: string; nome: string; codigo: string; unidadesPorLata: number };

function resumoTecnicoAssadeira(a: AssadeiraRow): string {
  const br = Math.round(Number(a.numero_buracos ?? 0));
  const ql = a.quantidade_latas ?? 0;
  return `${br} buracos · ${ql} lata(s)`;
}

interface LatasCadastroClientProps {
  produtosInicial: ProdutoLatasRow[];
  clientesInicial: ClienteLatasRow[];
  assadeirasInicial: AssadeiraRow[];
  bloqueiosInicial: ClienteAssadeiraBloqueioRow[];
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
  bloqueiosInicial,
}: LatasCadastroClientProps) {
  const [produtos, setProdutos] = useState(produtosInicial);
  const [clientes, setClientes] = useState(clientesInicial);
  const [assadeiras, setAssadeiras] = useState(assadeirasInicial);
  const [bloqueios, setBloqueios] = useState(bloqueiosInicial);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaLata, setBuscaLata] = useState('');
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

  const linhasPorLata = useMemo(() => {
    const ordenadas = [...assadeiras].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    return ordenadas.map((a) => {
      const produtosSuportados: ProdutoPorLata[] = [];
      for (const p of produtos) {
        const v = p.vinculos.find((x) => x.assadeira_id === a.id);
        if (v) {
          produtosSuportados.push({
            produtoId: p.id,
            nome: p.nome,
            codigo: p.codigo ?? '',
            unidadesPorLata: v.unidades_por_assadeira,
          });
        }
      }
      produtosSuportados.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
      return { assadeira: a, produtos: produtosSuportados };
    });
  }, [assadeiras, produtos]);

  const bloqueiosPorAssadeira = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of bloqueios) {
      const arr = m.get(b.assadeira_id) ?? [];
      arr.push(b.cliente_id);
      m.set(b.assadeira_id, arr);
    }
    return m;
  }, [bloqueios]);

  const linhasPorLataFiltradas = useMemo(() => {
    const q = buscaLata.toLowerCase().trim();
    if (!q) return linhasPorLata;
    return linhasPorLata.filter(({ assadeira: a, produtos: plist }) => {
      const nome = a.nome.toLowerCase();
      const desc = (a.descricao ?? '').toLowerCase();
      const tech = resumoTecnicoAssadeira(a).toLowerCase();
      if (nome.includes(q) || desc.includes(q) || tech.includes(q)) return true;
      if (
        (bloqueiosPorAssadeira.get(a.id) ?? []).some((cid) => {
          const c = clientes.find((x) => x.id === cid);
          if (!c) return false;
          return (
            c.nome_fantasia.toLowerCase().includes(q) || c.razao_social.toLowerCase().includes(q)
          );
        })
      ) {
        return true;
      }
      return plist.some(
        (p) => p.nome.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q),
      );
    });
  }, [linhasPorLata, buscaLata, bloqueiosPorAssadeira, clientes]);

  const assadeirasOrdenadasGlobal = useMemo(
    () => [...assadeiras].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR')),
    [assadeiras],
  );

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

  const refreshBloqueios = useCallback(async () => {
    const list = await getClienteAssadeiraBloqueios();
    setBloqueios(list);
  }, []);

  const persistProdutoLatasMap = useCallback(
    async (p: ProdutoLatasRow, map: Record<string, EntryState>): Promise<boolean> => {
      const assadeiraIdsValidos = new Set(assadeiras.map((a) => a.id));
      const vinculos: { assadeiraId: string; unidadesPorAssadeira: number }[] = [];
      for (const [assadeiraId, e] of Object.entries(map)) {
        if (!assadeiraIdsValidos.has(assadeiraId)) continue;
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
    [assadeiras],
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

        {
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 flex-1">
                <span className="material-icons text-gray-400">search</span>
                <input
                  type="text"
                  placeholder="Buscar por lata, buracos, descrição ou produto…"
                  className="flex-1 outline-none text-gray-700 font-medium"
                  value={buscaLata}
                  onChange={(e) => setBuscaLata(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setModalAssadeirasOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                <span className="material-icons text-lg text-gray-600">add</span>
                Nova lata
              </button>
            </div>

            {assadeiras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
                <p className="font-medium text-gray-700">Ainda não há latas cadastradas</p>
                <p className="mt-1 text-sm">Use &quot;Nova lata&quot; para criar o primeiro tipo de assadeira.</p>
              </div>
            ) : linhasPorLataFiltradas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
                <p className="font-medium text-gray-700">Nenhum resultado</p>
                <p className="mt-1 text-sm">Ajuste a pesquisa ou limpe o filtro.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="p-3 font-semibold text-gray-600">Nome da lata</th>
                        <th
                          className="p-3 font-semibold text-gray-600 text-right min-w-[5.5rem]"
                          title="N.º de buracos (unidades por lata na ordem de produção e cálculo de caixas)"
                        >
                          Buracos
                        </th>
                        <th className="p-3 font-semibold text-gray-600 text-right min-w-[110px]">
                          Quantidade
                        </th>
                        <th className="p-3 font-semibold text-gray-600 min-w-[280px]">
                          Tipos de pão (produtos) suportados
                        </th>
                        <th className="p-3 font-semibold text-gray-600 min-w-[8rem] max-w-[14rem]">
                          Exclusões
                        </th>
                        <th className="p-3 font-semibold text-gray-600 text-right w-24">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasPorLataFiltradas.map(({ assadeira: a, produtos: plist }) => (
                        <PorLataTableRow
                          key={a.id}
                          assadeira={a}
                          plist={plist}
                          produtos={produtos}
                          clientes={clientes}
                          bloqueadosClienteIds={bloqueiosPorAssadeira.get(a.id) ?? []}
                          assadeirasSorted={assadeirasOrdenadasGlobal}
                          onRefreshProdutos={refreshProdutos}
                          onRefreshAssadeiras={refreshAssadeiras}
                          onRefreshBloqueios={refreshBloqueios}
                          setMsg={setMsg}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        }

        {false && (
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

        {false && (
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
        startInCreateMode
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
      const next: Record<string, EntryState> = {};
      for (const a of assadeiras) {
        const v = row.vinculos.find((x) => x.assadeira_id === a.id);
        next[a.id] =
          prev[a.id] ?? {
            checked: !!v,
            unidades: v ? String(v.unidades_por_assadeira) : '',
          };
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
                              {`${a.quantidade_latas ?? 0} lata(s)`}
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
