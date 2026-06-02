'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import SelectRemoteAutocomplete from '@/components/Producao/SelectRemoteAutocomplete';
import {
  deleteProdutoTipoCaixaOverride,
  deleteTipoCaixaEmbalagem,
  listOverridesPorTipoCaixa,
  upsertProdutoTipoCaixaOverride,
  upsertTipoCaixaEmbalagem,
  type ClienteOpcaoTipoCaixa,
  type ProdutoTipoCaixaOverrideItem,
  type TipoCaixaEmbalagemListItem,
} from '@/app/actions/tipos-caixa-embalagem-actions';

interface TiposCaixaClientProps {
  tiposInicial: TipoCaixaEmbalagemListItem[];
  clientesOpcoes: ClienteOpcaoTipoCaixa[];
  loadError: string | null;
}

function parseOptionalPositiveInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Math.round(Number(t.replace(',', '.')));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function TiposCaixaClient({ tiposInicial, clientesOpcoes, loadError }: TiposCaixaClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(loadError);
  useEffect(() => {
    setError(loadError);
  }, [loadError]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipoCaixaEmbalagemListItem | null>(null);
  const [pendingModal, setPendingModal] = useState(false);
  const [formClienteId, setFormClienteId] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formUnidades, setFormUnidades] = useState('12');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formObs, setFormObs] = useState('');

  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<ProdutoTipoCaixaOverrideItem[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [ovProdutoId, setOvProdutoId] = useState('');
  const [ovBox, setOvBox] = useState('');
  const [ovPkg, setOvPkg] = useState('');
  const [pendingOv, setPendingOv] = useState(false);

  const selectedTipo = useMemo(
    () => tiposInicial.find((t) => t.id === selectedTipoId) ?? null,
    [tiposInicial, selectedTipoId],
  );

  useEffect(() => {
    if (!selectedTipoId) {
      setOverrides([]);
      return;
    }
    let cancelled = false;
    setOverridesLoading(true);
    void listOverridesPorTipoCaixa(selectedTipoId).then((r) => {
      if (cancelled) return;
      setOverridesLoading(false);
      if (!r.success) {
        setError(r.error);
        setOverrides([]);
        return;
      }
      setOverrides(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTipoId]);

  const openCreate = () => {
    setEditing(null);
    setFormClienteId(clientesOpcoes[0]?.id ?? '');
    setFormNome('');
    setFormUnidades('12');
    setFormAtivo(true);
    setFormObs('');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: TipoCaixaEmbalagemListItem) => {
    setEditing(row);
    setFormClienteId(row.clienteId);
    setFormNome(row.nome);
    setFormUnidades(String(row.unidadesPorCaixa));
    setFormAtivo(row.ativo);
    setFormObs(row.observacao ?? '');
    setError(null);
    setModalOpen(true);
  };

  const submitModal = async () => {
    const n = Math.round(Number(String(formUnidades).replace(',', '.')));
    if (!Number.isFinite(n) || n <= 0) {
      setError('Unidades por caixa deve ser um número inteiro maior que zero.');
      return;
    }
    setPendingModal(true);
    setError(null);
    const r = await upsertTipoCaixaEmbalagem({
      id: editing?.id,
      clienteId: formClienteId,
      nome: formNome,
      unidadesPorCaixa: n,
      ativo: formAtivo,
      observacao: formObs.trim() || null,
    });
    setPendingModal(false);
    if (!r.success) {
      setError(r.error);
      return;
    }
    setModalOpen(false);
    router.refresh();
  };

  const handleDeleteTipo = async (row: TipoCaixaEmbalagemListItem) => {
    if (!window.confirm(`Eliminar o tipo "${row.nome}"? Os overrides associados serão removidos.`)) return;
    const r = await deleteTipoCaixaEmbalagem(row.id);
    if (!r.success) {
      setError(r.error);
      return;
    }
    if (selectedTipoId === row.id) setSelectedTipoId(null);
    router.refresh();
  };

  const handleAddOverride = async () => {
    if (!selectedTipoId) return;
    const pid = ovProdutoId.trim();
    if (!pid) {
      setError('Escolha um produto para o override.');
      return;
    }
    const b = parseOptionalPositiveInt(ovBox);
    const p = parseOptionalPositiveInt(ovPkg);
    if (b == null && p == null) {
      setError('Preencha pelo menos box_units ou package_units override.');
      return;
    }
    setPendingOv(true);
    setError(null);
    const r = await upsertProdutoTipoCaixaOverride({
      tipoCaixaEmbalagemId: selectedTipoId,
      produtoId: pid,
      boxUnitsOverride: b,
      packageUnitsOverride: p,
    });
    setPendingOv(false);
    if (!r.success) {
      setError(r.error);
      return;
    }
    setOvProdutoId('');
    setOvBox('');
    setOvPkg('');
    const list = await listOverridesPorTipoCaixa(selectedTipoId);
    if (list.success) setOverrides(list.data);
    router.refresh();
  };

  const handleDeleteOverride = async (id: string) => {
    if (!window.confirm('Remover este override produto × tipo?')) return;
    const r = await deleteProdutoTipoCaixaOverride(id);
    if (!r.success) {
      setError(r.error);
      return;
    }
    setOverrides((prev) => prev.filter((x) => x.id !== id));
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Produtos - Tipos de caixa" icon="inventory_2" />
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6 md:py-10">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="max-w-3xl text-sm text-slate-600">
            Tipos de caixa por cliente (unidades por caixa). Na ordem de produção diária pode-se escolher um tipo;
            opcionalmente cadastre overrides por produto para sobrescrever box_units e package_units do cadastro do
            produto quando essa combinação for usada.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Novo tipo
          </button>
        </div>

        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[42rem] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Nome</th>
                <th className="px-3 py-3 text-right">Un./caixa</th>
                <th className="px-3 py-3">Ativo</th>
                <th className="max-w-[12rem] px-3 py-3">Obs.</th>
                <th className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tiposInicial.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum tipo cadastrado (ou migração ainda não aplicada).
                  </td>
                </tr>
              ) : (
                tiposInicial.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2">{row.clienteNome}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.unidadesPorCaixa}</td>
                    <td className="px-3 py-2">{row.ativo ? 'Sim' : 'Não'}</td>
                    <td
                      className="max-w-[12rem] truncate px-3 py-2 text-xs text-slate-600"
                      title={row.observacao ?? ''}
                    >
                      {row.observacao ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                          onClick={() => setSelectedTipoId(row.id)}
                        >
                          Overrides
                        </button>
                        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => openEdit(row)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                          onClick={() => void handleDeleteTipo(row)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedTipo && (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Overrides — {selectedTipo.nome} ({selectedTipo.clienteNome})
            </h2>
            <p className="text-xs text-slate-500">
              Deixe um campo vazio para não sobrescrever esse atributo; é obrigatório preencher pelo menos um dos dois
              overrides ao adicionar.
            </p>
            {overridesLoading ? (
              <p className="text-sm text-slate-500">A carregar…</p>
            ) : (
              <div className="overflow-auto rounded-lg border border-slate-100">
                <table className="min-w-[36rem] w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                      <th className="px-2 py-2">Produto</th>
                      <th className="px-2 py-2">Código</th>
                      <th className="px-2 py-2 text-right">box_units</th>
                      <th className="px-2 py-2 text-right">package_units</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                          Sem overrides para este tipo.
                        </td>
                      </tr>
                    ) : (
                      overrides.map((o) => (
                        <tr key={o.id} className="border-t border-slate-100">
                          <td className="px-2 py-2">{o.produtoNome}</td>
                          <td className="px-2 py-2 text-xs text-slate-600">{o.produtoCodigo}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{o.boxUnitsOverride ?? '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{o.packageUnitsOverride ?? '—'}</td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              className="text-xs text-rose-700 hover:underline"
                              onClick={() => void handleDeleteOverride(o.id)}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">Produto</label>
                <SelectRemoteAutocomplete
                  key={selectedTipoId ?? 'none'}
                  value={ovProdutoId}
                  onChange={setOvProdutoId}
                  stage="produtos"
                  label=""
                  placeholder=""
                  disabled={pendingOv}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">box_units override</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
                  value={ovBox}
                  onChange={(e) => setOvBox(e.target.value)}
                  disabled={pendingOv}
                  placeholder="vazio = não altera"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">package_units override</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
                  value={ovPkg}
                  onChange={(e) => setOvPkg(e.target.value)}
                  disabled={pendingOv}
                  placeholder="vazio = não altera"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={pendingOv}
              onClick={() => void handleAddOverride()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pendingOv ? 'A gravar…' : 'Adicionar override'}
            </button>
          </section>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40"
              aria-label="Fechar"
              onClick={() => !pendingModal && setModalOpen(false)}
            />
            <div
              role="dialog"
              className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <h3 className="text-lg font-semibold">{editing ? 'Editar tipo' : 'Novo tipo de caixa'}</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Cliente</label>
                  <select
                    className="mt-1 w-full rounded border px-2 py-2 text-sm"
                    value={formClienteId}
                    onChange={(e) => setFormClienteId(e.target.value)}
                    disabled={pendingModal}
                  >
                    {clientesOpcoes.length === 0 ? (
                      <option value="">—</option>
                    ) : (
                      clientesOpcoes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nomeFantasia}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Nome do tipo</label>
                  <input
                    className="mt-1 w-full rounded border px-2 py-2 text-sm"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    disabled={pendingModal}
                    placeholder="ex.: Caixa Damião 24 un."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Unidades por caixa</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border px-2 py-2 text-sm tabular-nums"
                    value={formUnidades}
                    onChange={(e) => setFormUnidades(e.target.value)}
                    disabled={pendingModal}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formAtivo} onChange={(e) => setFormAtivo(e.target.checked)} />
                  Ativo (aparece na ordem de produção)
                </label>
                <div>
                  <label className="text-xs font-medium text-slate-600">Observação</label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded border px-2 py-2 text-sm"
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    disabled={pendingModal}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={pendingModal}
                  className="rounded border px-3 py-2 text-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={pendingModal || !formNome.trim() || !formClienteId}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={() => void submitModal()}
                >
                  {pendingModal ? 'A gravar…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
