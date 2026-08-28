'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  createReclamacao,
  deleteReclamacao,
  updateReclamacao,
} from '@/app/actions/reclamacao-actions';
import { Button } from '@/components/ui/Button';
import { formatarDataIsoPtBr } from '@/domain/reclamacoes/reclamacao-data';
import { validarReclamacaoSave } from '@/domain/reclamacoes/reclamacao-input';
import { ERRO_SALVAR_RECLAMACAO } from '@/domain/reclamacoes/reclamacao-mensagens';
import type {
  ReclamacaoCategoriaRecord,
  ReclamacaoListItem,
  ReclamacaoOpcao,
} from '@/domain/reclamacoes/reclamacao-types';
import { postReclamacaoFoto } from '@/features/reclamacoes/reclamacao-foto-client';
import {
  categoriasDoSelect,
  idPorNome,
} from '@/features/reclamacoes/reclamacao-form-options';
import {
  salvarReclamacaoComFotos,
  type ReclamacaoSavePayload,
} from '@/features/reclamacoes/reclamacao-save-flow';
import ReclamacaoFotoField from '@/features/reclamacoes/components/ReclamacaoFotoField';
import ReclamacaoModalFields, {
  type ReclamacaoFormFieldsValue,
} from '@/features/reclamacoes/components/ReclamacaoModalFields';
import { compressImage } from '@/utils/imageCompression';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  reclamacao?: ReclamacaoListItem;
  clientes: ReclamacaoOpcao[];
  produtos: ReclamacaoOpcao[];
  categoriasAtivas: ReclamacaoCategoriaRecord[];
  onSaved: (mode: 'create' | 'update') => void;
  onSaveError: (message: string) => void;
};

const EMPTY_FORM: ReclamacaoFormFieldsValue = {
  clienteNome: '',
  produtoNome: '',
  categoriaId: '',
  observacao: '',
  dataFabricacao: '',
  dataProblema: '',
  quantidade: 0,
  unidade: 'pacotes',
};

function formFromItem(item: ReclamacaoListItem): ReclamacaoFormFieldsValue {
  return {
    clienteNome: item.clienteNome,
    produtoNome: item.produtoNome,
    categoriaId: item.categoriaId,
    observacao: item.observacao ?? '',
    dataFabricacao: item.dataFabricacao.slice(0, 10),
    dataProblema: item.dataProblema.slice(0, 10),
    quantidade: item.quantidade,
    unidade: item.unidade,
  };
}

function categoriaAtual(
  item: ReclamacaoListItem | undefined,
): ReclamacaoCategoriaRecord | null {
  if (!item) return null;
  return {
    id: item.categoriaId,
    nome: item.categoriaNome,
    ordem: 0,
    ativa: true,
    exigeObservacao: item.categoriaExigeObservacao,
  };
}

export default function ReclamacaoModal({
  isOpen,
  onClose,
  reclamacao,
  clientes,
  produtos,
  categoriasAtivas,
  onSaved,
  onSaveError,
}: Props) {
  const titleId = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [novos, setNovos] = useState<File[]>([]);
  const [fotoIdsRemovidos, setFotoIdsRemovidos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      setForm(reclamacao ? formFromItem(reclamacao) : EMPTY_FORM);
      setNovos([]);
      setFotoIdsRemovidos([]);
      setError('');
      setFieldErrors({});
      return;
    }
    const timer = setTimeout(() => setAnimating(false), 200);
    return () => clearTimeout(timer);
  }, [isOpen, reclamacao]);

  const categorias = useMemo(
    () => categoriasDoSelect({ ativas: categoriasAtivas, atual: categoriaAtual(reclamacao) }),
    [categoriasAtivas, reclamacao],
  );
  const selecionada = categorias.find((c) => c.id === form.categoriaId);
  const exigeObservacao = selecionada?.exigeObservacao ?? false;
  const fotosVisiveis = (reclamacao?.fotos ?? []).filter(
    (f) => !fotoIdsRemovidos.includes(f.id),
  );

  if (!isOpen && !animating) return null;

  const buildPayload = (): ReclamacaoSavePayload | { error: string } => {
    const clienteId = idPorNome(clientes, form.clienteNome) || reclamacao?.clienteId || '';
    const produtoId = idPorNome(produtos, form.produtoNome) || reclamacao?.produtoId || '';
    const payload: ReclamacaoSavePayload = {
      clienteId,
      produtoId,
      categoriaId: form.categoriaId,
      exigeObservacao,
      observacao: form.observacao,
      dataFabricacao: form.dataFabricacao,
      dataProblema: form.dataProblema,
      quantidade: form.quantidade,
      unidade: form.unidade,
    };
    const fotosCount = fotosVisiveis.length + novos.length;
    const erro = validarReclamacaoSave({ ...payload, fotosCount });
    if (erro) return { error: erro };
    return payload;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const built = buildPayload();
    if ('error' in built) {
      setFieldErrors(
        built.error === 'Descreva o problema.' ? { observacao: built.error } : {},
      );
      setError(built.error);
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});
    const mode = reclamacao ? 'update' : 'create';
    const result = await salvarReclamacaoComFotos(
      {
        create: createReclamacao,
        update: updateReclamacao,
        remove: deleteReclamacao,
        postFoto: postReclamacaoFoto,
        compress: (file) => compressImage(file, 4),
      },
      {
        mode,
        id: reclamacao?.id,
        payload: built,
        fotoIdsRemovidos,
        arquivosNovos: novos,
      },
    );
    setLoading(false);

    if (!result.ok) {
      if (result.error === ERRO_SALVAR_RECLAMACAO) {
        onSaveError(result.error);
        if (mode === 'create') onClose();
        return;
      }
      setError(result.error);
      return;
    }

    onSaved(mode);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-0 transition-opacity duration-200 md:items-center md:p-4 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
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
              {reclamacao ? 'Editar reclamação' : 'Nova reclamação'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
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
            <ReclamacaoModalFields
              value={form}
              clientes={clientes}
              produtos={produtos}
              categorias={categorias}
              exigeObservacao={exigeObservacao}
              fieldErrors={fieldErrors}
              onChange={setForm}
            />
            <div className="mt-5">
              <ReclamacaoFotoField
                existentes={reclamacao?.fotos ?? []}
                fotoIdsRemovidos={fotoIdsRemovidos}
                novos={novos}
                onRemovidosChange={setFotoIdsRemovidos}
                onNovosChange={setNovos}
              />
            </div>
            {reclamacao ? (
              <p className="mt-6 text-sm text-stone-500">
                Registrado por {reclamacao.criadoPorNome ?? '—'} em{' '}
                {formatarDataIsoPtBr(reclamacao.createdAt)}.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 px-6 py-4 sm:flex-row md:px-8">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" icon="save" disabled={loading} className="flex-1">
              {loading ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
