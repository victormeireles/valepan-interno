'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import {
  getAssadeiras,
  deleteAssadeira,
  updateAssadeira,
  type AssadeiraRow,
} from '@/app/actions/assadeiras-actions';
import { parseOptionalDiametroBuracosMm } from '@/lib/utils/assadeira-diametro';
import {
  getClienteAssadeiraBloqueios,
  getClientesLatas,
  getProdutosLatas,
  saveAssadeiraClienteBloqueios,
  saveProdutoLatasPermitidas,
  toggleProdutoLatasConferido,
  updateClienteSomenteLataAntiga,
  type ClienteAssadeiraBloqueioRow,
  type ClienteLatasRow,
  type ProdutoLatasRow,
} from '@/app/actions/latas-cadastro-actions';
import GerenciarAssadeirasModal from './GerenciarAssadeirasModal';

type ProdutoPorLata = { produtoId: string; nome: string; codigo: string; unidadesPorLata: number };

function resumoTecnicoAssadeira(a: AssadeiraRow): string {
  const ql = a.quantidade_latas ?? 0;
  const nb = a.numero_buracos ?? 0;
  const base = ql === nb ? `${ql} lata(s)` : `${ql} lata(s) · ${nb} buraco(s)`;
  const d =
    a.diametro_buracos_mm != null && Number.isFinite(Number(a.diametro_buracos_mm))
      ? ` · ø ${Number(a.diametro_buracos_mm)} mm`
      : '';
  return base + d;
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

function extractPesoKey(text: string): string | null {
  const m = text.match(/\b(\d{1,4}(?:[.,]\d+)?)\s*g\b/i);
  if (!m) return null;
  const raw = m[1].replace(',', '.');
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const normalized = Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, '');
  return `${normalized}g`;
}

/**
 * Quando a lata aceita 2+ pesos distintos (extraídos de nome/código), devolve lista tipo
 * «Pães 60g, Pães 65g» para mostrar junto da descrição manual.
 */
function descricaoPesosAceitosLista(plist: ProdutoPorLata[]): string | null {
  const entries = plist
    .map((p) => {
      const peso = extractPesoKey(`${p.nome} ${p.codigo}`);
      return peso ? { nome: p.nome.trim(), peso } : null;
    })
    .filter((x): x is { nome: string; peso: string } => x != null);
  const pesosUnicos = new Set(entries.map((e) => e.peso));
  if (pesosUnicos.size < 2) return null;
  const byNome = new Map<string, { nome: string; peso: string }>();
  for (const e of entries) {
    if (!byNome.has(e.nome)) byNome.set(e.nome, e);
  }
  const list = [...byNome.values()].sort((a, b) => {
    const na = Number(a.peso.replace('g', ''));
    const nb = Number(b.peso.replace('g', ''));
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
  return list.map((x) => x.nome).join(', ');
}

function defaultUnidadesPorLata(assadeira: AssadeiraRow, produto: ProdutoLatasRow): string {
  if (produto.unidades_assadeira != null && Number(produto.unidades_assadeira) > 0) {
    return String(Math.round(Number(produto.unidades_assadeira)));
  }
  const ql = Number(assadeira.quantidade_latas ?? 0);
  if (Number.isFinite(ql) && ql > 0) return String(Math.round(ql));
  return '';
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

function buildProdutoLataMapForAssadeira(
  produtos: ProdutoLatasRow[],
  assadeiraId: string,
): Record<string, EntryState> {
  const m: Record<string, EntryState> = {};
  for (const p of produtos) {
    const v = p.vinculos.find((x) => x.assadeira_id === assadeiraId);
    m[p.id] = {
      checked: !!v,
      unidades: v ? String(v.unidades_por_assadeira) : '',
    };
  }
  return m;
}

function vinculosPayloadChanged(
  before: ProdutoLatasRow['vinculos'],
  after: { assadeiraId: string; unidadesPorAssadeira: number }[],
): boolean {
  if (before.length !== after.length) return true;
  const byId = new Map(after.map((x) => [x.assadeiraId, x.unidadesPorAssadeira]));
  for (const b of before) {
    const u = byId.get(b.assadeira_id);
    if (u !== b.unidades_por_assadeira) return true;
    byId.delete(b.assadeira_id);
  }
  return byId.size > 0;
}

function mergeVinculosForProduto(
  p: ProdutoLatasRow,
  assadeiraId: string,
  entry: EntryState,
  assadeirasSorted: AssadeiraRow[],
): { assadeiraId: string; unidadesPorAssadeira: number }[] | 'invalid' {
  const out: { assadeiraId: string; unidadesPorAssadeira: number }[] = [];
  for (const a of assadeirasSorted) {
    if (a.id === assadeiraId) {
      if (!entry.checked) continue;
      const u = parseOptionalInt(entry.unidades);
      if (u == null) return 'invalid';
      out.push({ assadeiraId: a.id, unidadesPorAssadeira: u });
    } else {
      const v = p.vinculos.find((x) => x.assadeira_id === a.id);
      if (v) out.push({ assadeiraId: a.id, unidadesPorAssadeira: v.unidades_por_assadeira });
    }
  }
  return out;
}

function PorLataTableRow({
  assadeira,
  plist,
  produtos,
  clientes,
  bloqueadosClienteIds,
  assadeirasSorted,
  onRefreshProdutos,
  onRefreshAssadeiras,
  onRefreshBloqueios,
  setMsg,
}: {
  assadeira: AssadeiraRow;
  plist: ProdutoPorLata[];
  produtos: ProdutoLatasRow[];
  clientes: ClienteLatasRow[];
  bloqueadosClienteIds: string[];
  assadeirasSorted: AssadeiraRow[];
  onRefreshProdutos: () => Promise<void>;
  onRefreshAssadeiras: () => Promise<void>;
  onRefreshBloqueios: () => Promise<void>;
  setMsg: (m: { type: 'ok' | 'err'; text: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [painelCompatExpandido, setPainelCompatExpandido] = useState(false);
  const [painelExclusaoExpandido, setPainelExclusaoExpandido] = useState(false);
  const [buscaProdutos, setBuscaProdutos] = useState('');
  const [pesoSelecionado, setPesoSelecionado] = useState('');
  const [buscaClientesExclusao, setBuscaClientesExclusao] = useState('');
  const [map, setMap] = useState<Record<string, EntryState>>(() =>
    buildProdutoLataMapForAssadeira(produtos, assadeira.id),
  );

  const [nome, setNome] = useState(assadeira.nome);
  const [numeroBuracos, setNumeroBuracos] = useState(String(assadeira.numero_buracos ?? 0));
  const [quantidadeLatas, setQuantidadeLatas] = useState(String(assadeira.quantidade_latas ?? 0));
  const [diametroBuracos, setDiametroBuracos] = useState(
    assadeira.diametro_buracos_mm != null && Number.isFinite(Number(assadeira.diametro_buracos_mm))
      ? String(assadeira.diametro_buracos_mm)
      : '',
  );
  const [descricao, setDescricao] = useState(assadeira.descricao ?? '');
  const [ativo, setAtivo] = useState(assadeira.ativo);
  const [savingLata, setSavingLata] = useState(false);
  const [savingCompat, setSavingCompat] = useState(false);
  const [savingBloqueios, setSavingBloqueios] = useState(false);
  const [deletingLata, setDeletingLata] = useState(false);
  const [mapBloqueioCliente, setMapBloqueioCliente] = useState<Record<string, boolean>>({});

  const busy = savingLata || savingCompat || savingBloqueios || deletingLata;

  useEffect(() => {
    setNome(assadeira.nome);
    setNumeroBuracos(String(assadeira.numero_buracos ?? 0));
    setQuantidadeLatas(String(assadeira.quantidade_latas ?? 0));
    setDiametroBuracos(
      assadeira.diametro_buracos_mm != null && Number.isFinite(Number(assadeira.diametro_buracos_mm))
        ? String(assadeira.diametro_buracos_mm)
        : '',
    );
    setDescricao(assadeira.descricao ?? '');
    setAtivo(assadeira.ativo);
  }, [assadeira]);

  useEffect(() => {
    if (!open) return;
    setMap(buildProdutoLataMapForAssadeira(produtos, assadeira.id));
  }, [open, produtos, assadeira.id]);

  useEffect(() => {
    if (!open) return;
    const m: Record<string, boolean> = {};
    for (const c of clientes) {
      m[c.id] = bloqueadosClienteIds.includes(c.id);
    }
    setMapBloqueioCliente(m);
  }, [open, assadeira.id, bloqueadosClienteIds, clientes]);

  useEffect(() => {
    if (!open) {
      setPainelCompatExpandido(false);
      setPainelExclusaoExpandido(false);
      setBuscaProdutos('');
      setBuscaClientesExclusao('');
    }
  }, [open]);

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
            unidades: checked ? (atual.unidades || unidadesDefault) : '',
          };
        }
        return next;
      });
    },
    [pesoSelecionado, produtos, assadeira],
  );

  const desmarcarTodosCompativeis = useCallback(() => {
    setMap((prev) => {
      const next = { ...prev };
      for (const p of produtos) {
        next[p.id] = { checked: false, unidades: '' };
      }
      return next;
    });
  }, [produtos]);

  const nClientesExclusaoMarcados = useMemo(
    () => clientes.filter((c) => mapBloqueioCliente[c.id]).length,
    [clientes, mapBloqueioCliente],
  );

  const handleSaveLata = async (): Promise<boolean> => {
    setSavingLata(true);
    setMsg(null);
    const qlRaw = quantidadeLatas.trim();
    const ql = parseInt(qlRaw, 10);
    if (qlRaw === '' || !Number.isFinite(ql) || ql < 0) {
      setMsg({ type: 'err', text: 'Informe a quantidade de latas (número inteiro ≥ 0).' });
      setSavingLata(false);
      return false;
    }
    if (!nome.trim()) {
      setMsg({ type: 'err', text: 'Informe o nome da lata.' });
      setSavingLata(false);
      return false;
    }
    const nb = parseInt(numeroBuracos, 10);
    const res = await updateAssadeira({
      id: assadeira.id,
      nome,
      codigo: assadeira.codigo?.trim() ? assadeira.codigo.trim() : null,
      ordem: assadeira.ordem,
      ativo,
      numeroBuracos: Number.isFinite(nb) ? nb : 0,
      quantidadeLatas: ql,
      descricao: descricao.trim() || null,
      diametroBuracosMm: parseOptionalDiametroBuracosMm(diametroBuracos),
    });
    setSavingLata(false);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao guardar a lata.' });
      return false;
    }
    await onRefreshAssadeiras();
    return true;
  };

  const handleSaveCompat = async (): Promise<boolean> => {
    setSavingCompat(true);
    setMsg(null);
    for (const p of produtos) {
      const entry = map[p.id] ?? { checked: false, unidades: '' };
      const merged = mergeVinculosForProduto(p, assadeira.id, entry, assadeirasSorted);
      if (merged === 'invalid') {
        setMsg({
          type: 'err',
          text: `«${p.nome}»: indique unidades inteiras > 0 para cada produto marcado como compatível.`,
        });
        setSavingCompat(false);
        return false;
      }
      if (!vinculosPayloadChanged(p.vinculos, merged)) continue;
      const res = await saveProdutoLatasPermitidas({ produtoId: p.id, vinculos: merged });
      if (!res.success) {
        setMsg({ type: 'err', text: res.error ?? `Erro ao guardar «${p.nome}».` });
        setSavingCompat(false);
        return false;
      }
    }
    setSavingCompat(false);
    await onRefreshProdutos();
    return true;
  };

  const handleSaveAll = async () => {
    const okLata = await handleSaveLata();
    if (!okLata) return;
    const okCompat = await handleSaveCompat();
    if (!okCompat) return;
    setMsg({ type: 'ok', text: 'Alterações salvas.' });
    setOpen(false);
  };

  const handleDeleteLata = async () => {
    const ok = window.confirm(
      `Excluir a lata "${assadeira.nome}"? Esta ação remove os vínculos de produtos e exclusões de clientes dessa lata.`,
    );
    if (!ok) return;
    setDeletingLata(true);
    setMsg(null);
    const res = await deleteAssadeira({ id: assadeira.id });
    setDeletingLata(false);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao excluir a lata.' });
      return;
    }
    setMsg({ type: 'ok', text: 'Lata excluída.' });
    setOpen(false);
    await onRefreshProdutos();
    await onRefreshBloqueios();
    await onRefreshAssadeiras();
  };

  const clientesBloqueadosResumo = useMemo(() => {
    return bloqueadosClienteIds
      .map((id) => {
        const c = clientes.find((x) => x.id === id);
        const n = c?.nome_fantasia?.trim();
        return n ? { id, nome: n } : null;
      })
      .filter((x): x is { id: string; nome: string } => x != null);
  }, [bloqueadosClienteIds, clientes]);

  const descricaoManual = assadeira.descricao?.trim() ?? '';

  const handleSaveBloqueios = async () => {
    setSavingBloqueios(true);
    setMsg(null);
    const ids = clientes.filter((c) => mapBloqueioCliente[c.id]).map((c) => c.id);
    const res = await saveAssadeiraClienteBloqueios({
      assadeiraId: assadeira.id,
      clienteIdsBloqueados: ids,
    });
    setSavingBloqueios(false);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao guardar exclusões.' });
      return;
    }
    setMsg({ type: 'ok', text: 'Exclusões de clientes atualizadas.' });
    await onRefreshBloqueios();
  };

  return (
    <>
      <tr className="border-b border-gray-50 align-middle hover:bg-gray-50/60">
        <td className="px-3 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 leading-tight">{assadeira.nome}</div>
            {!assadeira.ativo && (
              <span className="mt-0.5 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                Inativa
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-1.5 text-right align-middle">
          <span className="text-sm font-semibold text-gray-800 tabular-nums leading-tight">
            {assadeira.quantidade_latas ?? 0}
          </span>
        </td>
        <td className="px-3 py-1.5 text-gray-700 align-middle">
          {descricaoManual ? (
            <p className="text-sm leading-snug line-clamp-2" title={descricaoManual}>
              {descricaoManual}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">Sem descrição</p>
          )}
        </td>
        <td className="px-3 py-1.5 align-middle">
          {plist.length === 0 ? (
            <span className="text-xs text-amber-800 bg-amber-50/90 border border-amber-100 rounded-lg px-2 py-1 inline-block">
              Nenhum produto usa esta lata ainda.
            </span>
          ) : (
            <div className="text-xs text-gray-800 leading-tight truncate" title={plist.map((p) => `${p.nome} (${p.unidadesPorLata} un.)`).join(', ')}>
              <span className="font-medium">
                {plist[0]?.nome} <span className="tabular-nums text-gray-600">({plist[0]?.unidadesPorLata} un.)</span>
              </span>
              {plist.length > 1 && <span className="text-gray-500"> +{plist.length - 1}</span>}
            </div>
          )}
        </td>
        <td className="px-3 py-1.5 align-middle min-w-[140px] max-w-[220px]">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              aria-expanded={open}
              disabled={busy}
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {open ? 'Fechar' : 'Editar'}
            </button>
          </div>
          {clientesBloqueadosResumo.length === 0 ? (
            <span className="text-xs text-gray-400">Nenhuma</span>
          ) : (
            <p className="text-xs font-medium text-rose-800/90 truncate" title={clientesBloqueadosResumo.map((x) => x.nome).join(', ')}>
              {clientesBloqueadosResumo[0]?.nome}
              {clientesBloqueadosResumo.length > 1 && (
                <span className="text-gray-500"> +{clientesBloqueadosResumo.length - 1}</span>
              )}
            </p>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-100 bg-slate-50/90">
          <td colSpan={5} className="p-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dados da lata</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nome <span className="text-rose-600">*</span>
                    </label>
                    <input
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Buracos</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={numeroBuracos}
                      onChange={(e) => setNumeroBuracos(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantidade de latas <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={quantidadeLatas}
                      onChange={(e) => setQuantidadeLatas(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ø buracos (mm)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={diametroBuracos}
                      onChange={(e) => setDiametroBuracos(e.target.value)}
                      disabled={busy}
                      placeholder="—"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                    <textarea
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y min-h-[52px]"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                        disabled={busy}
                      />
                      <span className="text-sm text-gray-700">Ativa</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 min-w-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setPainelCompatExpandido((v) => {
                      if (v) setBuscaProdutos('');
                      return !v;
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Produtos compatíveis
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {painelCompatExpandido
                        ? 'Filtre e edite abaixo.'
                        : `${nProdutosCompatMarcados} produto(s) marcado(s) · toque para filtrar e editar`}
                    </p>
                  </div>
                  <span className="material-icons shrink-0 text-gray-500">
                    {painelCompatExpandido ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {painelCompatExpandido && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                      <span className="material-icons text-gray-400 text-lg">search</span>
                      <input
                        type="text"
                        placeholder="Filtrar produtos…"
                        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-800"
                        value={buscaProdutos}
                        onChange={(e) => setBuscaProdutos(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                      <span className="text-xs font-semibold text-blue-900">Selecionar por peso</span>
                      <select
                        value={pesoSelecionado}
                        onChange={(e) => setPesoSelecionado(e.target.value)}
                        disabled={busy || opcoesPesoProdutos.length === 0}
                        className="min-w-[110px] rounded border border-blue-200 bg-white px-2 py-1.5 text-xs text-gray-800"
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
                        className="rounded border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                      >
                        Marcar peso
                      </button>
                      <button
                        type="button"
                        disabled={busy || !pesoSelecionado}
                        onClick={() => aplicarSelecaoPorPeso(false)}
                        className="rounded border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                      >
                        Desmarcar peso
                      </button>
                      <button
                        type="button"
                        disabled={busy || nProdutosCompatMarcados === 0}
                        onClick={desmarcarTodosCompativeis}
                        className="rounded border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Desmarcar tudo
                      </button>
                    </div>
                    <div className="max-h-[min(420px,55vh)] overflow-y-auto rounded-lg border border-gray-100">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead className="sticky top-0 z-[1] bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="p-2 font-semibold text-gray-600 w-10"> </th>
                            <th className="p-2 font-semibold text-gray-600">Produto</th>
                            <th className="p-2 font-semibold text-gray-600 w-24 text-right">Un. / lata</th>
                          </tr>
                        </thead>
                        <tbody>
                          {produtosFiltradosPainel.map((p) => {
                            const e = map[p.id] ?? { checked: false, unidades: '' };
                            return (
                              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                                <td className="p-2 align-middle">
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600"
                                    checked={e.checked}
                                    disabled={busy}
                                    onChange={(ev) => {
                                      const checked = ev.target.checked;
                                      const unidadesDefault = defaultUnidadesPorLata(assadeira, p);
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
                                  <div className="font-medium text-gray-900 truncate">{p.nome}</div>
                                  <div className="text-[11px] text-gray-500 font-mono truncate">{p.codigo}</div>
                                </td>
                                <td className="p-2 align-middle text-right">
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className="w-full max-w-[5.5rem] ml-auto rounded border border-gray-200 px-2 py-1 text-sm tabular-nums text-right"
                                    value={e.unidades}
                                    disabled={busy || !e.checked}
                                    onChange={(ev) =>
                                      setMap((prev) => ({
                                        ...prev,
                                        [p.id]: { ...prev[p.id], checked: true, unidades: ev.target.value },
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
              </div>
            </div>

            <div className="mt-6 space-y-2 rounded-xl border border-rose-100 bg-white p-4">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setPainelExclusaoExpandido((v) => {
                    if (v) setBuscaClientesExclusao('');
                    return !v;
                  })
                }
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2.5 text-left hover:bg-rose-50/90 disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-rose-900/80">
                    Exclusão de clientes
                  </span>
                  <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                    {painelExclusaoExpandido
                      ? 'Filtre e marque quem não pode usar esta lata.'
                      : `${nClientesExclusaoMarcados} exclusão(ões) · toque para filtrar e editar`}
                  </p>
                </div>
                <span className="material-icons shrink-0 text-rose-800/70">
                  {painelExclusaoExpandido ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {painelExclusaoExpandido && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                    <span className="material-icons text-gray-400 text-lg">search</span>
                    <input
                      type="text"
                      placeholder="Filtrar clientes…"
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-800"
                      value={buscaClientesExclusao}
                      onChange={(e) => setBuscaClientesExclusao(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="max-h-[min(280px,40vh)] overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                    {clientes.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">Sem clientes carregados.</p>
                    ) : (
                      clientesFiltradosExclusao.map((c) => (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                            c.ativo === false ? 'opacity-60' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-gray-300 text-rose-600"
                            checked={Boolean(mapBloqueioCliente[c.id])}
                            disabled={busy}
                            onChange={(e) =>
                              setMapBloqueioCliente((prev) => ({
                                ...prev,
                                [c.id]: e.target.checked,
                              }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-gray-900 block truncate">{c.nome_fantasia}</span>
                            {c.ativo === false && (
                              <span className="text-[11px] text-rose-600">Inativo</span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSaveBloqueios()}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-950 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {savingBloqueios ? 'A guardar…' : 'Guardar exclusões'}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDeleteLata()}
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                {deletingLata ? 'Excluindo…' : 'Excluir lata'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveAll()}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {busy ? 'A guardar…' : 'Salvar alterações'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
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
      const descPesos = (descricaoPesosAceitosLista(plist) ?? '').toLowerCase();
      const tech = resumoTecnicoAssadeira(a).toLowerCase();
      if (nome.includes(q) || desc.includes(q) || descPesos.includes(q) || tech.includes(q)) return true;
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

        {
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 flex-1">
                <span className="material-icons text-gray-400">search</span>
                <input
                  type="text"
                  placeholder="Buscar por lata, descrição ou produto…"
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
                  <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="p-3 font-semibold text-gray-600">Nome da lata</th>
                        <th className="p-3 font-semibold text-gray-600 text-right min-w-[110px]">
                          Quantidade
                        </th>
                        <th className="p-3 font-semibold text-gray-600 min-w-[200px]">Descrição</th>
                        <th className="p-3 font-semibold text-gray-600 min-w-[280px]">
                          Tipos de pão (produtos) suportados
                        </th>
                        <th className="p-3 font-semibold text-gray-600 min-w-[140px] max-w-[220px]">
                          Exclusão de clientes
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
                              {(a.quantidade_latas ?? a.numero_buracos) === a.numero_buracos
                                ? `${a.quantidade_latas ?? a.numero_buracos} lata(s)`
                                : `${a.quantidade_latas ?? 0} lata(s) · ${a.numero_buracos} buraco(s)`}
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
