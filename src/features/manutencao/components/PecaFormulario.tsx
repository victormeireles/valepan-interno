'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PecaEntrada } from '@/domain/manutencao/peca-cadastro';

export type PecaFormularioValor = PecaEntrada & {
  id?: string;
};

export const FORMULARIO_PECA_VAZIO: PecaFormularioValor = {
  codigo: '',
  nome: '',
  unidade: 'UN',
  ativo: true,
};

type PecaFormularioProps = {
  valor: PecaFormularioValor;
  podeCadastrar: boolean;
  onSubmit: (valor: PecaFormularioValor) => void | Promise<unknown>;
};

const CARTAO = 'rounded-xl border border-stone-200 bg-white shadow-sm';

export function PecaFormulario({ valor, podeCadastrar, onSubmit }: PecaFormularioProps) {
  const [valorFormulario, setValorFormulario] = useState(valor);
  const [salvando, setSalvando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeCadastrar || salvando) return;
    setSalvando(true);
    try {
      await onSubmit(valorFormulario);
    } finally {
      setSalvando(false);
    }
  }

  function alterarValor(alteracao: Partial<PecaFormularioValor>) {
    setValorFormulario((estado) => ({ ...estado, ...alteracao }));
  }

  function novaPeca() {
    setValorFormulario(FORMULARIO_PECA_VAZIO);
  }

  return (
    <form onSubmit={enviar} className={`${CARTAO} space-y-4 p-4`}>
      <CamposPeca
        valorFormulario={valorFormulario}
        podeCadastrar={podeCadastrar}
        onAlterar={alterarValor}
      />
      <AcoesFormulario podeCadastrar={podeCadastrar} salvando={salvando} onNova={novaPeca} />
    </form>
  );
}

function AcoesFormulario({
  podeCadastrar,
  salvando,
  onNova,
}: {
  podeCadastrar: boolean;
  salvando: boolean;
  onNova: () => void;
}) {
  if (!podeCadastrar) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" size="lg" disabled={salvando} onClick={onNova}>
        Nova peça
      </Button>
      <Button type="submit" size="lg" disabled={salvando}>
        Salvar
      </Button>
    </div>
  );
}

function CamposPeca({
  valorFormulario,
  podeCadastrar,
  onAlterar,
}: {
  valorFormulario: PecaFormularioValor;
  podeCadastrar: boolean;
  onAlterar: (alteracao: Partial<PecaFormularioValor>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Código"
        value={valorFormulario.codigo}
        autoComplete="off"
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ codigo: evento.target.value })}
      />
      <Input
        label="Nome"
        value={valorFormulario.nome}
        autoComplete="off"
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ nome: evento.target.value })}
      />
      <Input
        label="Unidade"
        value={valorFormulario.unidade}
        autoComplete="off"
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ unidade: evento.target.value })}
      />
      <CampoAtiva
        ativo={valorFormulario.ativo}
        podeCadastrar={podeCadastrar}
        onAlterar={onAlterar}
      />
    </div>
  );
}

function CampoAtiva({
  ativo,
  podeCadastrar,
  onAlterar,
}: {
  ativo: boolean;
  podeCadastrar: boolean;
  onAlterar: (alteracao: Partial<PecaFormularioValor>) => void;
}) {
  const cursor = podeCadastrar ? 'cursor-pointer' : 'cursor-not-allowed opacity-50';

  return (
    <label className={`flex min-h-11 items-center gap-3 text-sm font-medium text-stone-700 ${cursor}`}>
      <input
        type="checkbox"
        className="h-5 w-5 accent-amber-600"
        checked={ativo}
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ ativo: evento.target.checked })}
      />
      Ativa
    </label>
  );
}
