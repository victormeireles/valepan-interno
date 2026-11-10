'use client';

import { useId, useState, type FormEvent } from 'react';
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
  onSubmit: (entrada: EntradaSalvarPlano) => void | Promise<unknown>;
};

const CARTAO = 'rounded-xl border border-stone-200 bg-white p-4 shadow-sm';
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

export function PlanoFormulario({ maquinas, valor, onSubmit }: PlanoFormularioProps) {
  const [valorFormulario, setValorFormulario] = useState(valor);
  const [salvando, setSalvando] = useState(false);
  const editando = Boolean(valorFormulario.id);
  const frequenciaAlterada = editando && frequenciaDiferente(valorFormulario, valor);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      await onSubmit(new EntradaDoFormulario().montar(valorFormulario));
    } finally {
      setSalvando(false);
    }
  }

  function alterar(alteracao: Partial<PlanoFormularioValor>) {
    setValorFormulario((estado) => ({ ...estado, ...alteracao }));
  }

  return (
    <form onSubmit={enviar} className={`${CARTAO} space-y-4`}>
      <CamposPlano
        maquinas={maquinas}
        valorFormulario={valorFormulario}
        editando={editando}
        frequenciaAlterada={frequenciaAlterada}
        onAlterar={alterar}
      />
      <AcoesFormulario
        salvando={salvando}
        onNovo={() => setValorFormulario(FORMULARIO_PLANO_VAZIO)}
      />
    </form>
  );
}

function CamposPlano({
  maquinas,
  valorFormulario,
  editando,
  frequenciaAlterada,
  onAlterar,
}: {
  maquinas: MaquinaPlanoOpcao[];
  valorFormulario: PlanoFormularioValor;
  editando: boolean;
  frequenciaAlterada: boolean;
  onAlterar: (alteracao: Partial<PlanoFormularioValor>) => void;
}) {
  const opcoes = new OpcoesDeMaquina().listar(maquinas, valorFormulario);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select
        label="Máquina"
        required
        value={valorFormulario.maquinaId}
        options={opcoesMaquina(opcoes)}
        hint={opcoes.length === 0 ? 'Nenhuma máquina ativa.' : undefined}
        onChange={(evento) => onAlterar({ maquinaId: evento.target.value })}
      />
      <Select
        label="Frequência"
        required
        value={valorFormulario.tipo}
        options={TIPOS}
        onChange={(evento) =>
          onAlterar({ tipo: evento.target.value as PlanoFormularioValor['tipo'] })
        }
      />
      <CampoDaFrequencia valorFormulario={valorFormulario} onAlterar={onAlterar} />
      <CampoData
        valorFormulario={valorFormulario}
        editando={editando}
        frequenciaAlterada={frequenciaAlterada}
        onAlterar={onAlterar}
      />
      <CampoDescricao
        descricao={valorFormulario.descricao}
        onAlterar={(descricao) => onAlterar({ descricao })}
      />
    </div>
  );
}

function CampoDaFrequencia({
  valorFormulario,
  onAlterar,
}: {
  valorFormulario: PlanoFormularioValor;
  onAlterar: (alteracao: Partial<PlanoFormularioValor>) => void;
}) {
  if (valorFormulario.tipo === 'semanal') {
    return (
      <Select
        label="Dia da semana"
        required
        value={valorFormulario.diaSemana}
        options={DIAS_SEMANA}
        onChange={(evento) => onAlterar({ diaSemana: evento.target.value })}
      />
    );
  }
  if (valorFormulario.tipo === 'mensal') {
    return (
      <Input
        label="Dia do mês"
        type="number"
        numeric
        required
        min={1}
        max={28}
        value={valorFormulario.diaMes}
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
      value={valorFormulario.intervalo}
      onChange={(evento) => onAlterar({ intervalo: evento.target.value })}
    />
  );
}

function CampoData({
  valorFormulario,
  editando,
  frequenciaAlterada,
  onAlterar,
}: {
  valorFormulario: PlanoFormularioValor;
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
      value={valorFormulario.data}
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

function AcoesFormulario({ salvando, onNovo }: { salvando: boolean; onNovo: () => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" size="lg" disabled={salvando} onClick={onNovo}>
        Novo plano
      </Button>
      <Button type="submit" size="lg" disabled={salvando}>
        Salvar
      </Button>
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
