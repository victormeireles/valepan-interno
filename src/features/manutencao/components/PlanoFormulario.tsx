'use client';

import { useId, type FormEvent } from 'react';
import type { EntradaSalvarPlano, FrequenciaEntrada } from '@/app/actions/manutencao-plano-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';

export type MaquinaPlanoOpcao = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

export type PlanoFormularioValor = {
  id?: string;
  maquinaId: string;
  descricao: string;
  tipo: FrequenciaEntrada['tipo'];
  intervalo: string;
  diaSemana: string;
  diaMes: string;
  data: string;
};

export const FORMULARIO_PLANO_VAZIO: PlanoFormularioValor = {
  maquinaId: '',
  descricao: '',
  tipo: 'a_cada_n_dias',
  intervalo: '7',
  diaSemana: '1',
  diaMes: '1',
  data: '',
};

type PlanoFormularioProps = {
  maquinas: MaquinaPlanoOpcao[];
  valor: PlanoFormularioValor;
  origem: PlanoFormularioValor;
  salvando: boolean;
  erro?: string | null;
  onChange: (valor: PlanoFormularioValor) => void;
  onSubmit: (entrada: EntradaSalvarPlano) => void | Promise<unknown>;
  onCancelar: () => void;
};

const TIPOS: SelectOption[] = [
  { value: 'a_cada_n_dias', label: 'A cada N dias' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
];
const DIAS_SEMANA: SelectOption[] = [
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
  { value: '7', label: 'Domingo' },
];

export function PlanoFormulario({
  maquinas,
  valor,
  origem,
  salvando,
  erro,
  onChange,
  onSubmit,
  onCancelar,
}: PlanoFormularioProps) {
  const editando = Boolean(valor.id);
  const frequenciaAlterada = editando && frequenciaDiferente(valor, origem);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    await onSubmit(new EntradaDoFormulario().montar(valor));
  }

  function alterar(alteracao: Partial<PlanoFormularioValor>) {
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
        <CamposPlano
          maquinas={maquinas}
          valor={valor}
          editando={editando}
          frequenciaAlterada={frequenciaAlterada}
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
        <Button type="submit" size="lg" icon="save" disabled={salvando} className="flex-1">
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function CamposPlano({
  maquinas,
  valor,
  editando,
  frequenciaAlterada,
  onAlterar,
}: {
  maquinas: MaquinaPlanoOpcao[];
  valor: PlanoFormularioValor;
  editando: boolean;
  frequenciaAlterada: boolean;
  onAlterar: (alteracao: Partial<PlanoFormularioValor>) => void;
}) {
  const opcoes = new OpcoesDeMaquina().listar(maquinas, valor);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select
        label="Máquina"
        required
        value={valor.maquinaId}
        options={opcoesMaquina(opcoes)}
        hint={opcoes.length === 0 ? 'Nenhuma máquina ativa.' : undefined}
        onChange={(evento) => onAlterar({ maquinaId: evento.target.value })}
      />
      <Select
        label="Frequência"
        required
        value={valor.tipo}
        options={TIPOS}
        onChange={(evento) =>
          onAlterar({ tipo: evento.target.value as PlanoFormularioValor['tipo'] })
        }
      />
      <CampoDaFrequencia valor={valor} onAlterar={onAlterar} />
      <CampoData
        valor={valor}
        editando={editando}
        frequenciaAlterada={frequenciaAlterada}
        onAlterar={onAlterar}
      />
      <CampoDescricao
        descricao={valor.descricao}
        onAlterar={(descricao) => onAlterar({ descricao })}
      />
    </div>
  );
}

function CampoDaFrequencia({
  valor,
  onAlterar,
}: {
  valor: PlanoFormularioValor;
  onAlterar: (alteracao: Partial<PlanoFormularioValor>) => void;
}) {
  if (valor.tipo === 'semanal') {
    return (
      <Select
        label="Dia da semana"
        required
        value={valor.diaSemana}
        options={DIAS_SEMANA}
        onChange={(evento) => onAlterar({ diaSemana: evento.target.value })}
      />
    );
  }
  if (valor.tipo === 'mensal') {
    return (
      <Input
        label="Dia do mês"
        type="number"
        numeric
        required
        min={1}
        max={28}
        value={valor.diaMes}
        onChange={(evento) => onAlterar({ diaMes: evento.target.value })}
      />
    );
  }
  return (
    <Input
      label="Intervalo em dias"
      type="number"
      numeric
      required
      min={1}
      value={valor.intervalo}
      onChange={(evento) => onAlterar({ intervalo: evento.target.value })}
    />
  );
}

function CampoData({
  valor,
  editando,
  frequenciaAlterada,
  onAlterar,
}: {
  valor: PlanoFormularioValor;
  editando: boolean;
  frequenciaAlterada: boolean;
  onAlterar: (alteracao: Partial<PlanoFormularioValor>) => void;
}) {
  return (
    <Input
      label={editando ? 'Próxima data' : 'Primeira data'}
      type="date"
      numeric
      required
      disabled={editando}
      value={valor.data}
      hint={
        frequenciaAlterada
          ? 'Ao salvar, a próxima data passa para o encaixe seguinte.'
          : undefined
      }
      onChange={(evento) => onAlterar({ data: evento.target.value })}
    />
  );
}

function CampoDescricao({
  descricao,
  onAlterar,
}: {
  descricao: string;
  onAlterar: (descricao: string) => void;
}) {
  const campoId = useId();

  return (
    <div className="flex w-full flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={campoId} className="text-sm font-medium tracking-[-0.004em] text-stone-700">
        Descrição
        <span className="text-danger"> *</span>
      </label>
      <textarea
        id={campoId}
        required
        value={descricao}
        onChange={(evento) => onAlterar(evento.target.value)}
        className="min-h-28 w-full rounded-[9px] border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
      />
    </div>
  );
}

class OpcoesDeMaquina {
  listar(maquinas: MaquinaPlanoOpcao[], valor: PlanoFormularioValor): MaquinaPlanoOpcao[] {
    if (!valor.id) return maquinas.filter((maquina) => maquina.ativo);
    return maquinas.filter((maquina) => maquina.ativo || maquina.id === valor.maquinaId);
  }
}

class EntradaDoFormulario {
  montar(valor: PlanoFormularioValor): EntradaSalvarPlano {
    return {
      id: valor.id,
      maquinaId: valor.maquinaId,
      descricao: valor.descricao,
      frequencia: this.frequencia(valor),
      primeiraData: valor.data,
    };
  }

  private frequencia(valor: PlanoFormularioValor): FrequenciaEntrada {
    if (valor.tipo === 'semanal') {
      return { tipo: 'semanal', diaSemana: Number(valor.diaSemana) };
    }
    if (valor.tipo === 'mensal') return { tipo: 'mensal', diaMes: Number(valor.diaMes) };
    return { tipo: 'a_cada_n_dias', intervalo: Number(valor.intervalo) };
  }
}

function opcoesMaquina(maquinas: MaquinaPlanoOpcao[]): SelectOption[] {
  return [
    { value: '', label: 'Selecione a máquina' },
    ...maquinas.map((maquina) => ({
      value: maquina.id,
      label: rotuloMaquina(maquina),
    })),
  ];
}

function rotuloMaquina(maquina: MaquinaPlanoOpcao): string {
  const nome = `${maquina.codigo} · ${maquina.nome}`.trim();
  return maquina.ativo ? nome : `${nome} · inativa`;
}

function frequenciaDiferente(atual: PlanoFormularioValor, origem: PlanoFormularioValor): boolean {
  return (
    atual.tipo !== origem.tipo ||
    atual.intervalo !== origem.intervalo ||
    atual.diaSemana !== origem.diaSemana ||
    atual.diaMes !== origem.diaMes
  );
}
