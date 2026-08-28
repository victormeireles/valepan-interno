'use client';

import { useState } from 'react';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { ReclamacaoListFiltro, ReclamacaoOpcao } from '@/domain/reclamacoes/reclamacao-types';
import { idPorNome } from '@/features/reclamacoes/reclamacao-form-options';

type Props = {
  filtro: ReclamacaoListFiltro;
  clientes: ReclamacaoOpcao[];
  produtos: ReclamacaoOpcao[];
  categorias: ReclamacaoOpcao[];
  onChange: (filtro: ReclamacaoListFiltro) => void;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ReclamacaoFiltros({
  filtro,
  clientes,
  produtos,
  categorias,
  onChange,
}: Props) {
  const [clienteNome, setClienteNome] = useState(
    () => clientes.find((c) => c.id === filtro.clienteId)?.nome ?? '',
  );
  const [produtoNome, setProdutoNome] = useState(
    () => produtos.find((p) => p.id === filtro.produtoId)?.nome ?? '',
  );

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <AutocompleteInput
        label="Cliente"
        strict
        value={clienteNome}
        options={clientes.map((c) => c.nome)}
        placeholder="Todos"
        onChange={(nome) => {
          setClienteNome(nome);
          const clienteId = emptyToNull(idPorNome(clientes, nome));
          if (clienteId !== filtro.clienteId) {
            onChange({ ...filtro, clienteId });
          }
        }}
      />
      <AutocompleteInput
        label="Produto"
        strict
        value={produtoNome}
        options={produtos.map((p) => p.nome)}
        placeholder="Todos"
        onChange={(nome) => {
          setProdutoNome(nome);
          const produtoId = emptyToNull(idPorNome(produtos, nome));
          if (produtoId !== filtro.produtoId) {
            onChange({ ...filtro, produtoId });
          }
        }}
      />
      <Select
        label="Categoria"
        value={filtro.categoriaId ?? ''}
        onChange={(event) =>
          onChange({ ...filtro, categoriaId: emptyToNull(event.target.value) })
        }
        options={[
          { value: '', label: 'Todas' },
          ...categorias.map((c) => ({ value: c.id, label: c.nome })),
        ]}
      />
      <Input
        label="De"
        type="date"
        value={filtro.dataProblemaDe ?? ''}
        onChange={(event) =>
          onChange({ ...filtro, dataProblemaDe: emptyToNull(event.target.value) })
        }
      />
      <Input
        label="Até"
        type="date"
        value={filtro.dataProblemaAte ?? ''}
        onChange={(event) =>
          onChange({ ...filtro, dataProblemaAte: emptyToNull(event.target.value) })
        }
      />
    </div>
  );
}
