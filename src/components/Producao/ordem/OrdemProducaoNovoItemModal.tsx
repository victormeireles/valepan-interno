'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OrdemProducaoLataSelecao } from '@/domain/types/ordem-producao';
import {
  estimateCaixasFromLatas,
  estimateLatasFromCaixas,
} from '@/lib/production/ordem-producao-conversions';
import { avaliarLataSplit } from '@/lib/production/latas-uso-resumo';
import SelectRemoteAutocomplete from '@/components/Producao/SelectRemoteAutocomplete';
import {
  getOrdemProducaoDiariaLataPicker,
  getUnidadesCaixaPreviewOrdemDiaria,
  type AssadeiraOpcaoOrdemProducao,
} from '@/app/actions/producao-actions';
import type { TipoCaixaOrdemOpcao } from '@/app/actions/tipos-caixa-embalagem-actions';
import type { ClienteOrdemProducaoOpcao } from '@/app/actions/producao-actions';
import ClientesOrdemPicklist from '@/components/Producao/ordem/ClientesOrdemPicklist';

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';

export type OrdemProducaoNovoItemSubmitValues = {
  produtoId: string;
  /** UUID da assadeira em `produto_assadeiras` (cadastro de latas do produto). */
  tipoLata: OrdemProducaoLataSelecao;
  latasPlanejadas: number;
  caixasEstimadas: number;
  clientes: string[];
  observacaoEmbalagem?: string | null;
  observacaoProducao?: string | null;
  tipoCaixaEmbalagemId?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  tiposCaixaOpcoes: TipoCaixaOrdemOpcao[];
  clientesOrdemOpcoes: ClienteOrdemProducaoOpcao[];
  onSubmit: (
    values: OrdemProducaoNovoItemSubmitValues,
  ) => Promise<{ success: true } | { success: false; error: string }>;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className="min-w-0">{children}</div>
    </>
  );
}

export default function OrdemProducaoNovoItemModal({
  open,
  onClose,
  disabled = false,
  tiposCaixaOpcoes,
  clientesOrdemOpcoes,
  onSubmit,
}: Props) {
  const [formKey, setFormKey] = useState(0);
  const [produtoId, setProdutoId] = useState('');
  const [latasOpcoes, setLatasOpcoes] = useState<AssadeiraOpcaoOrdemProducao[]>([]);
  const [assadeiraId, setAssadeiraId] = useState('');
  const [boxUnitsProduto, setBoxUnitsProduto] = useState<number | null>(null);
  const [latasLoading, setLatasLoading] = useState(false);
  const [latas, setLatas] = useState('0');
  const [caixas, setCaixas] = useState('0');
  const [ultimoEditado, setUltimoEditado] = useState<'latas' | 'caixas'>('latas');
  const [clientesSel, setClientesSel] = useState<string[]>([]);
  const [obsEmb, setObsEmb] = useState('');
  const [obsPro, setObsPro] = useState('');
  const [tipoCaixaId, setTipoCaixaId] = useState('');
  const [unidadesCaixaPreview, setUnidadesCaixaPreview] = useState<{
    unidadesPorCaixa: number | null;
    boxUnitsFallback: number | null;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProdutoId('');
    setLatasOpcoes([]);
    setAssadeiraId('');
    setBoxUnitsProduto(null);
    setLatas('0');
    setCaixas('0');
    setUltimoEditado('latas');
    setClientesSel([]);
    setObsEmb('');
    setObsPro('');
    setTipoCaixaId('');
    setUnidadesCaixaPreview(null);
    setLocalError(null);
    setPending(false);
    setFormKey((k) => k + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const pid = produtoId.trim();
    if (!pid) {
      setLatasOpcoes([]);
      setAssadeiraId('');
      setBoxUnitsProduto(null);
      return;
    }
    let cancelled = false;
    setLatasLoading(true);
    void (async () => {
      const r = await getOrdemProducaoDiariaLataPicker(pid, '');
      if (cancelled) return;
      setLatasLoading(false);
      if (!r.success) {
        setLatasOpcoes([]);
        setAssadeiraId('');
        setBoxUnitsProduto(null);
        setLocalError(r.error);
        return;
      }
      setLatasOpcoes(r.options);
      setBoxUnitsProduto(r.boxUnits);
      const sel = r.selectedAssadeiraId ?? r.options[0]?.id ?? '';
      setAssadeiraId(sel);
      setLocalError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, produtoId]);

  useEffect(() => {
    if (!open) return;
    const pid = produtoId.trim();
    if (!pid) {
      setUnidadesCaixaPreview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await getUnidadesCaixaPreviewOrdemDiaria(pid, tipoCaixaId.trim() || null);
      if (cancelled) return;
      if (!r.success) {
        setUnidadesCaixaPreview(null);
        return;
      }
      setUnidadesCaixaPreview({
        unidadesPorCaixa: r.unidadesPorCaixa,
        boxUnitsFallback: r.boxUnitsFallback,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, produtoId, tipoCaixaId]);

  const lataSel = useMemo(
    () => latasOpcoes.find((o) => o.id === assadeiraId) ?? null,
    [latasOpcoes, assadeiraId],
  );

  const convParams = useMemo(() => {
    const upc =
      unidadesCaixaPreview?.unidadesPorCaixa != null && unidadesCaixaPreview.unidadesPorCaixa > 0
        ? unidadesCaixaPreview.unidadesPorCaixa
        : null;
    const buf = upc != null ? null : (unidadesCaixaPreview?.boxUnitsFallback ?? boxUnitsProduto);
    return {
      numeroBuracosAssadeira: lataSel?.numero_buracos,
      unidadesPorAssadeiraCadastro: lataSel?.unidades_por_assadeira,
      unidadesPorCaixa: upc,
      boxUnits: buf,
    };
  }, [lataSel, unidadesCaixaPreview, boxUnitsProduto]);

  const calcularCaixas = useCallback(
    (latasNum: number) => estimateCaixasFromLatas({ latas: latasNum, ...convParams }),
    [convParams],
  );
  const calcularLatas = useCallback(
    (caixasNum: number) => estimateLatasFromCaixas({ caixas: caixasNum, ...convParams }),
    [convParams],
  );

  const onLatasChange = (v: string) => {
    setLatas(v);
    setUltimoEditado('latas');
    setCaixas(String(calcularCaixas(Math.max(0, Number(v) || 0))));
  };
  const onCaixasChange = (v: string) => {
    setCaixas(v);
    setUltimoEditado('caixas');
    setLatas(String(calcularLatas(Math.max(0, Number(v) || 0))));
  };

  // Quando o cadastro de lata/caixa carrega (assíncrono), recalcula o campo derivado a partir do que o utilizador digitou.
  useEffect(() => {
    if (ultimoEditado === 'latas') {
      setCaixas(String(calcularCaixas(Math.max(0, Number(latas) || 0))));
    } else {
      setLatas(String(calcularLatas(Math.max(0, Number(caixas) || 0))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParams, ultimoEditado]);

  const unidadesPorLataPreview = useMemo(() => {
    const br = Math.round(Number(lataSel?.numero_buracos ?? 0));
    if (br > 0) return br;
    const ua = Math.round(Number(lataSel?.unidades_por_assadeira ?? 0));
    return ua > 0 ? ua : 1;
  }, [lataSel]);

  const lataSplitAviso = useMemo(
    () => avaliarLataSplit(Math.max(0, Number(latas) || 0), lataSel?.quantidade_latas ?? 0),
    [latas, lataSel],
  );

  if (!open) return null;

  const submit = async () => {
    setLocalError(null);
    const id = produtoId.trim();
    if (!id) {
      setLocalError('Produto obrigatório.');
      return;
    }
    if (!assadeiraId.trim()) {
      setLocalError('Selecione uma lata cadastrada para este produto (em Produtos → Latas).');
      return;
    }
    const latasPlanejadas = Math.max(0, Math.round(Number(latas) || 0));
    const caixasEstimadas = Math.max(0, Math.round(Number(caixas) || 0));
    setPending(true);
    const r = await onSubmit({
      produtoId: id,
      tipoLata: assadeiraId.trim(),
      latasPlanejadas,
      caixasEstimadas,
      clientes: clientesSel,
      observacaoEmbalagem: obsEmb.trim() || null,
      observacaoProducao: obsPro.trim() || null,
      tipoCaixaEmbalagemId: tipoCaixaId.trim() || null,
    });
    setPending(false);
    if (!r.success) {
      setLocalError(r.error);
      return;
    }
    onClose();
  };

  const lataSelectDisabled = disabled || pending || latasLoading || latasOpcoes.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={() => !pending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ordem-novo-item-titulo"
        className="relative max-h-[min(90vh,44rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <h2 id="ordem-novo-item-titulo" className="text-base font-semibold text-slate-900 sm:text-lg">
            Novo item
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[10rem_1fr] sm:items-start">
            <Row label="Produto">
              <SelectRemoteAutocomplete
                key={formKey}
                value={produtoId}
                onChange={setProdutoId}
                stage="produtos"
                label=""
                placeholder=""
                disabled={disabled || pending}
              />
            </Row>
            <Row label="Lata">
              <select
                value={assadeiraId}
                disabled={lataSelectDisabled}
                onChange={(e) => setAssadeiraId(e.target.value)}
                className={fieldClass}
                aria-busy={latasLoading}
              >
                {latasOpcoes.length === 0 ? (
                  <option value="">
                    {produtoId.trim()
                      ? latasLoading
                        ? 'A carregar latas…'
                        : 'Nenhuma lata cadastrada para este produto'
                      : 'Escolha primeiro o produto'}
                  </option>
                ) : (
                  latasOpcoes.map((o) => {
                    const br = Math.round(Number(o.numero_buracos ?? 0));
                    const hint =
                      br > 0
                        ? `${br} un./lata (buracos)`
                        : `${o.unidades_por_assadeira} un./lata (cadastro)`;
                    return (
                      <option key={o.id} value={o.id}>
                        {o.nome} — {hint}
                      </option>
                    );
                  })
                )}
              </select>
            </Row>
            <Row label="Tipo de caixa">
              <select
                value={tipoCaixaId}
                disabled={disabled || pending || !produtoId.trim()}
                onChange={(e) => setTipoCaixaId(e.target.value)}
                className={fieldClass}
                aria-label="Tipo de caixa"
              >
                <option value="">Padrão do produto (box_units)</option>
                {tiposCaixaOpcoes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.clienteNome}) — {t.unidadesPorCaixa} un./cx
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Latas planejadas">
              <div className="space-y-1">
                <input
                  type="number"
                  min={0}
                  value={latas}
                  disabled={disabled || pending}
                  onChange={(e) => onLatasChange(e.target.value)}
                  className={fieldClass}
                />
                {lataSplitAviso.excede ? (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                    Só há {lataSplitAviso.disponivel} latas «{lataSel?.nome ?? 'deste tipo'}»
                    cadastradas. Para {lataSplitAviso.emUso} latas, considere dividir em{' '}
                    {lataSplitAviso.lotesSugeridos} lotes (lavar e reutilizar entre eles).
                  </p>
                ) : null}
              </div>
            </Row>
            <Row label="Caixas estimadas">
              <div className="space-y-1">
                <input
                  type="number"
                  min={0}
                  value={caixas}
                  disabled={disabled || pending}
                  onChange={(e) => onCaixasChange(e.target.value)}
                  className={fieldClass}
                />
                <p className="text-xs text-slate-500">
                  Digite latas ou caixas — o outro valor é calculado. ≈ {unidadesPorLataPreview} un.
                  por lata ÷ unidades por caixa (
                  {unidadesCaixaPreview?.unidadesPorCaixa != null && unidadesCaixaPreview.unidadesPorCaixa > 0
                    ? `${unidadesCaixaPreview.unidadesPorCaixa} (tipo/override)`
                    : `${unidadesCaixaPreview?.boxUnitsFallback ?? boxUnitsProduto ?? '—'} (box_units)`}
                  ).
                </p>
              </div>
            </Row>
            <Row label="Cliente">
              <ClientesOrdemPicklist
                opcoes={clientesOrdemOpcoes}
                value={clientesSel}
                onChange={setClientesSel}
                disabled={disabled || pending}
                compact
                single
              />
            </Row>
            <Row label="Obs. embalagem">
              <textarea
                rows={2}
                maxLength={500}
                value={obsEmb}
                disabled={disabled || pending}
                onChange={(e) => setObsEmb(e.target.value)}
                className={fieldClass}
                placeholder="Etiquetas, caixas, instruções para embalagem…"
              />
            </Row>
            <Row label="Obs. produção">
              <textarea
                rows={2}
                maxLength={500}
                value={obsPro}
                disabled={disabled || pending}
                onChange={(e) => setObsPro(e.target.value)}
                className={fieldClass}
                placeholder="Forno, massa, prioridades na linha…"
              />
            </Row>
          </div>

          {localError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {localError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending || disabled}
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || disabled}
              onClick={() => void submit()}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {pending ? 'Salvando…' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
