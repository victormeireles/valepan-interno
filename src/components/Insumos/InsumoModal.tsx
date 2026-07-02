'use client';

import { useState, useEffect } from 'react';
import {
  createInsumo,
  deleteInsumo,
  getIntegracoesInsumo,
  getReceitasPorInsumo,
  updateInsumo,
  type Insumo,
} from '@/app/actions/insumos-actions';
import {
  formatarMotivoBloqueioExclusaoInsumo,
  podeExcluirInsumo,
  resolverBloqueiosExclusaoInsumo,
} from '@/domain/insumos/insumo-delete-eligibility';
import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import Accordion from '@/components/Accordion';
import InsumoCustoSegmentControl from '@/components/Insumos/InsumoCustoSegmentControl';
import InsumoReceitasLista from '@/components/Insumos/InsumoReceitasLista';
import InsumoVinculosOmieLista from '@/components/Insumos/InsumoVinculosOmieLista';
import {
  custoUnitarioFromForm,
  estadoInicialFromCusto,
  type InsumoCustoEstado,
} from '@/domain/insumos/insumo-custo-estado';

interface InsumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumo?: Insumo;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export default function InsumoModal({
  isOpen,
  onClose,
  insumo,
  onSaved,
  onDeleted,
}: InsumoModalProps) {
  const [nome, setNome] = useState('');
  const [custoEstado, setCustoEstado] = useState<InsumoCustoEstado>('pendente');
  const [valorComCusto, setValorComCusto] = useState(0);
  const [unidadeId, setUnidadeId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const [integracoes, setIntegracoes] = useState<IntegracaoInsumoComEmpresa[]>([]);
  const [integracoesLoading, setIntegracoesLoading] = useState(false);
  const [receitas, setReceitas] = useState<InsumoReceitaAssociacao[]>([]);
  const [receitasLoading, setReceitasLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
      if (insumo) {
        const estado = estadoInicialFromCusto(insumo.custo_unitario);
        setNome(insumo.nome);
        setCustoEstado(estado);
        setValorComCusto(estado === 'com_custo' ? (insumo.custo_unitario ?? 0) : 0);
        setUnidadeId(insumo.unidade_id);
        setAtivo(insumo.ativo);
      } else {
        setNome('');
        setCustoEstado('pendente');
        setValorComCusto(0);
        setUnidadeId('');
        setAtivo(true);
        setIntegracoes([]);
        setReceitas([]);
      }
      setError('');
      setConfirmDelete(false);
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, insumo]);

  useEffect(() => {
    if (!isOpen || !insumo) {
      setIntegracoes([]);
      setReceitas([]);
      return;
    }

    setIntegracoesLoading(true);
    setReceitasLoading(true);

    getIntegracoesInsumo(insumo.id)
      .then(setIntegracoes)
      .catch(() => setIntegracoes([]))
      .finally(() => setIntegracoesLoading(false));

    getReceitasPorInsumo(insumo.id)
      .then(setReceitas)
      .catch(() => setReceitas([]))
      .finally(() => setReceitasLoading(false));
  }, [isOpen, insumo]);

  if (!isOpen && !animating) return null;

  const podeExcluir =
    !receitasLoading &&
    !integracoesLoading &&
    podeExcluirInsumo(receitas.length, integracoes.length);
  const motivoBloqueioExclusao = formatarMotivoBloqueioExclusaoInsumo(
    resolverBloqueiosExclusaoInsumo({
      receitasCount: receitas.length,
      vinculosOmieCount: integracoes.length,
      movimentosCount: 0,
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!nome.trim()) {
        throw new Error('Nome é obrigatório');
      }

      if (!unidadeId) {
        throw new Error('Unidade é obrigatória');
      }

      const custoResolvido = custoUnitarioFromForm(custoEstado, valorComCusto);

      if (custoEstado === 'com_custo' && custoResolvido == null) {
        throw new Error('Informe um valor maior que zero para custo com compra');
      }

      const payload = {
        nome: nome.trim(),
        custo_unitario: custoResolvido,
        unidade_id: unidadeId,
        ativo,
      };

      const response = insumo
        ? await updateInsumo({ id: insumo.id, ...payload })
        : await createInsumo(payload);

      if (!response.success) {
        throw new Error(response.error as string);
      }

      onSaved?.();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar insumo';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      if (!insumo) {
        setNome('');
        setCustoEstado('pendente');
        setValorComCusto(0);
        setUnidadeId('');
        setAtivo(true);
      }
      setError('');
      setConfirmDelete(false);
    }, 200);
  };

  const handleDelete = async () => {
    if (!insumo || !podeExcluir) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await deleteInsumo(insumo.id);

      if (!response.success) {
        throw new Error(response.error ?? 'Erro ao excluir insumo');
      }

      onDeleted?.();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir insumo';
      setError(errorMessage);
      setConfirmDelete(false);
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="text-2xl font-bold text-gray-900">
              {insumo ? 'Editar Insumo' : 'Novo Insumo'}
            </h2>
            <p className="text-sm text-gray-500">
              {insumo ? 'Atualize os dados do insumo.' : 'Preencha os dados para cadastrar.'}
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
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Ex: Farinha de Trigo"
                required
              />
            </div>

            <InsumoCustoSegmentControl
              estado={custoEstado}
              valorComCusto={valorComCusto}
              onEstadoChange={setCustoEstado}
              onValorComCustoChange={setValorComCusto}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Status
              </label>
              <div className="flex items-center h-[50px]">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">
                Unidade <span className="text-red-500">*</span>
              </label>
              <SelectRemoteAutocomplete
                value={unidadeId}
                onChange={setUnidadeId}
                stage="unidades"
                label=""
                placeholder="Selecione a unidade..."
                required
              />
            </div>

            {insumo ? (
              <>
                <Accordion title={`Receitas (${receitas.length})`} defaultOpen={false}>
                  {receitasLoading ? (
                    <p className="text-sm text-gray-500">Carregando receitas…</p>
                  ) : (
                    <InsumoReceitasLista receitas={receitas} />
                  )}
                </Accordion>

                <Accordion title={`Vínculos Omie (${integracoes.length})`} defaultOpen={false}>
                  {integracoesLoading ? (
                    <p className="text-sm text-gray-500">Carregando vínculos…</p>
                  ) : (
                    <InsumoVinculosOmieLista vinculos={integracoes} />
                  )}
                </Accordion>
              </>
            ) : null}

            <div className="pt-4 flex flex-col gap-3">
              {insumo ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={loading || !podeExcluir}
                  title={!podeExcluir ? motivoBloqueioExclusao : undefined}
                  className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-icons text-base" aria-hidden="true">
                    delete
                  </span>
                  {confirmDelete ? 'Confirmar exclusão' : 'Excluir insumo'}
                </button>
              ) : null}

              <div className="flex gap-3">
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
                      <span>{insumo ? 'Salvar Alterações' : 'Criar Insumo'}</span>
                      <span className="material-icons text-sm">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

