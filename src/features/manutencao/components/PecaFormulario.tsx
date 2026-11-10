'use client';

import { useId, type FormEvent } from 'react';
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
  salvando: boolean;
  erro?: string | null;
  onChange: (valor: PecaFormularioValor) => void;
  onSubmit: () => void | Promise<unknown>;
  onCancelar: () => void;
};

export function PecaFormulario({
  valor,
  podeCadastrar,
  salvando,
  erro,
  onChange,
  onSubmit,
  onCancelar,
}: PecaFormularioProps) {
  const codigoId = useId();

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podeCadastrar || salvando) return;
    await onSubmit();
  }

  function alterar(alteracao: Partial<PecaFormularioValor>) {
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
        <CamposPeca
          valor={valor}
          podeCadastrar={podeCadastrar}
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
        <Button type="submit" size="lg" icon="save" disabled={!podeCadastrar || salvando} className="flex-1">
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function CamposPeca({
  valor,
  podeCadastrar,
  codigoId,
  onAlterar,
}: {
  valor: PecaFormularioValor;
  podeCadastrar: boolean;
  codigoId: string;
  onAlterar: (alteracao: Partial<PecaFormularioValor>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id={codigoId}
        label="Código"
        value={valor.codigo}
        autoComplete="off"
        autoFocus
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ codigo: evento.target.value })}
      />
      <Input
        label="Nome"
        value={valor.nome}
        autoComplete="off"
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ nome: evento.target.value })}
      />
      <Input
        label="Unidade"
        value={valor.unidade}
        autoComplete="off"
        disabled={!podeCadastrar}
        onChange={(evento) => onAlterar({ unidade: evento.target.value })}
      />
      <CampoAtiva ativo={valor.ativo} podeCadastrar={podeCadastrar} onAlterar={onAlterar} />
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
