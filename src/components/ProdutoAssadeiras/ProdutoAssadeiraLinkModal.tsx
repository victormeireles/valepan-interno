'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import {
  createProdutoAssadeiraLink,
  updateProdutoAssadeiraLink,
} from '@/app/actions/produto-assadeiras-actions';
import type {
  ProdutoAssadeiraLink,
  ProdutoComAssadeirasResumo,
} from '@/domain/assadeiras/produto-assadeira-types';
import AssadeiraCapacityPreview from '@/components/Assadeiras/AssadeiraCapacityPreview';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  produtoId: string;
  assadeirasAtivas: Assadeira[];
  linkedAssadeiraIds: string[];
  existingLinks: ProdutoAssadeiraLink[];
  link?: ProdutoAssadeiraLink;
  onSaved: (link: ProdutoAssadeiraLink, produto: ProdutoComAssadeirasResumo) => void;
};

function resolveDefaultOrdem(links: ProdutoAssadeiraLink[]): number {
  if (links.length === 0) return 0;
  return Math.max(...links.map((item) => item.ordem)) + 1;
}

const inputClassName =
  'w-full min-h-11 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all';

export default function ProdutoAssadeiraLinkModal({
  isOpen,
  onClose,
  produtoId,
  assadeirasAtivas,
  linkedAssadeiraIds,
  existingLinks,
  link,
  onSaved,
}: Props) {
  const titleId = useId();
  const [assadeiraId, setAssadeiraId] = useState('');
  const [usarPadrao, setUsarPadrao] = useState(true);
  const [override, setOverride] = useState<number | ''>('');
  const [ordem, setOrdem] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [animating, setAnimating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef('');

  const selectableAssadeiras = useMemo(() => {
    if (link) return assadeirasAtivas;
    return assadeirasAtivas.filter((a) => !linkedAssadeiraIds.includes(a.id));
  }, [assadeirasAtivas, linkedAssadeiraIds, link]);

  const selectedAssadeira = useMemo(
    () => assadeirasAtivas.find((a) => a.id === assadeiraId) ?? null,
    [assadeirasAtivas, assadeiraId],
  );

  const fatorEfetivo = resolveUnidadesPorAssadeiraEfetiva({
    produto: usarPadrao ? null : override === '' ? null : override,
    assadeira: selectedAssadeira?.unidades_por_assadeira,
  });

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const next = {
        assadeiraId: link?.assadeira_id ?? selectableAssadeiras[0]?.id ?? '',
        usarPadrao: link ? link.unidades_por_assadeira == null : true,
        override: link?.unidades_por_assadeira ?? '',
        ordem: link?.ordem ?? resolveDefaultOrdem(existingLinks),
      };
      setAssadeiraId(next.assadeiraId);
      setUsarPadrao(next.usarPadrao);
      setOverride(next.override as number | '');
      setOrdem(next.ordem);
      setError('');
      setFieldError('');
      setDirty(false);
      initialSnapshot.current = JSON.stringify(next);
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, link, selectableAssadeiras, existingLinks]);

  useEffect(() => {
    if (!isOpen) return;
    const current = JSON.stringify({ assadeiraId, usarPadrao, override, ordem });
    setDirty(current !== initialSnapshot.current);
  }, [isOpen, assadeiraId, usarPadrao, override, ordem]);

  if (!isOpen && !animating) return null;

  const handleClose = () => {
    if (dirty && !confirm('Descartar alterações não salvas?')) return;
    onClose();
  };

  const validateClient = () => {
    if (!link && !assadeiraId) return 'Selecione uma assadeira';
    if (!usarPadrao) {
      if (override === '' || !Number.isInteger(override) || override < 1) {
        return 'Informe ao menos 1 pão por assadeira';
      }
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateClient();
    setFieldError(validationError);
    if (validationError) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        produto_id: produtoId,
        assadeira_id: assadeiraId,
        usar_padrao: usarPadrao,
        unidades_por_assadeira: usarPadrao ? null : (override as number),
        ordem,
      };

      const response = link
        ? await updateProdutoAssadeiraLink(link.id, {
            usar_padrao: usarPadrao,
            unidades_por_assadeira: usarPadrao ? null : (override as number),
            ordem,
          })
        : await createProdutoAssadeiraLink(payload);

      if (!response.success) throw new Error(response.error);

      onSaved(response.link, response.produto);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar vínculo');
    } finally {
      setLoading(false);
    }
  };

  const padraoLabel = selectedAssadeira?.unidades_por_assadeira ?? '—';

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden transition-all duration-300 transform max-h-[85dvh] flex flex-col ${
          isOpen ? 'translate-y-0 md:scale-100' : 'translate-y-4 md:scale-95'
        }`}
      >
        <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 shrink-0">
          <h2 id={titleId} className="text-xl font-bold text-gray-900">
            {link ? 'Editar vínculo' : 'Vincular assadeira'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="link-assadeira" className="block text-sm font-medium text-gray-700 mb-2">
                Assadeira
              </label>
              <select
                id="link-assadeira"
                value={assadeiraId}
                onChange={(e) => setAssadeiraId(e.target.value)}
                disabled={Boolean(link)}
                className={`${inputClassName} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {selectableAssadeiras.length === 0 ? (
                  <option value="">Nenhuma assadeira disponível</option>
                ) : (
                  selectableAssadeiras.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))
                )}
              </select>
            </div>

            <label className="flex items-center gap-3 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={usarPadrao}
                onChange={(e) => setUsarPadrao(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-800">
                Usar padrão da assadeira
              </span>
            </label>

            {!usarPadrao && (
              <div>
                <label
                  htmlFor="link-override"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Pães por assadeira (override)
                </label>
                <input
                  id="link-override"
                  type="number"
                  min={1}
                  step={1}
                  value={override}
                  onChange={(e) =>
                    setOverride(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClassName}
                />
                {fieldError && (
                  <p role="alert" className="mt-2 text-sm text-rose-700">
                    {fieldError}
                  </p>
                )}
              </div>
            )}

            {usarPadrao && (
              <p className="text-sm text-gray-500">
                Deixe vazio para usar o padrão da assadeira ({padraoLabel} pães).
              </p>
            )}

            {fatorEfetivo != null && (
              <AssadeiraCapacityPreview paesPorAssadeira={fatorEfetivo} />
            )}

            <div>
              <label htmlFor="link-ordem" className="block text-sm font-medium text-gray-700 mb-2">
                Ordem de prioridade
              </label>
              <input
                id="link-ordem"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 0)}
                className={`${inputClassName} tabular-nums`}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Menor número = assadeira padrão em pedidos e ordens de produção.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (!link && selectableAssadeiras.length === 0)}
              className="min-h-11 px-5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
