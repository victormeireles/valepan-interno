'use client';

import type { MapeamentoAbaId } from '@/domain/insumos/insumo-mapeamento-busca';
import { Button } from '@/components/ui/Button';

type Props = {
  activeTab: MapeamentoAbaId;
  hasVinculos: boolean;
  hasPendencias: boolean;
  hasIgnorados: boolean;
  onSugerirIa: () => void;
};

export default function InsumoMapeamentoTabHint({
  activeTab,
  hasVinculos,
  hasPendencias,
  hasIgnorados,
  onSugerirIa,
}: Props) {
  if (activeTab === 'vinculos' && hasVinculos) {
    return (
      <div className="border-b border-stone-100 px-4 py-3">
        <p className="text-sm text-stone-600">
          Um vínculo por produto Omie e empresa. Editar ou excluir afeta apenas próximos recebimentos.
        </p>
      </div>
    );
  }

  if (activeTab === 'pendencias' && hasPendencias) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <p className="text-sm text-stone-600">
          Uma linha por produto Omie. Clique em NFs para ver detalhes de cada nota antes de vincular.
        </p>
        <Button variant="secondary" icon="auto_awesome" onClick={onSugerirIa}>
          Sugerir vínculos com IA
        </Button>
      </div>
    );
  }

  if (activeTab === 'ignorados' && hasIgnorados) {
    return (
      <div className="border-b border-stone-100 px-4 py-3">
        <p className="text-sm text-stone-600">
          Itens ignorados da fila. Restaure para pendências ou vincule diretamente a um insumo.
        </p>
      </div>
    );
  }

  return null;
}
