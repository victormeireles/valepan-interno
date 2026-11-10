'use client';

import { useId, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { MaquinaEntrada } from '@/domain/manutencao/maquina-cadastro';
import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';

export type MaquinaFormularioValor = MaquinaEntrada & {
  id?: string;
  setorNome?: string;
};

export const FORMULARIO_MAQUINA_VAZIO: MaquinaFormularioValor = {
  codigo: '',
  nome: '',
  setorId: '',
  observacao: '',
  ativo: true,
};

type MaquinaFormularioProps = {
  valor: MaquinaFormularioValor;
  setores: SetorLinha[];
  podeGravar: boolean;
  salvando: boolean;
  erro?: string | null;
  onChange: (valor: MaquinaFormularioValor) => void;
  onSubmit: () => void | Promise<unknown>;
  onCancelar: () => void;
};

export function MaquinaFormulario({
  valor,
  setores,
  podeGravar,
  salvando,
  erro,
  onChange,
  onSubmit,
  onCancelar,
}: MaquinaFormularioProps) {
  const codigoId = useId();

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeGravar || salvando) return;
    await onSubmit();
  }

  function alterar(alteracao: Partial<MaquinaFormularioValor>) {
    onChange({ ...valor, ...alteracao });
  }

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {erro ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
          >
            <span className="material-icons text-base" aria-hidden="true">
              error
            </span>
            {erro}
          </p>
        ) : null}
        <CamposMaquina
          valor={valor}
          podeGravar={podeGravar}
          setores={setores}
          codigoId={codigoId}
          onAlterar={alterar}
        />
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 px-4 py-4 sm:flex-row sm:px-5">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={salvando}
          className="flex-1"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" icon="save" disabled={!podeGravar || salvando} className="flex-1">
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function CamposMaquina({
  valor,
  podeGravar,
  setores,
  codigoId,
  onAlterar,
}: {
  valor: MaquinaFormularioValor;
  podeGravar: boolean;
  setores: SetorLinha[];
  codigoId: string;
  onAlterar: (alteracao: Partial<MaquinaFormularioValor>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id={codigoId}
        label="Código"
        value={valor.codigo}
        autoComplete="off"
        autoFocus
        disabled={!podeGravar}
        onChange={(evento) => onAlterar({ codigo: evento.target.value })}
      />
      <Input
        label="Nome"
        value={valor.nome}
        autoComplete="off"
        disabled={!podeGravar}
        onChange={(evento) => onAlterar({ nome: evento.target.value })}
      />
      <Select
        label="Setor"
        value={valor.setorId}
        disabled={!podeGravar}
        options={opcoesDeSetor(setores, valor)}
        onChange={(evento) => onAlterar({ setorId: evento.target.value })}
      />
      <CampoAtiva ativo={valor.ativo} podeGravar={podeGravar} onAlterar={onAlterar} />
      <div className="sm:col-span-2">
        <Input
          label="Observação"
          value={valor.observacao}
          autoComplete="off"
          disabled={!podeGravar}
          onChange={(evento) => onAlterar({ observacao: evento.target.value })}
        />
      </div>
    </div>
  );
}

function CampoAtiva({
  ativo,
  podeGravar,
  onAlterar,
}: {
  ativo: boolean;
  podeGravar: boolean;
  onAlterar: (alteracao: Partial<MaquinaFormularioValor>) => void;
}) {
  const cursor = podeGravar ? 'cursor-pointer' : 'cursor-not-allowed opacity-50';

  return (
    <label className={`flex min-h-11 items-center gap-3 text-sm font-medium text-stone-700 ${cursor}`}>
      <input
        type="checkbox"
        className="h-5 w-5 accent-amber-600"
        checked={ativo}
        disabled={!podeGravar}
        onChange={(evento) => onAlterar({ ativo: evento.target.checked })}
      />
      Ativa
    </label>
  );
}

function opcoesDeSetor(setores: SetorLinha[], valor: MaquinaFormularioValor) {
  const operacionais = new SetorOperacional().filtrar(setores);
  const selecionaveis = operacionais.map((setor) => ({
    value: setor.id,
    label: setor.nome,
  }));
  return [
    { value: '', label: 'Selecione o setor' },
    ...selecionaveis,
    ...opcaoSetorInativo(setores, valor, selecionaveis),
  ];
}

function opcaoSetorInativo(
  setores: SetorLinha[],
  valor: MaquinaFormularioValor,
  selecionaveis: { value: string }[],
) {
  if (!valor.setorId) return [];
  if (selecionaveis.some((opcao) => opcao.value === valor.setorId)) return [];
  const nome =
    setores.find((setor) => setor.id === valor.setorId)?.nome ||
    valor.setorNome ||
    'Setor';
  return [{ value: valor.setorId, label: `${nome} (inativo)` }];
}
