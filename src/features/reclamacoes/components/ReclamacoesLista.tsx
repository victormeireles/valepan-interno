'use client';

import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import { Badge } from '@/components/ui/Badge';
import { ListColumnHeader } from '@/components/ui/ListColumnHeader';
import { ListRow } from '@/components/ui/ListRow';
import { formatarDataIsoPtBr } from '@/domain/reclamacoes/reclamacao-data';
import { normalizarObservacao } from '@/domain/reclamacoes/reclamacao-observacao';
import type { ReclamacaoListItem } from '@/domain/reclamacoes/reclamacao-types';
import { formatarReclamacaoQuantidade } from '@/domain/reclamacoes/reclamacao-unidade';
import { ReclamacaoFotoThumb } from '@/features/reclamacoes/components/ReclamacaoFotoThumb';
import { ReclamacaoObservacaoPreview } from '@/features/reclamacoes/components/ReclamacaoObservacaoPreview';
import {
  RECLAMACAO_COL_CATEGORIA,
  RECLAMACAO_COL_FABRICACAO,
  RECLAMACAO_COL_FOTO,
  RECLAMACAO_COL_OBS,
  RECLAMACAO_COL_PROBLEMA,
  RECLAMACAO_COL_QUANTIDADE,
  RECLAMACAO_LIST_HEADERS,
} from '@/features/reclamacoes/components/reclamacoes-list-layout';

type Props = {
  itens: ReclamacaoListItem[];
  deletingId: string | null;
  onEdit: (item: ReclamacaoListItem) => void;
  onDelete: (item: ReclamacaoListItem) => void;
};

function DataColuna({ label, isoDate }: { label: string; isoDate: string }) {
  return (
    <span className="flex flex-col items-end leading-tight" title={label}>
      <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-text-muted md:sr-only">
        {label}
      </span>
      <span>{formatarDataIsoPtBr(isoDate)}</span>
    </span>
  );
}

export default function ReclamacoesLista({ itens, deletingId, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[56rem]">
        <div className="hidden md:block">
          <ListColumnHeader leading="Cliente" columns={RECLAMACAO_LIST_HEADERS} />
        </div>
        {itens.map((item, index) => {
          const observacao = normalizarObservacao(item.observacao);
          return (
            <ListRow
              key={item.id}
              even={index % 2 === 1}
              title={item.clienteNome}
              subtitle={item.produtoNome}
              onClick={() => onEdit(item)}
              columns={[
                {
                  value: (
                    <Badge tone="accent" className="max-w-full truncate" title={item.categoriaNome}>
                      {item.categoriaNome}
                    </Badge>
                  ),
                  width: RECLAMACAO_COL_CATEGORIA,
                  align: 'left',
                  tabular: false,
                },
                {
                  value: formatarReclamacaoQuantidade(item.quantidade, item.unidade),
                  width: RECLAMACAO_COL_QUANTIDADE,
                  emphasize: true,
                },
                {
                  value: <DataColuna label="Problema" isoDate={item.dataProblema} />,
                  width: RECLAMACAO_COL_PROBLEMA,
                },
                {
                  value: <DataColuna label="Fabricação" isoDate={item.dataFabricacao} />,
                  width: RECLAMACAO_COL_FABRICACAO,
                },
                {
                  value: observacao ? (
                    <ReclamacaoObservacaoPreview observacao={observacao} />
                  ) : (
                    '\u00a0'
                  ),
                  width: RECLAMACAO_COL_OBS,
                  tabular: false,
                },
                {
                  value:
                    item.fotos.length > 0 ? (
                      <ReclamacaoFotoThumb fotos={item.fotos} />
                    ) : (
                      '\u00a0'
                    ),
                  width: RECLAMACAO_COL_FOTO,
                  tabular: false,
                },
              ]}
              menu={
                <OverflowMenu ariaLabel={`Ações para ${item.clienteNome}`} menuWidth={160}>
                  <OverflowMenuItem label="Editar" icon="edit" onClick={() => onEdit(item)} />
                  <OverflowMenuItem
                    label="Excluir"
                    icon="delete"
                    tone="danger"
                    disabled={deletingId === item.id}
                    onClick={() => onDelete(item)}
                  />
                </OverflowMenu>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
