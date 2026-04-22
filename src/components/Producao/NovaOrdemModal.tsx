'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createProductionOrder,
  updateProductionOrder,
} from '@/app/actions/producao-actions';
import SelectRemoteAutocomplete from '@/components/Producao/SelectRemoteAutocomplete';
import DateInput from '@/components/FormControls/DateInput';
import type { ProductConversionInfo } from '@/lib/utils/production-conversions';
import {
  PlanningQuantityInputConverter,
  type PlanningQuantityInputKind,
  productInfoFromPlanningMeta,
  quantidadePlanejadaParaUnidadesConsumo,
} from '@/lib/utils/planning-quantity-input';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

interface NovaOrdemModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: {
    id: string;
    produto_id: string;
    produtos?: {
      nome: string;
      unidadeNomeResumido: string | null;
      package_units?: number | null;
      box_units?: number | null;
      unidades_assadeira?: number | null;
      unidades_lata_antiga?: number | null;
      unidades_lata_nova?: number | null;
      receita_massa?: {
        quantidade_por_produto: number;
      } | null;
    };
    qtd_planejada: number;
    data_producao?: string | null;
  };
  onSaved?: () => void;
}

type ProductMeta = ProductConversionInfo;

const today = () => getTodayISOInBrazilTimezone();

function productInfoFromOrderProdutos(
  p: NonNullable<NovaOrdemModalProps['order']>['produtos'],
): ProductConversionInfo | null {
  if (!p) {
    return null;
  }
  return {
    unidadeNomeResumido: p.unidadeNomeResumido,
    package_units: p.package_units ?? null,
    box_units: p.box_units ?? null,
    unidades_assadeira: p.unidades_assadeira ?? null,
    unidades_lata_antiga: p.unidades_lata_antiga ?? p.unidades_assadeira ?? null,
    unidades_lata_nova: p.unidades_lata_nova ?? null,
    receita_massa: p.receita_massa ?? null,
  };
}

export default function NovaOrdemModal({ isOpen, onClose, order, onSaved }: NovaOrdemModalProps) {
  const [produtoId, setProdutoId] = useState('');
  const [inputKind, setInputKind] = useState<PlanningQuantityInputKind>('unidades');
  const [rawQty, setRawQty] = useState<number | ''>('');
  const [dataProducao, setDataProducao] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const [produtoMeta, setProdutoMeta] = useState<ProductMeta | null>(null);
  const productInfo = produtoMeta;

  const wasModalOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      wasModalOpenRef.current = false;
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }

    setAnimating(true);
    const justOpened = !wasModalOpenRef.current;
    wasModalOpenRef.current = true;

    if (!justOpened) {
      return;
    }

    if (order) {
      setProdutoId(order.produto_id);
      setDataProducao(order.data_producao ?? today());
      const pi = productInfoFromOrderProdutos(order.produtos);
      if (pi) {
        setProdutoMeta(pi);
        const uc = quantidadePlanejadaParaUnidadesConsumo(order.qtd_planejada, pi);
        setInputKind('unidades');
        setRawQty(PlanningQuantityInputConverter.displayRawForMode(uc, 'unidades', pi));
      } else {
        setProdutoMeta(null);
        setInputKind('unidades');
        setRawQty(order.qtd_planejada);
      }
    } else {
      setProdutoId('');
      setInputKind('unidades');
      setRawQty('');
      setDataProducao(today());
      setProdutoMeta(null);
    }
  }, [isOpen, order]);

  const handleKindChange = useCallback(
    (next: PlanningQuantityInputKind) => {
      if (!productInfo) {
        setInputKind(next);
        return;
      }
      const n = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) {
        setInputKind(next);
        return;
      }
      const cur = PlanningQuantityInputConverter.unidadesConsumoFromInput(inputKind, n, productInfo);
      if (!cur.ok) {
        setInputKind(next);
        return;
      }
      const nextRaw = PlanningQuantityInputConverter.displayRawForMode(cur.value, next, productInfo);
      setInputKind(next);
      setRawQty(nextRaw);
    },
    [productInfo, inputKind, rawQty],
  );

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      if (!order) {
        setProdutoId('');
        setInputKind('unidades');
        setRawQty('');
        setDataProducao(today());
        setProdutoMeta(null);
      }
      setError('');
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!produtoId) {
        throw new Error('Selecione um produto');
      }
      if (!productInfo) {
        throw new Error('Aguarde o carregamento da unidade do produto ou selecione novamente.');
      }

      const rawNum =
        typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(',', '.'));
      if (rawQty === '' || !Number.isFinite(rawNum) || rawNum <= 0) {
        throw new Error('Informe a quantidade.');
      }

      const computed = PlanningQuantityInputConverter.computeQtdPlanejada(inputKind, rawNum, productInfo);
      if (!computed.ok) {
        throw new Error(computed.message);
      }

      const payload = {
        produtoId,
        qtdPlanejada: computed.qtdPlanejada,
        prioridade: 0,
        dataProducao,
      };

      const response = order
        ? await updateProductionOrder({ ordemId: order.id, ...payload })
        : await createProductionOrder(payload);

      if (!response.success) {
        throw new Error(response.error as string);
      }

      onSaved?.();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar ordem';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unitLower = productInfo?.unidadeNomeResumido?.toLowerCase().trim() || '';
  const lataLike =
    unitLower === 'lt' || unitLower.includes('lata') || unitLower.includes('bandeja');
  const podeCaixa = Boolean(productInfo?.box_units && productInfo.box_units > 0);
  const podeLatas = lataLike || Boolean(productInfo?.unidades_assadeira && productInfo.unidades_assadeira > 0);
  const refLataAntiga =
    productInfo?.unidades_lata_antiga ?? productInfo?.unidades_assadeira ?? null;
  const refLataNova = productInfo?.unidades_lata_nova ?? null;

  const kindButton = (kind: PlanningQuantityInputKind, label: string, disabled: boolean) => (
    <button
      key={kind}
      type="button"
      disabled={disabled}
      onClick={() => handleKindChange(kind)}
      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
        inputKind === kind
          ? 'bg-gray-900 text-white shadow-sm'
          : disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (!isOpen && !animating) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{order ? 'Editar Ordem' : 'Nova Ordem'}</h2>
            <p className="text-sm text-gray-500">
              {order ? 'Atualize os dados da ordem.' : 'Preencha os dados para iniciar.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-icons text-sm">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Produto</label>
              <SelectRemoteAutocomplete
                value={produtoId}
                onChange={setProdutoId}
                stage="produtos"
                label=""
                placeholder="Busque o produto..."
                extraFields={[
                  'unidade_padrao_id',
                  'box_units',
                  'package_units',
                  'unidades_assadeira',
                ]}
                onOptionSelected={(option) => {
                  const meta = productInfoFromPlanningMeta(option?.meta);
                  setProdutoMeta(meta);
                  setInputKind('unidades');
                  setRawQty('');
                }}
              />
              {productInfo && produtoId && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-700">
                  Antiga:{' '}
                  {refLataAntiga != null && refLataAntiga > 0 ? `${refLataAntiga} un/lt` : '—'} · Nova:{' '}
                  {refLataNova != null && refLataNova > 0 ? `${refLataNova} un/lt` : '—'}
                </div>
              )}
            </div>

            <DateInput
              label="Data da Produção"
              value={dataProducao}
              onChange={setDataProducao}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Tipo de quantidade</label>
              <div className="flex gap-2">
                {kindButton('caixa', 'Caixa', !podeCaixa)}
                {kindButton('latas', 'Latas (LT)', !podeLatas)}
                {kindButton('unidades', 'Unidades', false)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Quantidade informada (
                {inputKind === 'caixa'
                  ? 'caixa'
                  : inputKind === 'latas'
                    ? lataLike
                      ? 'LT'
                      : 'latas'
                    : 'un'}
                )
              </label>
              <div className="relative group">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rawQty === '' ? '' : rawQty}
                  onChange={(e) => {
                    const t = e.target.value.trim();
                    if (t === '') {
                      setRawQty('');
                      return;
                    }
                    const v = parseFloat(t.replace(',', '.'));
                    setRawQty(Number.isFinite(v) ? v : '');
                  }}
                  className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] px-6 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span>{order ? 'Salvar Alterações' : 'Criar Ordem'}</span>
                    <span className="material-icons text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
