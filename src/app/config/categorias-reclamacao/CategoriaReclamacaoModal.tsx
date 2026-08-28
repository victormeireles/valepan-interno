'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  createReclamacaoCategoria,
  updateReclamacaoCategoria,
} from '@/app/actions/reclamacao-categoria-actions';
import type { ReclamacaoCategoriaRecord } from '@/domain/reclamacoes/reclamacao-types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categoria?: ReclamacaoCategoriaRecord;
  onSaved?: () => void;
};

export default function CategoriaReclamacaoModal({
  isOpen,
  onClose,
  categoria,
  onSaved,
}: Props) {
  const titleId = useId();
  const [nome, setNome] = useState('');
  const [ordem, setOrdem] = useState(0);
  const [ativa, setAtiva] = useState(true);
  const [exigeObservacao, setExigeObservacao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [animating, setAnimating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef('');

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      const next = {
        nome: categoria?.nome ?? '',
        ordem: categoria?.ordem ?? 0,
        ativa: categoria?.ativa ?? true,
        exigeObservacao: categoria?.exigeObservacao ?? false,
      };
      setNome(next.nome);
      setOrdem(next.ordem);
      setAtiva(next.ativa);
      setExigeObservacao(next.exigeObservacao);
      setError('');
      setFieldErrors({});
      setDirty(false);
      initialSnapshot.current = JSON.stringify(next);
      return;
    }
    const timer = setTimeout(() => setAnimating(false), 200);
    return () => clearTimeout(timer);
  }, [isOpen, categoria]);

  useEffect(() => {
    if (!isOpen) return;
    const current = JSON.stringify({ nome, ordem, ativa, exigeObservacao });
    setDirty(current !== initialSnapshot.current);
  }, [isOpen, nome, ordem, ativa, exigeObservacao]);

  if (!isOpen && !animating) return null;

  const handleClose = () => {
    if (dirty && !confirm('Descartar alterações não salvas?')) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) {
      setFieldErrors({ nome: 'Informe o nome.' });
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    const payload = {
      nome: trimmed,
      ordem: Number.isFinite(ordem) ? ordem : 0,
      ativa,
      exigeObservacao,
    };

    try {
      const response = categoria
        ? await updateReclamacaoCategoria(categoria.id, payload)
        : await createReclamacaoCategoria(payload);

      if (!response.success) {
        if (response.error === 'Informe o nome.') {
          setFieldErrors({ nome: response.error });
        } else {
          setError(response.error);
        }
        return;
      }

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-0 transition-opacity duration-200 md:items-center md:p-4 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-all duration-300 md:max-w-lg md:rounded-3xl ${
          isOpen ? 'translate-y-0 md:scale-100' : 'translate-y-4 md:scale-95'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 bg-stone-50/60 px-6 py-5 md:px-8">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
              {categoria ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Tipo de problema no caderno de reclamações.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {error ? (
            <div
              role="alert"
              className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700"
            >
              <span className="material-icons text-sm">error</span>
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="categoria-reclamacao-nome"
              label="Nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={fieldErrors.nome}
              placeholder="Ex.: Queimado, Atraso, Embalagem"
            />

            <Input
              id="categoria-reclamacao-ordem"
              label="Ordem"
              type="number"
              numeric
              min={0}
              step={1}
              inputMode="numeric"
              value={ordem}
              onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 0)}
            />

            <div className="space-y-3">
              <Switch
                id="categoria-reclamacao-ativa"
                checked={ativa}
                onChange={setAtiva}
                label="Ativa"
              />
              <Switch
                id="categoria-reclamacao-exige-obs"
                checked={exigeObservacao}
                onChange={setExigeObservacao}
                label="Exige observação"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                icon="save"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
