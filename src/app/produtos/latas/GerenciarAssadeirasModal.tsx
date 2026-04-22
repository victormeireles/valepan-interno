'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
};

export default function GerenciarAssadeirasModal({
  open,
  onClose,
  onSaved,
}: GerenciarAssadeirasModalProps) {
  const [list, setList] = useState<AssadeiraRow[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const assadeiraSaveFns = useRef<Map<string, () => Promise<boolean>>>(new Map());
  const [novaNome, setNovaNome] = useState('');
  const [novaNumeroBuracos, setNovaNumeroBuracos] = useState('0');
  const [novaDiametroBuracos, setNovaDiametroBuracos] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCodigo, setNovaCodigo] = useState('');
  const [novaOrdem, setNovaOrdem] = useState('0');
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

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const nome = a.nome.toLowerCase();
      const cod = a.codigo?.toLowerCase() ?? '';
      const desc = (a.descricao ?? '').toLowerCase();
      return nome.includes(q) || cod.includes(q) || desc.includes(q);
    });
  }, [list, busca]);

  const refresh = async () => {
    const r = await getAssadeiras();
    if (r.ok) {
      setList(r.list);
      onSaved(r.list);
      setMsg(null);
    } else {
      setMsg({ type: 'err', text: r.message });
    }
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSavingId('new');
    const ordem = parseInt(novaOrdem, 10);
    const nb = parseInt(novaNumeroBuracos, 10);
    const res = await createAssadeira({
      nome: novaNome,
      codigo: novaCodigo || null,
      ordem: Number.isFinite(ordem) ? ordem : 0,
      numeroBuracos: Number.isFinite(nb) ? nb : 0,
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
    setNovaDiametroBuracos('');
    setNovaDescricao('');
    setNovaCodigo('');
    setNovaOrdem('0');
    await refresh();
  };

  const registerAssadeiraSave = useCallback((id: string, fn: () => Promise<boolean>) => {
    assadeiraSaveFns.current.set(id, fn);
    return () => {
      assadeiraSaveFns.current.delete(id);
    };
  }, []);

  const handleSalvarTodasAssadeiras = async () => {
    setSavingBatch(true);
    setMsg(null);
    for (const a of filtrados) {
      const fn = assadeiraSaveFns.current.get(a.id);
      if (!fn) continue;
      const ok = await fn();
      if (!ok) {
        setSavingBatch(false);
        return;
      }
    }
    await refresh();
    setMsg({ type: 'ok', text: 'Todas as latas foram salvas.' });
    setSavingBatch(false);
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
            Cadastro de latas (assadeiras)
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

          <form onSubmit={handleCriar} className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-sm text-gray-600">
              Preencha <strong className="text-gray-800">nome</strong>,{' '}
              <strong className="text-gray-800">número de buracos</strong>,{' '}
              <strong className="text-gray-800">diâmetro dos buracos</strong> e{' '}
              <strong className="text-gray-800">descrição</strong>. Código e ordem são opcionais (uso interno).
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={novaNome}
                onChange={(e) => setNovaNome(e.target.value)}
                placeholder="Ex.: Lata 12 unidades"
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
              <p className="mt-1 text-[11px] text-gray-500">Quantidade de cavidades na assadeira.</p>
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
              <p className="mt-1 text-[11px] text-gray-500">Diâmetro de cada buraco, em milímetros.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y min-h-[72px]"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Observações sobre formato, uso, cliente típico…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">Código (opcional)</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaCodigo}
                  onChange={(e) => setNovaCodigo(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordem</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={novaOrdem}
                  onChange={(e) => setNovaOrdem(e.target.value)}
                />
              </div>
              <div className="sm:col-span-4 flex items-end">
                <button
                  type="submit"
                  disabled={savingId === 'new' || savingBatch}
                  className="w-full rounded-lg bg-gray-900 text-white text-sm font-semibold py-2.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingId === 'new' ? 'Salvando…' : 'Adicionar lata'}
                </button>
              </div>
            </div>
          </form>

          <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 bg-gray-50/80">
            <span className="material-icons text-gray-400 text-lg">search</span>
            <input
              type="search"
              placeholder="Buscar por nome, código ou descrição…"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
            {filtrados.length === 0 && (
              <p className="text-sm text-center text-gray-500 py-8">
                {list.length === 0
                  ? 'Nenhuma lata cadastrada ainda.'
                  : 'Nenhum resultado para o filtro.'}
              </p>
            )}
            {filtrados.map((a) => (
              <AssadeiraCardModal
                key={`${a.id}-${a.updated_at}`}
                row={a}
                savingBatch={savingBatch}
                registerSave={registerAssadeiraSave}
                onErro={(t) => setMsg({ type: 'err', text: t })}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0 flex flex-col sm:flex-row gap-3 sm:justify-end sm:items-center">
          {filtrados.length > 0 && (
            <button
              type="button"
              disabled={savingBatch}
              onClick={() => void handleSalvarTodasAssadeiras()}
              className="w-full sm:w-auto sm:min-w-[240px] order-2 sm:order-1 rounded-xl bg-gray-900 px-6 py-3.5 text-base font-semibold text-white hover:bg-gray-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {savingBatch ? (
                <>
                  <span className="material-icons text-xl animate-spin">refresh</span>
                  Salvando…
                </>
              ) : (
                <>
                  <span className="material-icons text-xl">save</span>
                  Salvar alterações
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto order-1 sm:order-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
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
  savingBatch,
  registerSave,
  onErro,
}: {
  row: AssadeiraRow;
  savingBatch: boolean;
  registerSave: (id: string, fn: () => Promise<boolean>) => () => void;
  onErro: (t: string) => void;
}) {
  const [nome, setNome] = useState(row.nome);
  const [numeroBuracos, setNumeroBuracos] = useState(String(row.numero_buracos ?? 0));
  const [diametroBuracos, setDiametroBuracos] = useState(
    row.diametro_buracos_mm != null ? String(row.diametro_buracos_mm) : '',
  );
  const [descricao, setDescricao] = useState(row.descricao ?? '');
  const [codigo, setCodigo] = useState(row.codigo ?? '');
  const [ordem, setOrdem] = useState(String(row.ordem));
  const [ativo, setAtivo] = useState(row.ativo);

  const salvar = useCallback(async (): Promise<boolean> => {
    const o = parseInt(ordem, 10);
    const nb = parseInt(numeroBuracos, 10);
    const res = await updateAssadeira({
      id: row.id,
      nome,
      codigo: codigo.trim() || null,
      ordem: Number.isFinite(o) ? o : 0,
      numeroBuracos: Number.isFinite(nb) ? nb : 0,
      descricao: descricao.trim() || null,
      diametroBuracosMm: parseOptionalDiametroBuracosMm(diametroBuracos),
      ativo,
    });
    if (!res.success) {
      onErro(res.error ?? 'Erro ao salvar.');
      return false;
    }
    return true;
  }, [
    row.id,
    nome,
    codigo,
    ordem,
    numeroBuracos,
    descricao,
    diametroBuracos,
    ativo,
    onErro,
  ]);

  useEffect(() => {
    return registerSave(row.id, salvar);
  }, [row.id, salvar, registerSave]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={savingBatch}
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
            disabled={savingBatch}
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
            disabled={savingBatch}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ordem</label>
          <input
            type="number"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
            disabled={savingBatch}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-y min-h-[56px]"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={savingBatch}
            placeholder="Observações sobre esta lata…"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            disabled={savingBatch}
            placeholder="—"
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={savingBatch}
            />
            <span className="text-sm text-gray-700">Ativa</span>
          </label>
        </div>
      </div>
    </div>
  );
}
