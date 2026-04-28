'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAssadeira,
  getAssadeiras,
  updateAssadeira,
  type AssadeiraRow,
} from '@/app/actions/assadeiras-actions';
import { parseOptionalDiametroBuracosMm } from '@/lib/utils/assadeira-diametro';

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
  const [novaNumeroBuracos, setNovaNumeroBuracos] = useState('0');
  const [novaQuantidadeLatas, setNovaQuantidadeLatas] = useState('');
  const [novaDiametroBuracos, setNovaDiametroBuracos] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [busca, setBusca] = useState('');

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
      setNovaNumeroBuracos('0');
      setNovaQuantidadeLatas('');
      setNovaDiametroBuracos('');
      setNovaDescricao('');
      setBusca('');
      setMsg(null);
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
    const nb = parseInt(novaNumeroBuracos, 10);
    const nbOk = Number.isFinite(nb) ? nb : 0;
    const qlRaw = novaQuantidadeLatas.trim();
    const qlParsed = parseInt(qlRaw, 10);
    if (qlRaw === '' || !Number.isFinite(qlParsed) || qlParsed < 0) {
      setMsg({ type: 'err', text: 'Informe a quantidade de latas (número inteiro ≥ 0).' });
      setSavingId(null);
      return;
    }
    const res = await createAssadeira({
      nome: novaNome,
      codigo: null,
      ordem: 0,
      numeroBuracos: nbOk,
      quantidadeLatas: qlParsed,
      descricao: novaDescricao.trim() || null,
      diametroBuracosMm: parseOptionalDiametroBuracosMm(novaDiametroBuracos),
    });
    setSavingId(null);
    if (!res.success) {
      setMsg({ type: 'err', text: res.error ?? 'Erro ao criar.' });
      return;
    }
    setNovaNome('');
    setNovaNumeroBuracos('0');
    setNovaQuantidadeLatas('');
    setNovaDiametroBuracos('');
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
    setNovaNumeroBuracos('0');
    setNovaQuantidadeLatas('');
    setNovaDiametroBuracos('');
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
        className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col"
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Número de buracos</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full max-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaNumeroBuracos}
                  onChange={(e) => setNovaNumeroBuracos(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Diâmetro dos buracos (mm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full max-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaDiametroBuracos}
                  onChange={(e) => setNovaDiametroBuracos(e.target.value)}
                  placeholder="Opcional"
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
                  return (
                    <li key={`${a.id}-${a.updated_at}`}>
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <span className="min-w-0 truncate text-sm font-medium text-gray-900">{a.nome}</span>
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
  const [diametroBuracos, setDiametroBuracos] = useState(
    row.diametro_buracos_mm != null ? String(row.diametro_buracos_mm) : '',
  );
  const [descricao, setDescricao] = useState(row.descricao ?? '');
  const [ativo, setAtivo] = useState(row.ativo);
  const [savingLocal, setSavingLocal] = useState(false);

  useEffect(() => {
    setNome(row.nome);
    setNumeroBuracos(String(row.numero_buracos ?? 0));
    setQuantidadeLatas(String(row.quantidade_latas ?? 0));
    setDiametroBuracos(row.diametro_buracos_mm != null ? String(row.diametro_buracos_mm) : '');
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
    const nb = parseInt(numeroBuracos, 10);
    const res = await updateAssadeira({
      id: row.id,
      nome,
      codigo: row.codigo?.trim() ? row.codigo.trim() : null,
      ordem: row.ordem,
      numeroBuracos: Number.isFinite(nb) ? nb : 0,
      quantidadeLatas: ql,
      descricao: descricao.trim() || null,
      diametroBuracosMm: parseOptionalDiametroBuracosMm(diametroBuracos),
      ativo,
    });
    if (!res.success) {
      onErro(res.error ?? 'Erro ao salvar.');
      return false;
    }
    return true;
  }, [row.id, row.codigo, row.ordem, nome, numeroBuracos, quantidadeLatas, descricao, diametroBuracos, ativo, onErro]);

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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Número de buracos</label>
          <input
            type="number"
            min={0}
            step={1}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={numeroBuracos}
            onChange={(e) => setNumeroBuracos(e.target.value)}
            disabled={savingLocal}
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
            disabled={savingLocal}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Diâmetro dos buracos (mm)</label>
          <input
            type="text"
            inputMode="decimal"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={diametroBuracos}
            onChange={(e) => setDiametroBuracos(e.target.value)}
            disabled={savingLocal}
            placeholder="Opcional"
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
