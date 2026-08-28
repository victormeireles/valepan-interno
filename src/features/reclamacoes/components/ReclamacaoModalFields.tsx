'use client';

import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { controlInputClassName } from '@/components/ui/input-class-name';
import type {
  ReclamacaoCategoriaRecord,
  ReclamacaoOpcao,
} from '@/domain/reclamacoes/reclamacao-types';
import type { ReclamacaoUnidade } from '@/domain/reclamacoes/reclamacao-unidade';

export type ReclamacaoFormFieldsValue = {
  clienteNome: string;
  produtoNome: string;
  categoriaId: string;
  observacao: string;
  dataFabricacao: string;
  dataProblema: string;
  quantidade: number;
  unidade: ReclamacaoUnidade;
};

type Props = {
  value: ReclamacaoFormFieldsValue;
  clientes: ReclamacaoOpcao[];
  produtos: ReclamacaoOpcao[];
  categorias: ReclamacaoCategoriaRecord[];
  exigeObservacao: boolean;
  fieldErrors: Record<string, string>;
  onChange: (next: ReclamacaoFormFieldsValue) => void;
};

export default function ReclamacaoModalFields({
  value,
  clientes,
  produtos,
  categorias,
  exigeObservacao,
  fieldErrors,
  onChange,
}: Props) {
  const patch = (partial: Partial<ReclamacaoFormFieldsValue>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="space-y-5">
      <AutocompleteInput
        label="Cliente"
        required
        strict
        value={value.clienteNome}
        options={clientes.map((c) => c.nome)}
        placeholder="Buscar cliente"
        onChange={(nome) => patch({ clienteNome: nome })}
        onSelect={(nome) => patch({ clienteNome: nome })}
      />
      <AutocompleteInput
        label="Produto"
        required
        strict
        value={value.produtoNome}
        options={produtos.map((p) => p.nome)}
        placeholder="Buscar produto"
        onChange={(nome) => patch({ produtoNome: nome })}
        onSelect={(nome) => patch({ produtoNome: nome })}
      />
      <Select
        label="Categoria"
        required
        value={value.categoriaId}
        error={fieldErrors.categoriaId}
        onChange={(event) => patch({ categoriaId: event.target.value })}
        options={[
          { value: '', label: 'Selecione' },
          ...categorias.map((c) => ({ value: c.id, label: c.nome })),
        ]}
      />
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor="reclamacao-observacao"
          className="text-sm font-medium tracking-[-0.004em] text-stone-700"
        >
          Observação
          {exigeObservacao ? <span className="text-danger"> *</span> : null}
        </label>
        <textarea
          id="reclamacao-observacao"
          rows={3}
          value={value.observacao}
          onChange={(event) => patch({ observacao: event.target.value })}
          className={`${controlInputClassName({
            hasError: Boolean(fieldErrors.observacao),
            className: 'min-h-[6.5rem] py-3',
          })} resize-y`}
        />
        {fieldErrors.observacao ? (
          <span className="text-xs text-danger-fg">{fieldErrors.observacao}</span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Data de fabricação"
          required
          type="date"
          value={value.dataFabricacao}
          error={fieldErrors.dataFabricacao}
          onChange={(event) => patch({ dataFabricacao: event.target.value })}
        />
        <Input
          label="Data do problema"
          required
          type="date"
          value={value.dataProblema}
          error={fieldErrors.dataProblema}
          onChange={(event) => patch({ dataProblema: event.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Quantidade"
          required
          numeric
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={value.quantidade || ''}
          error={fieldErrors.quantidade}
          onChange={(event) =>
            patch({ quantidade: parseInt(event.target.value, 10) || 0 })
          }
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium tracking-[-0.004em] text-stone-700">
            Unidade <span className="text-danger">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            <Chip
              className="min-h-11"
              active={value.unidade === 'pacotes'}
              onClick={() => patch({ unidade: 'pacotes' })}
            >
              Pacotes
            </Chip>
            <Chip
              className="min-h-11"
              active={value.unidade === 'caixas'}
              onClick={() => patch({ unidade: 'caixas' })}
            >
              Caixas
            </Chip>
          </div>
        </div>
      </div>
    </div>
  );
}
