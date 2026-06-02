'use client';

import { useEffect, useMemo, useState } from 'react';

/** Valores de uma das partes resultantes da divisão de uma ordem. */
export type OrdemDividirParte = {
  latasPlanejadas: number;
  caixasEstimadas: number;
  observacaoProducao: string | null;
  observacaoEmbalagem: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  produtoNome: string;
  lataNome: string;
  /** Latas planejadas originais (referência para o complemento). */
  totalLatas: number;
  /** Caixas estimadas originais (rateadas proporcionalmente por parte). */
  totalCaixas: number;
  /** Estoque do tipo de lata — usado só para alertar quando uma parte ainda excede. */
  disponivel: number;
  observacaoProducaoOriginal: string | null;
  observacaoEmbalagemOriginal: string | null;
  saving: boolean;
  onConfirm: (parte1: OrdemDividirParte, parte2: OrdemDividirParte) => Promise<boolean> | void;
}

function parseInt0(v: string): number {
  const n = Math.round(Number(String(v).replace(',', '.')));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function OrdemProducaoDividirModal({
  open,
  onClose,
  produtoNome,
  lataNome,
  totalLatas,
  totalCaixas,
  disponivel,
  observacaoProducaoOriginal,
  observacaoEmbalagemOriginal,
  saving,
  onConfirm,
}: Props) {
  const [latas1, setLatas1] = useState('');
  const [latas2, setLatas2] = useState('');
  // A 2ª parte completa o total automaticamente até o usuário editá-la diretamente.
  const [parte2Manual, setParte2Manual] = useState(false);
  const [obsPro1, setObsPro1] = useState('');
  const [obsPro2, setObsPro2] = useState('');
  const [obsEmb1, setObsEmb1] = useState('');
  const [obsEmb2, setObsEmb2] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLatas1('');
    setLatas2('');
    setParte2Manual(false);
    // Obs. produção e embalagem: apaga o texto anterior e usa o padrão «Nª produção / nome da lata».
    setObsPro1(`1ª produção / ${lataNome}`);
    setObsPro2(`2ª produção / ${lataNome}`);
    setObsEmb1(`1ª produção / ${lataNome}`);
    setObsEmb2(`2ª produção / ${lataNome}`);
    setErro(null);
  }, [open, lataNome]);

  const n1 = parseInt0(latas1);
  const n2 = parseInt0(latas2);
  const totalAtual = n1 + n2;
  const caixas1 = totalLatas > 0 ? Math.round((totalCaixas * n1) / totalLatas) : 0;
  const caixas2 = totalLatas > 0 ? Math.round((totalCaixas * n2) / totalLatas) : 0;

  const onChangeLatas1 = (v: string) => {
    setLatas1(v);
    if (!parte2Manual) {
      const resto = Math.max(0, totalLatas - parseInt0(v));
      setLatas2(resto > 0 ? String(resto) : '');
    }
  };
  const onChangeLatas2 = (v: string) => {
    setLatas2(v);
    setParte2Manual(true);
  };
  const recompletarParte2 = () => {
    const resto = Math.max(0, totalLatas - n1);
    setLatas2(resto > 0 ? String(resto) : '');
    setParte2Manual(false);
  };

  const totalDiferente = totalAtual !== totalLatas;
  const parte1Excede = useMemo(() => disponivel > 0 && n1 > disponivel, [disponivel, n1]);
  const parte2Excede = useMemo(() => disponivel > 0 && n2 > disponivel, [disponivel, n2]);

  if (!open) return null;

  const handleConfirmar = async () => {
    if (n1 < 1 || n2 < 1) {
      setErro('Cada parte precisa de pelo menos 1 lata.');
      return;
    }
    setErro(null);
    await onConfirm(
      {
        latasPlanejadas: n1,
        caixasEstimadas: caixas1,
        observacaoProducao: obsPro1.trim() || null,
        observacaoEmbalagem: obsEmb1.trim() || null,
      },
      {
        latasPlanejadas: n2,
        caixasEstimadas: caixas2,
        observacaoProducao: obsPro2.trim() || null,
        observacaoEmbalagem: obsEmb2.trim() || null,
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dividir-ordem-titulo"
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div className="min-w-0">
            <h2 id="dividir-ordem-titulo" className="text-base font-bold text-slate-900 sm:text-lg">
              Dividir ordem em 2 produções
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-600 sm:text-sm">
              {produtoNome} · {lataNome}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
              Estoque do tipo: <strong>{disponivel}</strong> latas · Planejado original:{' '}
              <strong>{totalLatas}</strong> latas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
            Preencha uma parte; a outra completa o total automaticamente. Você pode editar as duas se quiser
            mudar o total.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                titulo: '1ª produção',
                latas: latas1,
                onLatas: onChangeLatas1,
                caixas: caixas1,
                excede: parte1Excede,
                obsPro: obsPro1,
                setObsPro: setObsPro1,
                obsEmb: obsEmb1,
                setObsEmb: setObsEmb1,
                reset: null as null | (() => void),
              },
              {
                titulo: '2ª produção',
                latas: latas2,
                onLatas: onChangeLatas2,
                caixas: caixas2,
                excede: parte2Excede,
                obsPro: obsPro2,
                setObsPro: setObsPro2,
                obsEmb: obsEmb2,
                setObsEmb: setObsEmb2,
                reset: parte2Manual ? recompletarParte2 : null,
              },
            ] as const).map((p) => (
              <div key={p.titulo} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">{p.titulo}</h3>
                  {p.reset ? (
                    <button
                      type="button"
                      onClick={p.reset}
                      disabled={saving}
                      className="text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                    >
                      completar o total
                    </button>
                  ) : null}
                </div>

                <label className="mt-2 block text-[11px] font-medium text-slate-600">Latas</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={p.latas}
                  onChange={(e) => p.onLatas(e.target.value)}
                  disabled={saving}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm tabular-nums focus:border-slate-500 focus:outline-none"
                  aria-label={`Latas da ${p.titulo}`}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Caixas (estimadas): <strong className="tabular-nums">{p.caixas}</strong>
                </p>
                {p.excede ? (
                  <p className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                    Ainda excede o estoque ({disponivel})
                  </p>
                ) : null}

                <label className="mt-3 block text-[11px] font-medium text-slate-600">Obs. produção</label>
                <p className="text-[10px] leading-tight text-slate-400">
                  Antes:{' '}
                  <span className="line-through">
                    {observacaoProducaoOriginal?.trim() || '—'}
                  </span>
                </p>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={p.obsPro}
                  onChange={(e) => p.setObsPro(e.target.value)}
                  disabled={saving}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                  aria-label={`Obs. produção da ${p.titulo} (depois)`}
                />

                <label className="mt-2 block text-[11px] font-medium text-slate-600">Obs. embalagem</label>
                <p className="text-[10px] leading-tight text-slate-400">
                  Antes:{' '}
                  <span className="line-through">
                    {observacaoEmbalagemOriginal?.trim() || '—'}
                  </span>
                </p>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={p.obsEmb}
                  onChange={(e) => p.setObsEmb(e.target.value)}
                  disabled={saving}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                  aria-label={`Obs. embalagem da ${p.titulo} (depois)`}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs">
            <span className="text-slate-600">
              Total atual:{' '}
              <strong className="tabular-nums text-slate-900">{totalAtual}</strong> latas
            </span>
            {totalDiferente ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                Total alterado (era {totalLatas})
              </span>
            ) : (
              <span className="text-[11px] text-emerald-700">Soma confere com o planejado</span>
            )}
          </div>

          {erro ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {erro}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmar()}
            disabled={saving || n1 < 1 || n2 < 1}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Dividindo…
              </>
            ) : (
              'Dividir em 2'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
