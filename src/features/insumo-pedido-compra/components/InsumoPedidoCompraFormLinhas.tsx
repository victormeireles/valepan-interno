'use client';

import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export type InsumoPedidoOpcao = {
  id: string;
  nome: string;
  unidade: string;
};

export type InsumoPedidoFormLinha = {
  key: string;
  insumoId: string;
  quantidade: string;
};

type Props = {
  linhas: InsumoPedidoFormLinha[];
  opcoes: InsumoPedidoOpcao[];
  disabled: boolean;
  onChange: (linhas: InsumoPedidoFormLinha[]) => void;
};

export default function InsumoPedidoCompraFormLinhas({
  linhas,
  opcoes,
  disabled,
  onChange,
}: Props) {
  const idsUsados = new Set(linhas.map((linha) => linha.insumoId).filter(Boolean));

  const atualizar = (key: string, patch: Partial<InsumoPedidoFormLinha>) => {
    onChange(linhas.map((linha) => (linha.key === key ? { ...linha, ...patch } : linha)));
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-stone-900">Insumos</legend>
      {linhas.map((linha, index) => (
        <LinhaCampos
          key={linha.key}
          linha={linha}
          index={index}
          opcoes={opcoes}
          idsUsados={idsUsados}
          disabled={disabled}
          podeRemover={linhas.length > 1 && !disabled}
          onChange={(patch) => atualizar(linha.key, patch)}
          onRemove={() => onChange(linhas.filter((item) => item.key !== linha.key))}
        />
      ))}
      {disabled ? null : (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          icon="add"
          disabled={idsUsados.size >= opcoes.length}
          onClick={() =>
            onChange([...linhas, { key: crypto.randomUUID(), insumoId: '', quantidade: '' }])
          }
        >
          Adicionar insumo
        </Button>
      )}
    </fieldset>
  );
}

function LinhaCampos({
  linha,
  index,
  opcoes,
  idsUsados,
  disabled,
  podeRemover,
  onChange,
  onRemove,
}: {
  linha: InsumoPedidoFormLinha;
  index: number;
  opcoes: InsumoPedidoOpcao[];
  idsUsados: Set<string>;
  disabled: boolean;
  podeRemover: boolean;
  onChange: (patch: Partial<InsumoPedidoFormLinha>) => void;
  onRemove: () => void;
}) {
  const unidade = opcoes.find((opcao) => opcao.id === linha.insumoId)?.unidade;
  const opcoesVisiveis = opcoes.filter(
    (opcao) => opcao.id === linha.insumoId || !idsUsados.has(opcao.id),
  );

  return (
    <div className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
      <Select
        label={`Insumo ${index + 1}`}
        required
        disabled={disabled}
        value={linha.insumoId}
        onChange={(event) => onChange({ insumoId: event.target.value })}
      >
        <option value="">Selecione</option>
        {opcoesVisiveis.map((opcao) => (
          <option key={opcao.id} value={opcao.id}>
            {opcao.nome}
          </option>
        ))}
      </Select>
      <Input
        label={unidade ? `Qtd (${unidade})` : 'Quantidade'}
        type="number"
        min="0"
        step="any"
        numeric
        required
        disabled={disabled}
        value={linha.quantidade}
        onChange={(event) => onChange({ quantidade: event.target.value })}
      />
      {podeRemover ? (
        <IconButton
          icon="delete"
          label={`Remover insumo ${index + 1}`}
          size="lg"
          onClick={onRemove}
        />
      ) : (
        <span className="hidden sm:block" />
      )}
    </div>
  );
}
