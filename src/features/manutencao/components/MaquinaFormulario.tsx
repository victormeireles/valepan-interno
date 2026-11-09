'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { MaquinaEntrada } from '@/domain/manutencao/maquina-cadastro';
import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';

export type MaquinaFormularioValor = MaquinaEntrada & { id?: string };

type MaquinaFormularioProps = {
  setores: SetorLinha[];
  valor: MaquinaFormularioValor;
  podeGravar: boolean;
  onSubmit: (valor: MaquinaFormularioValor) => void | Promise<void>;
};

const CARTAO = 'rounded-xl border border-stone-200 bg-white shadow-sm';

export function MaquinaFormulario({
  setores,
  valor,
  podeGravar,
  onSubmit,
}: MaquinaFormularioProps) {
  const [valorFormulario, setValorFormulario] = useState(valor);
  const [salvando, setSalvando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeGravar || salvando) return;
    setSalvando(true);
    try {
      await onSubmit(valorFormulario);
    } finally {
      setSalvando(false);
    }
  }

  function alterarValor(alteracao: Partial<MaquinaFormularioValor>) {
    setValorFormulario((estado) => ({ ...estado, ...alteracao }));
  }

  return (
    <form onSubmit={enviar} className={`${CARTAO} space-y-4 p-4`}>
      <CamposMaquina
        valorFormulario={valorFormulario}
        podeGravar={podeGravar}
        setores={setores}
        onAlterar={alterarValor}
      />
      {podeGravar ? (
        <Button type="submit" size="lg" disabled={salvando}>
          Salvar
        </Button>
      ) : null}
    </form>
  );
}

function CamposMaquina({
  valorFormulario,
  podeGravar,
  setores,
  onAlterar,
}: {
  valorFormulario: MaquinaFormularioValor;
  podeGravar: boolean;
  setores: SetorLinha[];
  onAlterar: (alteracao: Partial<MaquinaFormularioValor>) => void;
}) {
  return (
    <>
      <Input
        label="Código"
        value={valorFormulario.codigo}
        disabled={!podeGravar}
        onChange={(evento) => onAlterar({ codigo: evento.target.value })}
      />
      <Input
        label="Nome"
        value={valorFormulario.nome}
        disabled={!podeGravar}
        onChange={(evento) => onAlterar({ nome: evento.target.value })}
      />
      <Select
        label="Setor"
        value={valorFormulario.setorId}
        disabled={!podeGravar}
        options={opcoesDeSetor(setores)}
        onChange={(evento) => onAlterar({ setorId: evento.target.value })}
      />
      <Input
        label="Observação"
        value={valorFormulario.observacao}
        disabled={!podeGravar}
        onChange={(evento) => onAlterar({ observacao: evento.target.value })}
      />
      <CampoAtiva
        ativo={valorFormulario.ativo}
        podeGravar={podeGravar}
        onAlterar={onAlterar}
      />
    </>
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

function opcoesDeSetor(setores: SetorLinha[]) {
  const operacionais = new SetorOperacional().filtrar(setores);
  return [
    { value: '', label: 'Selecione o setor' },
    ...operacionais.map((setor) => ({ value: setor.id, label: setor.nome })),
  ];
}
