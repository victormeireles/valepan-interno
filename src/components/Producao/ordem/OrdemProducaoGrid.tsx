'use client';

import type { OrdemProducaoDiariaItemView } from '@/app/actions/producao-actions';
import type { OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';
import OrdemProducaoRow from './OrdemProducaoRow';

interface OrdemProducaoGridProps {
  items: OrdemProducaoDiariaItemView[];
  /** Cabeçalho da ordem diária (para `removeOrdemProducaoDiariaItem`). Vazio em modo pré-visualização. */
  ordemDiariaId: string;
  onRemoveLineResult: (message: string | null) => void;
  /** Ajusta a mensagem da tabela vazia (ex.: esqueleto sem migração). */
  previewMode?: boolean;
  onMoveUp: (itemId: string) => void;
  onMoveDown: (itemId: string) => void;
  onSaveRow: (payload: {
    itemId: string;
    prioridade: number;
    produtoId: string;
    tipoLata: OrdemProducaoTipoLata;
    latasPlanejadas: number;
    caixasEstimadas: number;
    clientes: string[];
    observacao?: string | null;
  }) => Promise<void> | void;
  savingItemId: string | null;
}

export default function OrdemProducaoGrid({
  items,
  ordemDiariaId,
  onRemoveLineResult,
  previewMode = false,
  onMoveUp,
  onMoveDown,
  onSaveRow,
  savingItemId,
}: OrdemProducaoGridProps) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[980px] w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <th className="px-2 py-3 text-center">Prioridade</th>
            <th className="px-2 py-3">Ordem</th>
            <th className="px-2 py-3">Produto</th>
            <th className="px-2 py-3">Produto ID</th>
            <th className="px-2 py-3">Tipo de lata</th>
            <th className="px-2 py-3">Latas planejadas</th>
            <th className="px-2 py-3">Caixas estimadas</th>
            <th className="px-2 py-3">Clientes</th>
            <th className="px-2 py-3">Status</th>
            <th className="px-2 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                {previewMode
                  ? 'Pré-visualização: após aplicar a migração no banco, crie a ordem do dia para passar a editar os itens aqui.'
                  : 'Sem itens. Adicione uma linha no formulário abaixo.'}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <OrdemProducaoRow
                key={item.id}
                item={item}
                ordemDiariaId={ordemDiariaId}
                onRemoveLineResult={onRemoveLineResult}
                onMoveUp={() => onMoveUp(item.id)}
                onMoveDown={() => onMoveDown(item.id)}
                onSave={onSaveRow}
                saving={savingItemId === item.id}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
