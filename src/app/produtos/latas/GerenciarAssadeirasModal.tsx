'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAssadeira,
  getAssadeiras,
  updateAssadeira,
  updateAssadeirasBulk,
  type AssadeiraRow,
} from '@/app/actions/assadeiras-actions';
type GerenciarAssadeirasModalProps = {
  open: boolean;
  onClose: () => void;
  /** Chamado após criar/editar assadeira com sucesso (lista já atualizada no servidor). */
  onSaved: (list: AssadeiraRow[]) => void;
  /** Abre diretamente no formulário de criação. */
  startInCreateMode?: boolean;
};

export default function GerenciarAssadeirasModal({
  open,
  onClose,
  onSaved,
  startInCreateMode = false,
}: GerenciarAssadeirasModalProps) {
  const somenteCriacao = startInCreateMode;
  const [list, setList] = useState<AssadeiraRow[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [novaLataAberta, setNovaLataAberta] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [novaNome, setNovaNome] = useState('');
  const [novaNumeroBuracos, setNovaNumeroBuracos] = useState('');
  const [novaQuantidadeLatas, setNovaQuantidadeLatas] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [busca, setBusca] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBuracos, setBulkBuracos] = useState('');
  const [bulkQtdLatas, setBulkQtdLatas] = useState('');
  const [bulkAtivo, setBulkAtivo] = useState<'keep' | 'true' | 'false'>('keep');
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const r = await getAssadeiras();
      if (cancelled) return;
      if (r.ok) {
        setList(r.list);
        setMsg(null);
      } else {
        setMsg({ type: 'err', text: r.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setNovaLataAberta(startInCreateMode);
      return;
    }
    if (!open) {
      setNovaLataAberta(false);
      setEditingId(null);
      setNovaNome('');
      setNovaNumeroBuracos('');
      setNovaQuantidadeLatas('');
      setNovaDescricao('');
      setBusca('');
      setMsg(null);
      setSelectedIds(new Set());
      setBulkBuracos('');
      setBulkQtdLatas('');
      setBulkAtivo('keep');
    }
  }, [open, startInCreateMode]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const nome = a.nome.toLowerCase();
      const desc = (a.descricao ?? '').toLowerCase();
      return nome.includes(q) || desc.includes(q);
    });
  }, [list, busca]);

  const toggleSelecionada = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const marcarFiltradas = () => {
    setSelectedIds(new Set(filtrados.map((a) => a.id)));
  };

  const desmarcarTodas = () => setSelectedIds(new Set());

  const aplicarEmMassa = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setMsg({ type: 'err', text: 'Marque ao menos uma lata na lista.' });
      return;
    }
    const payload: Parameters<typeof updateAssadeirasBulk>[0] = { ids };
    const bRaw = bulkBuracos.trim();
    if (bRaw !== '') {
      const b = parseInt(bRaw, 10);
      if (!Number.isFinite(b) || b < 0) {
        setMsg({ type: 'err', text: 'N.º de buracos inválido (inteiro ≥ 0).' });
        return;
      }
      payload.numeroBuracos = b;
    }
    const qRaw = bulkQtdLatas.trim();
    if (qRaw !== '') {
      const q = parseInt(qRaw, 10);
      if (!Number.isFinite(q) || q < 0) {
        setMsg({ type: 'err', text: 'Quantidade de latas inválida (inteiro ≥ 0).' });
        return;
      }
      payload.quantidadeLatas = q;
    }
    if (bulkAtivo === 'true') payload.ativo = true;
    if (bulkAtivo === 'false') payload.ativo = false;

    if (
      payload.numeroBuracos === undefined &&
      payload.quantidadeLatas === undefined &&
      payload.ativo === undefined
    ) {
      setMsg({
        type: 'err',
        text: 'Preencha buracos e/ou quantidade de latas, ou escolha ativar/desativar.',
      });
      return;
    }

    setMsg(null);
    setBulkSaving(true);
    const r = await updateAssadeirasBulk(payload);
    setBulkSaving(false);
    if (!r.success) {
      setMsg({ type: 'err', text: r.error });
      return;
    }
    setSelectedIds(new Set());
    setBulkBuracos('');
    setBulkQtdLatas('');
    setBulkAtivo('keep');
    await refresh({ clearMsg: false });
    setMsg({ type: 'ok', text: `Atualizadas ${r.count} lata(s).` });
  };

  const refresh = async (opts?: { clearMsg?: boolean }) => {
    const clearMsg = opts?.clearMsg !== false;
    const r = await getAssadeiras();
    if (r.ok) {
      setList(r.list);
      onSaved(r.list);
      if (clearMsg) setMsg(null);
    } else {
      setMsg({ type: 'err', text: r.message });
    }
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSavingId('new');
    const qlRaw = novaQuantidadeLatas.trim();
    const qlParsed = parseInt(qlRaw, 10);
    if (qlRaw === '' || !Number.isFinite(qlParsed) || qlParsed < 0) {
      setMsg({ type: 'err', text: 'Informe a quantidade de latas (número inteiro ≥ 0).' });
      setSavingId(null);
      return;
    }
    const nbRaw = novaNumeroBuracos.trim();
    const nb = parseInt(nbRaw, 10);
    if (nbRaw === '' || !Number.isFinite(nb) || nb < 0) {
      setMsg({ type: 'err', text: 'Informe o número de buracos (inteiro ≥ 0).' });
      setSavingId(null);
      return;
    }
    const res = await createAssadeira({
      nome: novaNome,
      codigo: null,
      ordem: 0,
      numeroBuracos: nb,
      quantidadeLatas: qlParsed,
      descricao: novaDescricao.trim() || null,
      diametroBuracosMm: null,
    });
    setSavingId(null);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao criar.' });
      return;
    }
    setNovaNome('');
    setNovaNumeroBuracos('');
    setNovaQuantidadeLatas('');
    setNovaDescricao('');
    setNovaLataAberta(false);
    await refresh();
    setMsg({ type: 'ok', text: 'Lata criada.' });
  };

  const fecharNovaLata = () => {
    if (somenteCriacao) {
      onClose();
      return;
    }
    setNovaLataAberta(false);
    setNovaNome('');
    setNovaNumeroBuracos('');
    setNovaQuantidadeLatas('');
    setNovaDescricao('');
    setMsg(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-assadeiras-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 shrink-0">
          <h2 id="modal-assadeiras-title" className="text-lg font-semibold text-gray-900">
            {somenteCriacao || novaLataAberta ? 'Nova lata' : 'Cadastro de latas'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {msg && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {msg.text}
            </div>
          )}

          {somenteCriacao || novaLataAberta ? (
            <form onSubmit={handleCriar} className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nome <span className="text-rose-600">*</span>
                </label>
                <input
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaNome}
                  onChange={(e) => setNovaNome(e.target.value)}
                  placeholder="Ex.: Lata 12 unidades"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  N.º de buracos <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  className="w-full max-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaNumeroBuracos}
                  onChange={(e) => setNovaNumeroBuracos(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-gray-500">Unidades por lata na ordem de produção.</p>
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
                  className="w-full max-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaQuantidadeLatas}
                  onChange={(e) => setNovaQuantidadeLatas(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y min-h-[72px]"
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
                <button
                  type="button"
                  onClick={fecharNovaLata}
                  disabled={savingId === 'new'}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {somenteCriacao ? 'Cancelar' : 'Voltar'}
                </button>
                <button
                  type="submit"
                  disabled={savingId === 'new'}
                  className="rounded-lg bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingId === 'new' ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setMsg(null);
                    setEditingId(null);
                    setNovaLataAberta(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  <span className="material-icons text-lg">add</span>
                  Nova lata
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 bg-gray-50/80">
                <span className="material-icons text-gray-400 text-lg">search</span>
                <input
                  type="search"
                  placeholder="Buscar por nome ou descrição…"
                  className="flex-1 outline-none text-gray-700 text-sm bg-transparent"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Edição em massa</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={marcarFiltradas}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Marcar listagem ({filtrados.length})
                    </button>
                    <button
                      type="button"
                      onClick={desmarcarTodas}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Marque as latas na lista. Só os campos que você preencher abaixo serão gravados em todas as
                  selecionadas.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block text-xs font-medium text-gray-600">
                    N.º buracos (opcional)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Ex.: 20"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      value={bulkBuracos}
                      onChange={(e) => setBulkBuracos(e.target.value)}
                      disabled={bulkSaving}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600">
                    Quantidade latas (opcional)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      value={bulkQtdLatas}
                      onChange={(e) => setBulkQtdLatas(e.target.value)}
                      disabled={bulkSaving}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 sm:col-span-2 lg:col-span-1">
                    Ativo
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      value={bulkAtivo}
                      onChange={(e) => setBulkAtivo(e.target.value as 'keep' | 'true' | 'false')}
                      disabled={bulkSaving}
                    >
                      <option value="keep">Não alterar</option>
                      <option value="true">Ativar todas</option>
                      <option value="false">Desativar todas</option>
                    </select>
                  </label>
                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <button
                      type="button"
                      disabled={bulkSaving || selectedIds.size === 0}
                      onClick={() => void aplicarEmMassa()}
                      className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {bulkSaving ? 'Aplicando…' : `Aplicar (${selectedIds.size})`}
                    </button>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white max-h-[min(52vh,420px)] overflow-y-auto">
                {filtrados.length === 0 && (
                  <li className="text-sm text-center text-gray-500 py-8 px-3">
                    {list.length === 0
                      ? 'Nenhuma lata cadastrada ainda.'
                      : 'Nenhum resultado para o filtro.'}
                  </li>
                )}
                {filtrados.map((a) => {
                  const expandido = editingId === a.id;
                  const marcada = selectedIds.has(a.id);
                  return (
                    <li key={`${a.id}-${a.updated_at}`}>
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shrink-0"
                            checked={marcada}
                            onChange={() => toggleSelecionada(a.id)}
                            aria-label={`Selecionar ${a.nome}`}
                          />
                          <span className="min-w-0 truncate text-sm font-medium text-gray-900">{a.nome}</span>
                          <span className="hidden shrink-0 text-xs text-gray-500 sm:inline tabular-nums">
                            {a.numero_buracos ?? 0} bur. · {a.quantidade_latas ?? 0} qtd.
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMsg(null);
                            setEditingId(expandido ? null : a.id);
                          }}
                          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {expandido ? 'Fechar' : 'Editar'}
                        </button>
                      </div>
                      {expandido && (
                        <div className="border-t border-gray-100 bg-gray-50/60 p-2">
                          <AssadeiraCardModal
                            row={a}
                            onErro={(t) => setMsg({ type: 'err', text: t })}
                            onGuardada={async () => {
                              await refresh({ clearMsg: false });
                              setEditingId(null);
                              setMsg({ type: 'ok', text: 'Alterações salvas.' });
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function AssadeiraCardModal({
  row,
  onErro,
  onGuardada,
}: {
  row: AssadeiraRow;
  onErro: (t: string) => void;
  onGuardada: () => void | Promise<void>;
}) {
  const [nome, setNome] = useState(row.nome);
  const [numeroBuracos, setNumeroBuracos] = useState(String(row.numero_buracos ?? 0));
  const [quantidadeLatas, setQuantidadeLatas] = useState(String(row.quantidade_latas ?? 0));
  const [descricao, setDescricao] = useState(row.descricao ?? '');
  const [ativo, setAtivo] = useState(row.ativo);
  const [savingLocal, setSavingLocal] = useState(false);

  useEffect(() => {
    setNome(row.nome);
    setNumeroBuracos(String(row.numero_buracos ?? 0));
    setQuantidadeLatas(String(row.quantidade_latas ?? 0));
    setDescricao(row.descricao ?? '');
    setAtivo(row.ativo);
  }, [row.id, row.updated_at]);

  const salvar = useCallback(async (): Promise<boolean> => {
    if (!nome.trim()) {
      onErro('Informe o nome.');
      return false;
    }
    const qlRaw = quantidadeLatas.trim();
    const ql = parseInt(qlRaw, 10);
    if (qlRaw === '' || !Number.isFinite(ql) || ql < 0) {
      onErro('Informe a quantidade de latas (número inteiro ≥ 0).');
      return false;
    }
    const nbRaw = numeroBuracos.trim();
    const nb = parseInt(nbRaw, 10);
    if (nbRaw === '' || !Number.isFinite(nb) || nb < 0) {
      onErro('Informe o número de buracos (inteiro ≥ 0).');
      return false;
    }
    const res = await updateAssadeira({
      id: row.id,
      nome,
      codigo: row.codigo?.trim() ? row.codigo.trim() : null,
      ordem: row.ordem,
      numeroBuracos: nb,
      quantidadeLatas: ql,
      descricao: descricao.trim() || null,
      diametroBuracosMm:
        row.diametro_buracos_mm != null && Number.isFinite(Number(row.diametro_buracos_mm))
          ? Number(row.diametro_buracos_mm)
          : null,
      ativo,
    });
    if (!res.success) {
      onErro(res.error ?? 'Erro ao salvar.');
      return false;
    }
    return true;
  }, [row.id, row.codigo, row.ordem, row.diametro_buracos_mm, nome, numeroBuracos, quantidadeLatas, descricao, ativo, onErro]);

  const handleSalvar = async () => {
    setSavingLocal(true);
    const ok = await salvar();
    setSavingLocal(false);
    if (ok) {
      await onGuardada();
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
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
            disabled={savingLocal}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            N.º de buracos (unidades por lata na ordem) <span className="text-rose-600">*</span>
          </label>
          <input
            type="number"
            min={0}
            step={1}
            required
            className="w-full max-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={numeroBuracos}
            onChange={(e) => setNumeroBuracos(e.target.value)}
            disabled={savingLocal}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Quantidade de latas <span className="text-rose-600">*</span>
          </label>
          <input
            type="number"
            min={0}
            step={1}
            required
            className="w-full max-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={quantidadeLatas}
            onChange={(e) => setQuantidadeLatas(e.target.value)}
            disabled={savingLocal}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y min-h-[56px]"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={savingLocal}
            placeholder="Opcional"
          />
        </div>
        <div className="flex items-end gap-2 pb-1 sm:col-span-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={savingLocal}
            />
            <span className="text-sm text-gray-700">Ativa</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          disabled={savingLocal}
          onClick={() => void handleSalvar()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {savingLocal ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
